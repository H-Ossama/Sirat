// Prayer Times API — aladhan.com
const BASE_URL = 'https://api.aladhan.com/v1';

export interface PrayerTime {
    name: string;
    nameAr: string;
    time: string;
}

export interface PrayerData {
    prayers: PrayerTime[];
    qiblaDirection: number;
    city: string;
    date: string;
    hijriDate: string;
    hijriMonth: string;
    hijriYear: string;
    hijriMonthEn: string;
    hijriMonthValue: number;
    hijriDay: number;
    gregorianDate: string;
}

export interface CalendarDay {
    date: string;
    hijri: {
        day: string;
        month: {
            ar: string;
            en: string;
        };
        year: string;
    };
    gregorian: {
        date: string;
        day: string;
        month: {
            en: string;
        };
        year: string;
    };
    timings: Record<string, string>;
}

const PRAYER_NAMES_MAP: Record<string, { en: string, ar: string }> = {
    Fajr: { en: 'Fajr', ar: 'الفجر' },
    Sunrise: { en: 'Sunrise', ar: 'الشروق' },
    Dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
    Asr: { en: 'Asr', ar: 'العصر' },
    Maghrib: { en: 'Maghrib', ar: 'المغرب' },
    Isha: { en: 'Isha', ar: 'العشاء' },
};

export const CALCULATION_METHODS = [
    { id: '3', name: 'رابطة العالم الإسلامي', country: 'MWL' },
    { id: '21', name: 'وزارة الأوقاف والشؤون الإسلامية (المغرب)', country: 'Morocco' },
    { id: '4', name: 'جامعة أم القرى، مكة', country: 'Makkah' },
    { id: '5', name: 'الهيئة المصرية العامة للمساحة', country: 'Egypt' },
    { id: '2', name: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', country: 'ISNA' },
    { id: '1', name: 'جامعة العلوم الإسلامية، كراتشي', country: 'Karachi' },
    { id: '18', name: 'وزارة الشؤون الدينية (تونس)', country: 'Tunisia' },
    { id: '19', name: 'وزارة الشؤون الدينية (الجزائر)', country: 'Algeria' },
    { id: '13', name: 'ديانة إشليبري باشكانلي (تركيا)', country: 'Turkey' },
    { id: '12', name: 'اتحاد المنظمات الإسلامية (فرنسا)', country: 'France' },
];

export async function fetchPrayerTimes(location: string, methodId: string = '3', school: number = 0): Promise<PrayerData> {
    const adjustment = localStorage.getItem('hijri_adjustment') || '0';
    const cacheKey = `prayer_v6_${location}_${methodId}_${school}_${adjustment}_${new Date().toDateString()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    let url = '';
    const params = `&method=${methodId}&school=${school}&adjustment=${adjustment}`;

    if (location.includes(',')) {
        const [lat, lon] = location.split(',');
        url = `${BASE_URL}/timings?latitude=${lat}&longitude=${lon}${params}`;
    } else {
        url = `${BASE_URL}/timingsByCity?city=${encodeURIComponent(location)}&country=&${params}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`تعذر الاتصال بالخادم (${response.status})`);
    }

    const json = await response.json();
    if (json.code !== 200 || !json.data) {
        throw new Error('بيانات غير صحيحة من الخادم');
    }

    const timings = json.data.timings;
    const prayers: PrayerTime[] = Object.keys(PRAYER_NAMES_MAP).map(key => ({
        name: PRAYER_NAMES_MAP[key].en,
        nameAr: PRAYER_NAMES_MAP[key].ar,
        time: timings[key]
    }));

    // Calculate Qibla if not already set or even if using city
    let qiblaDirection = 135.5;
    try {
        const lat = parseFloat(json.data.meta.latitude);
        const lon = parseFloat(json.data.meta.longitude);

        // Kaaba Coordinates
        const kLat = 21.4225 * Math.PI / 180.0;
        const kLon = 39.8262 * Math.PI / 180.0;
        const pLat = lat * Math.PI / 180.0;
        const pLon = lon * Math.PI / 180.0;

        const y = Math.sin(kLon - pLon) * Math.cos(kLat);
        const x = Math.cos(pLat) * Math.sin(kLat) - Math.sin(pLat) * Math.cos(kLat) * Math.cos(kLon - pLon);
        let qibla = Math.atan2(y, x) * 180.0 / Math.PI;
        if (qibla < 0) qibla += 360;
        qiblaDirection = qibla;
    } catch (e) {
        console.warn('Failed to calculate qibla', e);
    }

    const result: PrayerData = {
        prayers,
        qiblaDirection,
        city: location.includes(',') ? (json.data.meta.timezone.split('/')[1]?.replace('_', ' ') || 'موقعي') : location,
        date: json.data.date.readable,
        hijriDate: `${json.data.date.hijri.day} ${json.data.date.hijri.month.ar} ${json.data.date.hijri.year}`,
        hijriMonth: json.data.date.hijri.month.ar,
        hijriYear: json.data.date.hijri.year,
        hijriMonthEn: json.data.date.hijri.month.en,
        hijriMonthValue: parseInt(json.data.date.hijri.month.number),
        hijriDay: parseInt(json.data.date.hijri.day),
        gregorianDate: json.data.date.gregorian.date,
    };

    localStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
}

export async function fetchCalendar(location: string, year: number, month: number, methodId: string = '3', school: number = 0, offsets: Record<string, number> = {}): Promise<CalendarDay[]> {
    const adjustment = localStorage.getItem('hijri_adjustment') || '0';
    const offsetsStr = JSON.stringify(offsets);
    const cacheKey = `cal_v2_${location}_${year}_${month}_${methodId}_${school}_${adjustment}_${offsetsStr}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    let url = '';
    const params = `&method=${methodId}&school=${school}&adjustment=${adjustment}`;

    if (location.includes(',')) {
        const [lat, lon] = location.split(',');
        url = `${BASE_URL}/calendar?latitude=${lat}&longitude=${lon}&year=${year}&month=${month}${params}`;
    } else {
        url = `${BASE_URL}/calendarByCity?city=${encodeURIComponent(location)}&country=&year=${year}&month=${month}${params}`;
    }

    const response = await fetch(url);
    if (response.status === 429) throw new Error('Too many requests. Please wait a moment.');
    if (!response.ok) throw new Error('Failed to fetch calendar');
    const json = await response.json();
    if (json.code !== 200 || !json.data) throw new Error('Failed to fetch calendar');

    const data = json.data.map((day: any) => {
        const adjustedTimings = { ...day.timings };
        Object.entries(offsets).forEach(([key, val]) => {
            if (val === 0) return;
            const timeStr = adjustedTimings[key];
            if (!timeStr) return;

            const [time] = timeStr.split(' ');
            const [h, m] = time.split(':').map(Number);
            const date = new Date();
            date.setHours(h, m, 0, 0);
            date.setMinutes(date.getMinutes() + val);
            adjustedTimings[key] = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        });

        return {
            date: day.date.readable,
            hijri: {
                day: day.date.hijri.day,
                month: { ar: day.date.hijri.month.ar, en: day.date.hijri.month.en },
                year: day.date.hijri.year
            },
            gregorian: {
                date: day.date.gregorian.date,
                day: day.date.gregorian.weekday.en,
                month: { en: day.date.gregorian.month.en },
                year: day.date.gregorian.year
            },
            timings: adjustedTimings
        };
    });

    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
}

export async function fetchHijriCalendar(location: string, year: number, month: number, methodId: string = '3', school: number = 0, offsets: Record<string, number> = {}): Promise<CalendarDay[]> {
    const adjustment = localStorage.getItem('hijri_adjustment') || '0';
    const offsetsStr = JSON.stringify(offsets);
    const cacheKey = `hcal_v2_${location}_${year}_${month}_${methodId}_${school}_${adjustment}_${offsetsStr}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    let url = '';
    const params = `&method=${methodId}&school=${school}&adjustment=${adjustment}`;

    if (location.includes(',')) {
        const [lat, lon] = location.split(',');
        url = `${BASE_URL}/hijriCalendar?latitude=${lat}&longitude=${lon}&year=${year}&month=${month}${params}`;
    } else {
        url = `${BASE_URL}/hijriCalendarByCity?city=${encodeURIComponent(location)}&country=&year=${year}&month=${month}${params}`;
    }

    const response = await fetch(url);
    if (response.status === 429) throw new Error('Too many requests. Please wait a moment.');
    if (!response.ok) throw new Error('Failed to fetch hijri calendar');
    const json = await response.json();
    if (json.code !== 200 || !json.data) throw new Error('Failed to fetch hijri calendar');

    const data = json.data.map((day: any) => {
        const adjustedTimings = { ...day.timings };
        Object.entries(offsets).forEach(([key, val]) => {
            if (val === 0) return;
            const timeStr = adjustedTimings[key];
            if (!timeStr) return;

            const [time] = timeStr.split(' ');
            const [h, m] = time.split(':').map(Number);
            const date = new Date();
            date.setHours(h, m, 0, 0);
            date.setMinutes(date.getMinutes() + val);
            adjustedTimings[key] = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        });

        return {
            date: day.date.readable,
            hijri: {
                day: day.date.hijri.day,
                month: { ar: day.date.hijri.month.ar, en: day.date.hijri.month.en },
                year: day.date.hijri.year
            },
            gregorian: {
                date: day.date.gregorian.date,
                day: day.date.gregorian.weekday.en,
                month: { en: day.date.gregorian.month.en },
                year: day.date.gregorian.year
            },
            timings: adjustedTimings
        };
    });

    localStorage.setItem(cacheKey, JSON.stringify(data));
    return data;
}

export function getNextPrayer(prayers: PrayerTime[]): { prayer: PrayerTime; remaining: string; minutesUntil: number; progress: number } {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let nextIndex = -1;
    for (let i = 0; i < prayers.length; i++) {
        if (prayers[i].name === 'Sunrise') continue;
        const [h, m] = prayers[i].time.split(':').map(Number);
        const prayerMinutes = h * 60 + m;
        if (prayerMinutes > nowMinutes) {
            nextIndex = i;
            break;
        }
    }

    if (nextIndex !== -1) {
        const prayer = prayers[nextIndex];
        const [h, m] = prayer.time.split(':').map(Number);
        const prayerMinutes = h * 60 + m;

        // Find previous prayer to calculate progress
        let prevIndex = nextIndex - 1;
        while (prevIndex >= 0 && prayers[prevIndex].name === 'Sunrise') {
            prevIndex--;
        }

        let startMinutes = 0;
        if (prevIndex >= 0) {
            const [ph, pm] = prayers[prevIndex].time.split(':').map(Number);
            startMinutes = ph * 60 + pm;
        } else {
            // Previous was Isha of yesterday
            const isha = prayers.find(p => p.name === 'Isha');
            if (isha) {
                const [ih, im] = isha.time.split(':').map(Number);
                startMinutes = ih * 60 + im - 24 * 60;
            }
        }

        const totalMinutes = prayerMinutes - startMinutes;
        const elapsedMinutes = nowMinutes - startMinutes;
        const progress = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));

        const diff = prayerMinutes - nowMinutes;
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        const remaining = hours > 0
            ? `${hours} ساعة و ${mins} دقيقة`
            : `${mins} دقيقة`;

        return { prayer, remaining, minutesUntil: diff, progress };
    }

    // All prayers today pass, next is tomorrow's Fajr
    const fajr = prayers[0];
    const [fh, fm] = fajr.time.split(':').map(Number);
    const fajrMinutesTomorrow = fh * 60 + fm + 24 * 60;

    const isha = prayers.find(p => p.name === 'Isha');
    let ishaMinutes = 0;
    if (isha) {
        const [ih, im] = isha.time.split(':').map(Number);
        ishaMinutes = ih * 60 + im;
    }

    const totalMinutes = fajrMinutesTomorrow - ishaMinutes;
    const elapsedMinutes = nowMinutes - ishaMinutes;
    const progress = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));

    const diff = fajrMinutesTomorrow - nowMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;

    return {
        prayer: fajr,
        remaining: `${hours} ساعة و ${mins} دقيقة`,
        minutesUntil: diff,
        progress
    };
}

export function getIftarCountdown(prayers: PrayerTime[]): { h: number; m: number; s: number } | null {
    const maghrib = prayers.find(p => p.name === 'Maghrib');
    if (!maghrib) return null;

    const now = new Date();
    const [mh, mm] = maghrib.time.split(':').map(Number);
    const maghribDate = new Date();
    maghribDate.setHours(mh, mm, 0, 0);

    const diff = maghribDate.getTime() - now.getTime();
    if (diff <= 0) return { h: 0, m: 0, s: 0 };

    const totalSeconds = Math.floor(diff / 1000);
    return {
        h: Math.floor(totalSeconds / 3600),
        m: Math.floor((totalSeconds % 3600) / 60),
        s: totalSeconds % 60,
    };
}

export function getHijriDate(prayerData?: PrayerData | null): string {
    const toLatinNum = (str: string) => {
        const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return str.replace(/[٠-٩]/g, (d) => arabicNumbers.indexOf(d).toString());
    };
    if (prayerData?.hijriDate) return toLatinNum(prayerData.hijriDate);
    try {
        const formatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        return toLatinNum(formatter.format(new Date()));
    } catch {
        return '1 رمضان 1447';
    }
}

export function getGregorianDate(prayerData?: PrayerData | null): string {
    if (prayerData?.gregorianDate) return prayerData.gregorianDate;
    return new Date().toLocaleDateString('ar-SA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export function getRamadanDay(prayerData?: PrayerData | null): number {
    if (prayerData?.hijriMonthEn === "Ramadan") {
        return parseInt(prayerData.hijriDate.split(' ')[0]);
    }
    // Fallback if needed, but usually we rely on API now
    return 1;
}

export function getSuhoorTime(prayers: PrayerTime[]): string {
    const fajr = prayers.find(p => p.name === 'Fajr');
    if (!fajr) return '--:--';
    const [h, m] = fajr.time.split(':').map(Number);
    const suhoorMinutes = h * 60 + m - 30;
    const sh = Math.floor(suhoorMinutes / 60);
    const sm = suhoorMinutes % 60;
    return `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
}
