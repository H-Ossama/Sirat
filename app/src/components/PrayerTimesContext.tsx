import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchPrayerTimes, PrayerData, getNextPrayer } from '../services/prayerService';
import { scheduleAllNotifications, getNotificationSettings } from '../services/notificationService';
import { scheduleAthanNotifications, getAthanSettings, playAthan } from '../services/athanService';
import { useLocation } from '../hooks/useLocation';
import { Capacitor } from '@capacitor/core';
import Widget from '../services/widgetService';

const CITY_KEY = 'user_city';
const METHOD_KEY = 'prayer_method';
const SCHOOL_KEY = 'prayer_school';
const OFFSETS_KEY = 'prayer_offsets';

export type PrayerOffsets = Record<string, number>;

interface PrayerTimesContextType {
    prayerData: PrayerData | null;
    loading: boolean;
    error: string | null;
    city: string; // The city set in localStorage
    locationName: string; // The display name
    locationCity: string | null; // The raw detected city
    locationLoading: boolean;
    locationError: string | null;
    coords: { lat: number; lon: number } | null;
    methodId: string;
    school: number;
    hijriAdj: number;
    prayerOffsets: PrayerOffsets;
    changeCity: (newCity: string | null, displayCity?: string) => void;
    changeMethod: (newMethodId: string) => void;
    changeSchool: (newSchool: number) => void;
    updateAdjustment: (val: number) => void;
    updatePrayerOffset: (prayerName: string, delta: number) => void;
    reload: () => void;
    refreshLocation: () => Promise<{ lat: number; lon: number } | null>;
}

const PrayerTimesContext = createContext<PrayerTimesContextType | undefined>(undefined);

export function PrayerTimesProvider({ children }: { children: React.ReactNode }) {
    const [prayerData, setPrayerData] = useState<PrayerData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [city, setCity] = useState<string>(() => localStorage.getItem(CITY_KEY) || '');
    const [methodId, setMethodId] = useState<string>(() => localStorage.getItem(METHOD_KEY) || '3');
    const [school, setSchool] = useState<number>(() => parseInt(localStorage.getItem(SCHOOL_KEY) || '0'));
    const [hijriAdj, setHijriAdj] = useState<number>(() => parseInt(localStorage.getItem('hijri_adjustment') || '0'));
    const [prayerOffsets, setPrayerOffsets] = useState<PrayerOffsets>(() => {
        const saved = localStorage.getItem(OFFSETS_KEY);
        return saved ? JSON.parse(saved) : {};
    });

    // Listen for storage changes to sync across components
    useEffect(() => {
        const handleStorage = () => {
            const adj = parseInt(localStorage.getItem('hijri_adjustment') || '0');
            setHijriAdj(adj);
            const off = localStorage.getItem(OFFSETS_KEY);
            if (off) setPrayerOffsets(JSON.parse(off));
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    const { coords, city: locationCity, loading: locationLoading, error: locationError, refresh: refreshLocation } = useLocation();
    const hasInitialLoaded = useRef(false);
    const lastPlayedPrayerRef = useRef<string | null>(null);

    // Update Widgets
    const widgetIntervalRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
        if (prayerData) {
            const updateWidget = async () => {
                console.log('--- Triggering Widgets Update ---');
                try {
                    const now = new Date();
                    const gregDateStr = now.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
                    const hijriDayVal = prayerData.hijriDay || parseInt(prayerData.hijriDate.split(' ')[0]) || 1;

                    // 1. Next Prayer & Remaining Time
                    const nextP = getNextPrayer(prayerData.prayers);
                    console.log('Updating Next Prayer:', nextP.prayer.nameAr);
                    await Widget.update({
                        nameAr: nextP.prayer.nameAr,
                        time: nextP.prayer.time,
                        remaining: nextP.remaining
                    });

                    // 2. Hijri Date Widget
                    console.log('Updating Hijri:', `${hijriDayVal} ${prayerData.hijriMonth}`);
                    await Widget.updateHijri({
                        dayName: now.toLocaleDateString('ar-SA', { weekday: 'long' }),
                        date: `${hijriDayVal} ${prayerData.hijriMonth}`,
                        year: `${prayerData.hijriYear} هـ`,
                        gregorian: gregDateStr,
                        hDay: hijriDayVal,
                        hMonthIndex: prayerData.hijriMonthValue || 1
                    });

                    // 3. Athkar Widget
                    console.log('Updating Athkar Widget');
                    const isMorning = now.getHours() < 12;
                    await Widget.updateAthkar({
                        title: "أذكار اليوم",
                        status: isMorning ? "أذكار الصباح ☀️" : "أذكار المساء 🌙",
                        msg: "اضغط للقراءة والتسبيح"
                    });

                    // 4. Schedule Widget
                    console.log('Updating Schedule Widget');
                    const p = prayerData.prayers;
                    const getT = (name: string) => p.find(x => x.name === name)?.time || '--:--';
                    await Widget.updateSchedule({
                        fajr: getT('Fajr'),
                        dhuhr: getT('Dhuhr'),
                        asr: getT('Asr'),
                        maghrib: getT('Maghrib'),
                        isha: getT('Isha')
                    });

                    // 5. Inspiration Widget
                    console.log('Updating Inspiration Widget');
                    const INSPIRATIONS = [
                        { text: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", source: "سورة البقرة: 186" },
                        { text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا", source: "سورة الشرح: 5" },
                        { text: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", source: "سورة البقرة: 286" },
                        { text: "وَتَوَكَّلْ عَلَى الْحَيِّ الَّذِي لَا يَمُوتُ", source: "سورة الفرقان: 58" },
                        { text: "رَبِّ إِنِّي لِمَا أَنزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ", source: "سورة القصص: 24" },
                        { text: "فَاصْبِرْ صَبْرًا جَمِيلًا", source: "سورة المعارج: 5" },
                        { text: "اللهم إنك عفو تحب العفو فاعف عني", source: "دعاء مأثور" },
                        { text: "يا حي يا قيوم برحمتك أستغيث", source: "دعاء مأثور" },
                        { text: "وَسِيقَ الَّذِينَ اتَّقَوْا رَبَّهُمْ إِلَى الْجَنَّةِ زُمَرًا", source: "سورة الزمر: 73" }
                    ];
                    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
                    const inspiration = INSPIRATIONS[dayOfYear % INSPIRATIONS.length];
                    await Widget.updateInspiration({
                        text: inspiration.text,
                        source: inspiration.source
                    });

                    // 6. Calendar Grid
                    try {
                        console.log('Updating Calendar Grid Widget');
                        const calYear = now.getFullYear();
                        const calMonth = now.getMonth() + 1;
                        const daysInMonth = new Date(calYear, calMonth, 0).getDate();
                        const todayDate = now.getDate();
                        const hijriDays: string[] = [];
                        for (let d = 1; d <= daysInMonth; d++) {
                            const offset = d - todayDate;
                            let hDay = hijriDayVal + offset;
                            if (hDay < 1) hDay = 30 + hDay;
                            if (hDay > 30) hDay = hDay - 30;
                            hijriDays.push(String(hDay));
                        }
                        await Widget.updateCalendar({
                            year: calYear,
                            month: calMonth,
                            data: hijriDays.join(','),
                            hijriTitle: `${prayerData.hijriMonth} ${prayerData.hijriYear}`,
                            hijriSubtitle: `${now.toLocaleString('ar-SA', { month: 'long' })} ${now.getFullYear()}`
                        });
                    } catch (calErr) {
                        console.warn('Failed to update calendar widget', calErr);
                    }
                } catch (widgErr) {
                    console.warn('General widget update failed', widgErr);
                }
            };

            updateWidget();
            if (widgetIntervalRef.current) clearInterval(widgetIntervalRef.current);
            widgetIntervalRef.current = setInterval(updateWidget, 10000);
            return () => { if (widgetIntervalRef.current) clearInterval(widgetIntervalRef.current); };
        }
    }, [prayerData]);


    const load = useCallback(async (locationStr: string, mid: string, sch: number, currentOffsets: PrayerOffsets) => {
        if (!locationStr) return;

        // Fast cache check to avoid flicker
        const adj = localStorage.getItem('hijri_adjustment') || '0';
        const cacheKey = `prayer_v7_${locationStr}_${mid}_${sch}_${adj}_${new Date().toDateString()}`;
        const cached = localStorage.getItem(cacheKey);

        if (!cached) {
            setLoading(true);
        }

        setError(null);
        try {
            const data = await fetchPrayerTimes(locationStr, mid, sch);

            // Apply Manual Offsets
            const adjustedPrayers = data.prayers.map(p => {
                const offset = currentOffsets[p.name] || 0;
                if (offset === 0) return p;

                const [h, m] = p.time.split(':').map(Number);
                const date = new Date();
                date.setHours(h, m, 0, 0);
                date.setMinutes(date.getMinutes() + offset);

                return {
                    ...p,
                    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
                };
            });

            const adjustedData = { ...data, prayers: adjustedPrayers };
            setPrayerData(adjustedData);

            const settings = getNotificationSettings();
            const athanSettings = getAthanSettings();
            const isRamadan = data.hijriMonthEn === 'Ramadan';
            
            await scheduleAllNotifications(
                adjustedPrayers, 
                settings, 
                isRamadan, 
                athanSettings, 
                locationStr, 
                mid, 
                sch, 
                currentOffsets
            );
        } catch (err: any) {
            setError(err.message || 'تعذّر تحميل مواقيت الصلاة');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [city, coords, methodId, school, prayerOffsets]);

    // Load when settings change
    useEffect(() => {
        if (hasInitialLoaded.current && !loading) {
            const query = city || (coords ? `${coords.lat},${coords.lon}` : '');
            if (query) load(query, methodId, school, prayerOffsets);
        }
    }, [methodId, school, prayerOffsets]);

    // Initial load logic
    useEffect(() => {
        if (hasInitialLoaded.current) return;

        if (city) {
            load(city, methodId, school, prayerOffsets);
            hasInitialLoaded.current = true;
        } else if (!locationLoading) {
            if (coords) {
                load(`${coords.lat},${coords.lon}`, methodId, school, prayerOffsets);
                hasInitialLoaded.current = true;
            } else if (locationError) {
                const fallback = 'mecca';
                setCity(fallback);
                load(fallback, methodId, school, prayerOffsets);
                hasInitialLoaded.current = true;
            }
        }
    }, [city, coords, locationLoading, locationError, load, methodId, school, prayerOffsets]);

    const changeCity = useCallback((newCity: string | null, displayCity?: string) => {
        if (newCity) {
            localStorage.setItem(CITY_KEY, newCity);
            if (displayCity) {
                localStorage.setItem('user_city_display', displayCity);
            } else if (!newCity.includes(',')) {
                // If it's a manual city name, use it as display name too
                localStorage.setItem('user_city_display', newCity);
            }
        } else {
            localStorage.removeItem(CITY_KEY);
            localStorage.removeItem('user_city_display');
        }
        setCity(newCity || '');
        const query = newCity || (coords ? `${coords.lat},${coords.lon}` : 'mecca');
        load(query, methodId, school, prayerOffsets);
    }, [load, methodId, school, coords, prayerOffsets]);

    const changeMethod = useCallback((newMethodId: string) => {
        localStorage.setItem(METHOD_KEY, newMethodId);
        setMethodId(newMethodId);
    }, []);

    const changeSchool = useCallback((newSchool: number) => {
        localStorage.setItem(SCHOOL_KEY, newSchool.toString());
        setSchool(newSchool);
    }, []);

    const reload = useCallback(() => {
        const query = city || (coords ? `${coords.lat},${coords.lon}` : 'mecca');
        load(query, methodId, school, prayerOffsets);
    }, [city, coords, load, methodId, school, prayerOffsets]);

    const locationName = localStorage.getItem('user_city_display') || city || locationCity || (locationLoading ? '' : 'مكة المكرمة');

    return (
        <PrayerTimesContext.Provider value={{
            prayerData,
            loading: loading || (locationLoading && !city && !hasInitialLoaded.current),
            error: error || (locationError && !city ? 'يرجى تفعيل الموقع أو اختيار مدينة' : null),
            city,
            locationName,
            locationCity,
            locationLoading,
            locationError,
            coords,
            methodId,
            school,
            hijriAdj,
            changeCity,
            changeMethod,
            changeSchool,
            updateAdjustment: (val: number) => {
                localStorage.setItem('hijri_adjustment', val.toString());
                setHijriAdj(val);
                reload();
            },
            updatePrayerOffset: (prayerName: string, delta: number) => {
                setPrayerOffsets(prev => {
                    const newVal = (prev[prayerName] || 0) + delta;
                    const next = { ...prev, [prayerName]: newVal };
                    localStorage.setItem(OFFSETS_KEY, JSON.stringify(next));
                    return next;
                });
            },
            reload,
            refreshLocation,
            prayerOffsets
        }}>
            {children}
        </PrayerTimesContext.Provider>
    );
}

export function usePrayerTimesContext() {
    const context = useContext(PrayerTimesContext);
    if (context === undefined) {
        throw new Error('usePrayerTimesContext must be used within a PrayerTimesProvider');
    }
    return context;
}
