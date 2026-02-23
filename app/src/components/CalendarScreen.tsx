import { useState, useEffect } from 'react';
import { ChevronLeftIcon, MoonIcon, TargetIcon } from './Icons';
import { fetchCalendar, fetchHijriCalendar, CalendarDay, getGregorianDate } from '../services/prayerService';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { useTheme } from './ThemeContext';

interface CalendarScreenProps {
    onBack: () => void;
}

export function CalendarScreen({ onBack }: CalendarScreenProps) {
    const { theme } = useTheme();
    const { prayerData, city, coords, methodId, school, prayerOffsets } = usePrayerTimes();
    const [calendar, setCalendar] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [isHijriPrimary, setIsHijriPrimary] = useState(localStorage.getItem('cal_pref') === 'hijri');

    // Consolidated View State: Interpretation depends on isHijriPrimary
    const [viewMonth, setViewMonth] = useState(isHijriPrimary ? 9 : new Date().getMonth() + 1); // 9 for Ramadan/Sha'ban context if needed, or dynamic
    const [viewYear, setViewYear] = useState(isHijriPrimary ? 1447 : new Date().getFullYear());

    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
    const { hijriAdj, updateAdjustment } = usePrayerTimes();

    const monthNamesAr = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const weekDays = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
    const weekDaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const today = new Date();
    const todayStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

    const hijriMonthsMap: Record<string, number> = {
        "Muharram": 1, "Safar": 2, "Rabi' al-awwal": 3, "Rabi' ath-thani": 4,
        "Jumada al-ula": 5, "Jumada al-akhira": 6, "Rajab": 7, "Sha'ban": 8,
        "Ramadan": 9, "Shawwal": 10, "Dhu al-Qi'dah": 11, "Dhu al-Hijjah": 12,
        "محرم": 1, "صفر": 2, "ربيع الأول": 3, "ربيع الآخر": 4,
        "جمادى الأولى": 5, "جمادى الآخرة": 6, "رجب": 7, "شعبان": 8,
        "رمضان": 9, "شوال": 10, "ذو القعدة": 11, "ذو الحجة": 12
    };

    // On mount, if Hijri is primary, we need to find the correct current Hijri month
    useEffect(() => {
        if (isHijriPrimary && viewYear > 2000) {
            // We are in Gregorian state but isHijriPrimary is true (e.g. from localStorage)
            // Just a rough estimate for 2026-02 -> 1447-08
            setViewMonth(8);
            setViewYear(1447);
        }
    }, []);

    useEffect(() => {
        const loadCalendar = async () => {
            setLoading(true);
            try {
                const query = city || (coords ? `${coords.lat},${coords.lon}` : 'rabat');
                let data: CalendarDay[] = [];

                if (isHijriPrimary) {
                    data = await fetchHijriCalendar(query, viewYear, viewMonth, methodId, school, prayerOffsets);
                } else {
                    data = await fetchCalendar(query, viewYear, viewMonth, methodId, school, prayerOffsets);
                }

                setCalendar(data);

                // Auto-sync Today when switching or adjusting
                const currentToday = data.find(d => d.gregorian.date === todayStr);
                if (currentToday) {
                    setSelectedDay(currentToday);
                } else if (data.length > 0) {
                    setSelectedDay(data[0]);
                }

            } catch (err) {
                console.error('Error loading calendar:', err);
            } finally {
                setLoading(false);
            }
        };
        loadCalendar();
    }, [viewMonth, viewYear, isHijriPrimary, city, methodId, school, hijriAdj]);

    const changeMonth = (offset: number) => {
        let nm = viewMonth + offset;
        let ny = viewYear;
        if (nm > 12) { nm = 1; ny++; }
        if (nm < 1) { nm = 12; ny--; }
        setViewMonth(nm);
        setViewYear(ny);
    };

    const toggleCalendar = () => {
        const newVal = !isHijriPrimary;
        setIsHijriPrimary(newVal);
        localStorage.setItem('cal_pref', newVal ? 'hijri' : 'gregorian');

        // Always jump to Today when switching systems
        const d = new Date();
        if (newVal) {
            const todayH = getAdjustedHijri(todayStr, hijriAdj);
            const hMonthNum = hijriMonthsMap[todayH.monthEn] || hijriMonthsMap[todayH.month] || 9;
            setViewMonth(hMonthNum);
            setViewYear(parseInt(todayH.year));
        } else {
            setViewMonth(d.getMonth() + 1);
            setViewYear(d.getFullYear());
        }
    };

    const updateAdjustmentAndSync = (val: number) => {
        updateAdjustment(val);
        if (isHijriPrimary) {
            const todayH = getAdjustedHijri(todayStr, hijriAdj + val);
            const hMonthNum = hijriMonthsMap[todayH.monthEn] || hijriMonthsMap[todayH.month] || 9;
            setViewMonth(hMonthNum);
            setViewYear(parseInt(todayH.year));
        }
    };

    const goToToday = () => {
        const d = new Date();
        if (isHijriPrimary) {
            try {
                const todayH = getAdjustedHijri(todayStr, hijriAdj);
                const hMonthNum = hijriMonthsMap[todayH.monthEn] || hijriMonthsMap[todayH.month] || 9;
                setViewMonth(hMonthNum);
                setViewYear(parseInt(todayH.year));
            } catch (e) {
                setViewMonth(9);
                setViewYear(1447);
            }
        } else {
            setViewMonth(d.getMonth() + 1);
            setViewYear(d.getFullYear());
        }
    };

    const getAdjustedHijri = (gDateStr: string, offset: number) => {
        try {
            const [d, m, y] = gDateStr.split('-').map(Number);
            const date = new Date(y, m - 1, d, 12, 0, 0);

            if (offset !== 0) {
                date.setDate(date.getDate() + offset);
            }

            const parts = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            }).formatToParts(date);

            const partsEn = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
                month: 'long'
            }).formatToParts(date);

            return {
                day: parts.find(p => p.type === 'day')?.value || '1',
                month: parts.find(p => p.type === 'month')?.value || '',
                monthEn: partsEn.find(p => p.type === 'month')?.value || '',
                year: parts.find(p => p.type === 'year')?.value || '1447',
                full: parts.map(p => p.value).join('')
            };
        } catch (e) {
            return { day: '1', month: '', monthEn: '', year: '1447', full: '' };
        }
    };

    const currentSelectedDayHijri = selectedDay ? getAdjustedHijri(selectedDay.gregorian.date, hijriAdj) : null;

    return (
        <div className={`h-full transition-colors duration-300 overflow-y-auto hide-scrollbar pb-24 ${theme === 'light' ? 'bg-[#f8fbff] text-slate-800' : 'bg-gradient-to-b from-[#0b1929] via-[#121f38] to-[#0a1525] text-white'}`}>
            {/* Nav Bar */}
            <div className={`px-5 pt-5 pb-3 sticky top-0 backdrop-blur-lg z-20 transition-all ${theme === 'light' ? 'bg-white/90 border-b border-slate-200 shadow-sm' : 'bg-[#0b1929]/95 shadow-sm'}`}>
                <div className="flex items-center justify-between gap-4">
                    <button onClick={onBack} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${theme === 'light' ? 'bg-slate-100 border border-slate-200' : 'bg-white/[0.08] border border-white/[0.1]'}`}>
                        <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${theme === 'light' ? 'text-slate-600' : 'text-white/80'}`} />
                    </button>

                    <h1 className={`text-xl font-amiri font-bold ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>التقويم اليومي</h1>

                    <button
                        onClick={goToToday}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border active:scale-95 transition-all ${theme === 'light' ? 'bg-gold-50 border-gold-200 text-gold-600' : 'bg-gold-400/10 border-gold-400/20 text-gold-300'}`}
                    >
                        <span className="text-[14px] font-amiri font-bold">اليوم</span>
                        <TargetIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="px-5 pt-4">
                {/* Date Card */}
                <div className={`mb-6 rounded-[32px] p-6 shadow-xl relative overflow-hidden group border transition-all ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-white/[0.02] border-white/[0.05]'}`} dir="rtl">
                    <div className={`absolute top-0 left-0 w-32 h-32 blur-[50px] rounded-full translate-x-[-20%] translate-y-[-20%] transition-opacity ${theme === 'light' ? 'bg-gold-200/40' : 'bg-gold-400/[0.03]'}`} />

                    <div className="flex items-center justify-between gap-4 relative z-10">
                        <div className="flex-1">
                            {selectedDay ? (
                                <div className="animate-fade-in">
                                    <h3 className={`text-[26px] font-amiri font-bold leading-tight mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                        {isHijriPrimary
                                            ? (currentSelectedDayHijri ? `${currentSelectedDayHijri.day} ${currentSelectedDayHijri.month} ${currentSelectedDayHijri.year}` : '...')
                                            : `${parseInt(selectedDay.gregorian.date.split('-')[0])} ${monthNamesAr[parseInt(selectedDay.gregorian.date.split('-')[1]) - 1]} ${parseInt(selectedDay.gregorian.date.split('-')[2])}`
                                        }
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <p className={`text-[14px] font-amiri ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
                                            {isHijriPrimary
                                                ? `${parseInt(selectedDay.gregorian.date.split('-')[0])} ${monthNamesAr[parseInt(selectedDay.gregorian.date.split('-')[1]) - 1]} ${parseInt(selectedDay.gregorian.date.split('-')[2])}`
                                                : `${currentSelectedDayHijri?.day} ${currentSelectedDayHijri?.month} ${currentSelectedDayHijri?.year}`
                                            }
                                        </p>
                                        <div className={`w-1 h-1 rounded-full ${theme === 'light' ? 'bg-gold-300' : 'bg-gold-400/30'}`} />
                                        <p className={`text-[14px] font-amiri ${theme === 'light' ? 'text-gold-600' : 'text-gold-400/60'}`}>
                                            {selectedDay.gregorian.day === 'Friday' ? 'الجمعة' :
                                                selectedDay.gregorian.day === 'Monday' ? 'الاثنين' :
                                                    selectedDay.gregorian.day === 'Tuesday' ? 'الثلاثاء' :
                                                        selectedDay.gregorian.day === 'Wednesday' ? 'الأربعاء' :
                                                            selectedDay.gregorian.day === 'Thursday' ? 'الخميس' :
                                                                selectedDay.gregorian.day === 'Saturday' ? 'السبت' : 'الأحد'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-[60px] flex items-center">
                                    <div className={`w-24 h-6 rounded-full animate-pulse ${theme === 'light' ? 'bg-slate-100' : 'bg-white/5'}`} />
                                </div>
                            )}
                        </div>

                        <div className={`flex flex-col p-1 rounded-3xl border shadow-inner ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.03] border-white/[0.05]'}`}>
                            <button
                                onClick={toggleCalendar}
                                className={`px-4 py-2.5 rounded-2xl transition-all font-amiri leading-none ${isHijriPrimary
                                    ? (theme === 'light' ? 'bg-gold-500 text-white shadow-md' : 'bg-gold-400 text-[#0b1929] shadow-lg scale-105 font-bold')
                                    : (theme === 'light' ? 'text-slate-400' : 'text-white/30 text-[13px]')
                                    }`}
                            >
                                هجري
                            </button>
                            <button
                                onClick={toggleCalendar}
                                className={`px-4 py-2.5 rounded-2xl transition-all font-amiri leading-none ${!isHijriPrimary
                                    ? (theme === 'light' ? 'bg-gold-500 text-white shadow-md' : 'bg-gold-400 text-[#0b1929] shadow-lg scale-105 font-bold')
                                    : (theme === 'light' ? 'text-slate-400' : 'text-white/30 text-[13px]')
                                    }`}
                            >
                                ميلادي
                            </button>
                        </div>
                    </div>
                </div>

                {/* View Navigator */}
                <div className="flex items-center justify-between mb-6 px-1" dir="rtl">
                    <div className="text-right">
                        <h4 className={`text-[12px] font-bold uppercase tracking-widest mb-1 font-naskh ${theme === 'light' ? 'text-slate-400' : 'text-gold-300/40'}`}>عرض الشهر</h4>
                        <p className={`text-[18px] font-amiri font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                            {isHijriPrimary ? (
                                `${calendar.length > 0 ? getAdjustedHijri(calendar[15].gregorian.date, hijriAdj).month : '...'} ${viewYear}`
                            ) : (
                                `${monthNamesAr[viewMonth - 1]} ${viewYear}`
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => changeMonth(1)} className={`w-11 h-11 rounded-2xl border flex items-center justify-center active:scale-95 transition-all ${theme === 'light' ? 'bg-white border-slate-100 text-slate-600' : 'bg-white/[0.05] border-white/[0.08] text-white'}`}>
                            <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                        </button>
                        <button onClick={() => changeMonth(-1)} className={`w-11 h-11 rounded-2xl border flex items-center justify-center active:scale-95 transition-all ${theme === 'light' ? 'bg-white border-slate-100 text-slate-600' : 'bg-white/[0.05] border-white/[0.08] text-white'}`}>
                            <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className={`w-12 h-12 border-2 rounded-full animate-spin ${theme === 'light' ? 'border-gold-500/20 border-t-gold-500' : 'border-gold-400/20 border-t-gold-400'}`} />
                    </div>
                ) : (
                    <div className={`rounded-[40px] p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden border transition-all ${theme === 'light' ? 'bg-white border-slate-100 shadow-slate-200/50' : 'bg-white/[0.03] border-white/[0.08]'}`}>
                        <div className="grid grid-cols-7 gap-1 text-center mb-5" dir="rtl">
                            {weekDays.map(d => (
                                <span key={d} className={`text-[12px] font-bold py-2 ${theme === 'light' ? 'text-slate-300' : 'text-gold-300/30'}`}>{d}</span>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2.5" dir="rtl">
                            {calendar.length > 0 && Array.from({ length: Math.max(0, weekDaysEn.indexOf(calendar[0].gregorian.day)) }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-[1/1.1]" />
                            ))}

                            {calendar.map((day, i) => {
                                const isToday = day.gregorian.date === todayStr;
                                const isSelected = selectedDay && selectedDay.gregorian.date === day.gregorian.date;
                                const dayHijri = getAdjustedHijri(day.gregorian.date, hijriAdj);
                                const isRamadan = dayHijri.month === "رمضان";

                                const bigNum = isHijriPrimary ? dayHijri.day : parseInt(day.gregorian.date.split('-')[0]);
                                const smallNum = isHijriPrimary ? parseInt(day.gregorian.date.split('-')[0]) : dayHijri.day;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDay(day)}
                                        className={`relative aspect-[1/1.1] rounded-[22px] flex flex-col items-center justify-center transition-all border ${isSelected
                                            ? 'bg-gold-500 border-gold-600 shadow-xl -translate-y-1 scale-110 z-10 text-white'
                                            : isToday
                                                ? (theme === 'light' ? 'bg-gold-50 border-gold-300' : 'bg-white/[0.08] border-gold-400/50')
                                                : isRamadan
                                                    ? (theme === 'light' ? 'bg-islamic-50 border-islamic-200' : 'bg-islamic-500/10 border-islamic-500/20')
                                                    : (theme === 'light' ? 'bg-slate-50 border-slate-100 hover:bg-slate-100' : 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]')
                                            }`}
                                    >
                                        <span className={`text-[17px] font-bold leading-none ${isSelected ? 'text-white' : (theme === 'light' ? 'text-slate-800' : 'text-white')}`}>
                                            {bigNum}
                                        </span>
                                        <span className={`text-[10px] mt-0.5 font-amiri ${isSelected ? 'text-white/60' : isRamadan ? 'text-islamic-600' : (theme === 'light' ? 'text-slate-400' : 'text-white/30')}`}>
                                            {smallNum}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Quick Hijri Fix */}
                <div className={`mt-8 border rounded-3xl p-5 transition-all ${theme === 'light' ? 'bg-gold-50/50 border-gold-100' : 'bg-gold-400/[0.03] border-gold-400/10'}`} dir="rtl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${theme === 'light' ? 'bg-gold-100' : 'bg-gold-400/10'}`}>🛠️</div>
                            <div>
                                <p className={`text-[14px] font-amiri font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>تعديل سريع للهجري</p>
                                <p className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>إذا كان التاريخ يختلف عن منطقتك</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => updateAdjustmentAndSync(1)} className={`w-10 h-10 rounded-xl border active:opacity-50 text-xl font-bold ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-white/[0.05] border-white/[0.1] text-white'}`}>+</button>
                            <div className={`w-12 h-10 rounded-xl font-bold flex items-center justify-center ${theme === 'light' ? 'bg-gold-500 text-white' : 'bg-gold-400/10 text-gold-300'}`}>{hijriAdj}</div>
                            <button onClick={() => updateAdjustmentAndSync(-1)} className={`w-10 h-10 rounded-xl border active:opacity-50 text-xl font-bold ${theme === 'light' ? 'bg-white border-slate-200 text-slate-800' : 'bg-white/[0.05] border-white/[0.1] text-white'}`}>-</button>
                        </div>
                    </div>
                </div>

                {/* Selected Day Details */}
                {selectedDay && (
                    <div className={`mt-6 rounded-[32px] p-6 animate-fade-in shadow-2xl border transition-all ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-white/[0.04] border-white/[0.1]'}`} dir="rtl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-2xl border flex flex-col items-center justify-center transition-colors ${theme === 'light' ? 'bg-gold-50 border-gold-200' : 'bg-gold-400/10 border-gold-400/20'}`}>
                                <span className={`text-[20px] font-bold leading-none ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>{currentSelectedDayHijri?.day}</span>
                                <span className={`text-[10px] font-amiri ${theme === 'light' ? 'text-gold-400' : 'text-gold-300/50'}`}>{currentSelectedDayHijri?.month}</span>
                            </div>
                            <div>
                                <h4 className={`text-[18px] font-amiri font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>مواقيت اليوم</h4>
                                <p className={`text-[12px] ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>{selectedDay.gregorian.date}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { l: 'الفجر', t: selectedDay.timings.Fajr },
                                { l: 'الظهر', t: selectedDay.timings.Dhuhr },
                                { l: 'العصر', t: selectedDay.timings.Asr },
                                { l: 'المغرب', t: selectedDay.timings.Maghrib },
                                { l: 'العشاء', t: selectedDay.timings.Isha },
                                { l: 'الشروق', t: selectedDay.timings.Sunrise },
                            ].map(p => (
                                <div key={p.l} className={`p-3 rounded-2xl text-center border transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.03] border-white/[0.05]'}`}>
                                    <p className={`text-[10px] mb-1 font-amiri ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>{p.l}</p>
                                    <p className={`text-[14px] font-bold ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>{p.t.split(' ')[0]}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Important Dates */}
                <div className="mt-8 mb-10 pb-10">
                    <h3 className={`text-[12px] font-bold uppercase tracking-widest px-1 font-naskh mb-5 transition-colors ${theme === 'light' ? 'text-slate-300' : 'text-gold-300/40'}`} dir="rtl">التواريخ الهامة</h3>
                    <div className="space-y-4" dir="rtl">
                        {(() => {
                            const events: any[] = [];
                            calendar.forEach(d => {
                                const adjustedHijri = getAdjustedHijri(d.gregorian.date, hijriAdj);
                                if (adjustedHijri.day === "1") events.push({ d, t: `بداية شهر ${adjustedHijri.month}`, i: '🌙' });
                                if (adjustedHijri.day === "13" || adjustedHijri.day === "14" || adjustedHijri.day === "15") events.push({ d, t: `الأيام البيض (${adjustedHijri.day})`, i: '🌕' });
                                if (adjustedHijri.month === "رمضان") {
                                    if (adjustedHijri.day === "17") events.push({ d, t: 'ذكرى غزوة بدر', i: '⚔️' });
                                    if (parseInt(adjustedHijri.day) > 20 && parseInt(adjustedHijri.day) % 2 !== 0) events.push({ d, t: `ليلة وترية (${adjustedHijri.day})`, i: '✨' });
                                }
                            });
                            return events.slice(0, 5).map((ev, i) => (
                                <div key={i} className={`flex items-center gap-4 p-4 rounded-3xl shadow-sm border transition-all ${theme === 'light' ? 'bg-white border-slate-100 hover:bg-slate-50' : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${theme === 'light' ? 'bg-gold-50' : 'bg-gold-400/5'}`}>{ev.i}</div>
                                    <div className="flex-1">
                                        <p className={`text-[15px] font-amiri font-bold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{ev.t}</p>
                                        <p className={`text-[10px] uppercase ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>{ev.d.gregorian.date}</p>
                                    </div>
                                    <TargetIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-200' : 'text-white/10'}`} />
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}
