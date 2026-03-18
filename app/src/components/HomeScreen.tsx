import { useState, useEffect, useRef, useMemo } from 'react';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { getNextPrayer, getIftarCountdown, getHijriDate, getRamadanDay } from '../services/prayerService';
import { getDailyVerse } from '../services/quranService';
import {
    BookIcon, HandsIcon, BeadsIcon, CalendarIcon, CompassIcon,
    MoonIcon, HadithIcon, CalculatorIcon, ZapIcon, LanternIcon,
    MapPinIcon, FlameIcon, CheckIcon, SparkleIcon
} from './Icons';
import { useTheme } from './ThemeContext';
import { getDailyChallenge, getRewardsState, isChallengeCompletedToday } from '../services/rewardsStore';
import { LocationSelector } from './LocationSelector';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toPng } from 'html-to-image';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import { logInteraction } from '../services/activityLogStore';

interface HomeScreenProps {
    onNavigate: (screen: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
    const { theme } = useTheme();
    const { prayerData, loading, error, city, locationName, hijriAdj } = usePrayerTimes();
    const [iftarCountdown, setIftarCountdown] = useState({ h: 0, m: 0, s: 0 });
    const isRamadan = prayerData?.hijriMonthEn === "Ramadan";
    const fastingDay = getRamadanDay(prayerData);

    const prayers = prayerData?.prayers ?? [];
    const nextPrayer = prayers.length > 0 ? getNextPrayer(prayers) : null;
    const progress = nextPrayer?.progress ?? 0;

    const dailyChallenge = getDailyChallenge();
    const [challengeCompleted, setChallengeCompleted] = useState(() => isChallengeCompletedToday());
    const [rewardsState] = useState(() => getRewardsState());
    const [showLocationSelector, setShowLocationSelector] = useState(false);
    const [showHadithTranslation, setShowHadithTranslation] = useState(false);
    const [cardSlide, setCardSlide] = useState(0); // 0 = verse, 1 = hadith
    const touchStartX = useRef(0);
    const dailyVerse = getDailyVerse();

    const [isSharingHadith, setIsSharingHadith] = useState(false);
    const [savedHadithIndex, setSavedHadithIndex] = useState<number | null>(() => {
        const saved = localStorage.getItem('saved_hadith_index');
        return saved ? parseInt(saved) : null;
    });

    const [appBgImage, setAppBgImage] = useState(() => localStorage.getItem('app_bg_image') || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1080&auto=format&fit=crop');

    const [gender, setGender] = useState(() => localStorage.getItem('user_gender') || 'male');

    useEffect(() => {
        const handleGenderChange = () => {
            setGender(localStorage.getItem('user_gender') || 'male');
        };
        window.addEventListener('user:gender-changed', handleGenderChange);
        return () => window.removeEventListener('user:gender-changed', handleGenderChange);
    }, []);

    useEffect(() => {
        const handleBgChange = () => {
            setAppBgImage(localStorage.getItem('app_bg_image') || 'none');
        };
        window.addEventListener('app:bg-changed', handleBgChange);
        return () => window.removeEventListener('app:bg-changed', handleBgChange);
    }, []);

    // Local Hijri display logic that follows the adjustment
    const adjustedHijriStr = useMemo(() => {
        const toLatinNum = (str: string) => {
            const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            return str.replace(/[٠-٩]/g, (d) => arabicNumbers.indexOf(d).toString());
        };
        try {
            const date = new Date();
            if (hijriAdj !== 0) {
                date.setDate(date.getDate() + hijriAdj);
            }
            const formatted = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(date);
            return toLatinNum(formatted);
        } catch (e) {
            return getHijriDate(prayerData);
        }
    }, [hijriAdj, prayerData]);

    // Static daily hadith (rotates by day of week)
    const dailyHadiths = [
        { arabic: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى', english: 'Actions are but by intentions, and every man shall have only that which he intended.', source: 'البخاري ومسلم' },
        { arabic: 'مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ', english: 'Whoever believes in Allah and the Last Day, let him speak good or remain silent.', source: 'البخاري ومسلم' },
        { arabic: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', english: 'None of you truly believes until he loves for his brother what he loves for himself.', source: 'البخاري ومسلم' },
        { arabic: 'الدِّينُ النَّصِيحَةُ', english: 'Religion is sincerity (and well-wishing).', source: 'مسلم' },
        { arabic: 'مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ طَرِيقًا إِلَى الْجَنَّةِ', english: 'Whoever takes a path in search of knowledge, Allah will make easy for him a path to Paradise.', source: 'مسلم' },
        { arabic: 'خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ', english: 'The best of you are those who learn the Quran and teach it.', source: 'البخاري' },
        { arabic: 'تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ', english: 'Your smile in the face of your brother is charity.', source: 'الترمذي' },
    ];
    const todayHadithIndex = new Date().getDay() % dailyHadiths.length;
    const todayHadith = dailyHadiths[todayHadithIndex];

    const handleCopyHadith = async () => {
        const text = `« ${todayHadith.arabic} »\n\nرواه ${todayHadith.source}\n\n(تم النسخ من تطبيق Sirat 🌙)`;
        await Clipboard.write({ string: text });
        Haptics.notification({ type: NotificationType.Success });
        logInteraction({
            type: 'home_copy_daily_hadith',
            category: 'hadith',
            title: 'نسخ حديث اليوم',
            details: todayHadith.source,
            meta: { hadithIndex: todayHadithIndex },
        });
    };

    const handleShareHadith = async () => {
        setIsSharingHadith(true);
        try {
            const cardElement = document.getElementById('share-card-hadith');
            if (!cardElement) return;

            const dataUrl = await toPng(cardElement, { cacheBust: true, quality: 0.95 });
            const base64Data = dataUrl.split(',')[1];
            const fileName = `hadith_${todayHadithIndex}.png`;

            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache
            });

            await Share.share({
                title: 'حديث اليوم',
                url: savedFile.uri,
                dialogTitle: 'مشاركة الحديث'
            });
        } catch (error) {
            console.error('Error sharing:', error);
            const text = `« ${todayHadith.arabic} »\n\nرواه ${todayHadith.source}\n\n(تمت المشاركة عبر تطبيق Sirat 🌙)`;
            await Share.share({
                title: 'حديث اليوم',
                text: text,
                dialogTitle: 'مشاركة الحديث'
            });
        } finally {
            setIsSharingHadith(false);
        }
        logInteraction({
            type: 'home_share_daily_hadith',
            category: 'hadith',
            title: 'مشاركة حديث اليوم',
            details: todayHadith.source,
            meta: { hadithIndex: todayHadithIndex },
        });
    };

    const handleToggleSaveHadith = () => {
        if (savedHadithIndex === todayHadithIndex) {
            setSavedHadithIndex(null);
            localStorage.removeItem('saved_hadith_index');
            logInteraction({
                type: 'home_unsave_daily_hadith',
                category: 'hadith',
                title: 'إزالة حفظ حديث اليوم',
                details: todayHadith.source,
                meta: { hadithIndex: todayHadithIndex },
            });
        } else {
            setSavedHadithIndex(todayHadithIndex);
            localStorage.setItem('saved_hadith_index', todayHadithIndex.toString());
            logInteraction({
                type: 'home_save_daily_hadith',
                category: 'hadith',
                title: 'حفظ حديث اليوم',
                details: todayHadith.source,
                meta: { hadithIndex: todayHadithIndex },
            });
        }
        Haptics.impact({ style: ImpactStyle.Light });
    };

    useEffect(() => {
        if (prayers.length === 0) return;
        const update = () => {
            const countdown = getIftarCountdown(prayers);
            if (countdown) setIftarCountdown(countdown);
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [prayers]);

    const isDark = theme !== 'light';

    return (
        <div className={`h-full overflow-y-auto hide-scrollbar pb-28 transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'} ${appBgImage === 'none' ? (isDark ? 'islamic-pattern-dark' : 'islamic-pattern') : ''}`}>

            {/* ── Header ── */}
            <div className="relative px-5 pt-5 pb-3" dir="rtl">
                <div className="flex items-center justify-between">
                    {/* Location */}
                    <button
                        onClick={() => setShowLocationSelector(true)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all active:scale-95 border ${isDark
                            ? 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.07]'
                            : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                            }`}
                    >
                        <MapPinIcon className="w-4 h-4 text-gold-500 flex-shrink-0" />
                        <div className="text-right">
                            <p className={`text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>الموقع</p>
                            <p className={`text-[12px] font-bold leading-none ${isDark ? 'text-white/70' : 'text-slate-700'}`}>{locationName || 'جاري التحديد...'}</p>
                        </div>
                    </button>

                    {/* Hijri Date center */}
                    <button
                        onClick={() => onNavigate('calendar')}
                        className="text-center active:scale-95 transition-all"
                    >
                        <p className={`text-[15px] font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-slate-800'}`}>{adjustedHijriStr}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-slate-400'}`}>التاريخ الهجري</p>
                    </button>

                    {/* Profile button */}
                    <button
                        onClick={() => onNavigate('profile')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-2xl active:scale-95 transition-all border ${isDark
                            ? 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.07]'
                            : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                            }`}
                    >
                        <div className="text-right">
                            <p className={`text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>ملفي</p>
                            <p className={`text-[12px] font-bold leading-none max-w-[60px] truncate ${isDark ? 'text-white/70' : 'text-slate-700'}`}>{rewardsState.userName}</p>
                        </div>
                        <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-gold-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-gold-500/30">
                            <span className="text-[13px] font-bold text-white">{rewardsState.userName.charAt(0)}</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Hero Card: Next Prayer ── */}
            <div className="px-5 mb-5">
                <button
                    onClick={() => {
                        const prayerList = document.getElementById('prayer-times-list');
                        if (prayerList) {
                            prayerList.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            onNavigate('calendar');
                        }
                    }}
                    className={`w-full text-right relative rounded-[2rem] overflow-hidden transition-all duration-500 active:scale-[0.98] ${isDark
                        ? 'bg-gradient-to-br from-[#111e35] via-[#0f1a2e] to-[#0a1220] border border-white/[0.06] shadow-2xl shadow-black/50'
                        : 'bg-white border border-slate-100/80 shadow-[0_8px_40px_rgba(0,0,0,0.06)]'
                        }`}>
                    {/* Decorative glows */}
                    <div className={`absolute top-0 right-0 w-56 h-56 rounded-full blur-[90px] pointer-events-none ${isDark ? 'bg-gold-500/8' : 'bg-gold-300/15'}`} />
                    <div className={`absolute bottom-0 left-0 w-40 h-40 rounded-full blur-[70px] pointer-events-none ${isDark ? 'bg-blue-500/5' : 'bg-blue-100/30'}`} />

                    {/* Subtle top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />

                    <div className="relative p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-10">
                                <div className={`w-8 h-8 border-2 rounded-full animate-spin ${isDark ? 'border-gold-400/20 border-t-gold-400' : 'border-gold-300/30 border-t-gold-500'}`} />
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <p className="text-[13px] text-red-400/80">{error}</p>
                            </div>
                        ) : nextPrayer ? (
                            <>
                                {/* Label */}
                                <p className={`text-[10px] font-bold uppercase tracking-[3px] mb-3 ${isDark ? 'text-gold-400/50' : 'text-gold-600/60'}`}>الصلاة القادمة</p>

                                {/* Prayer name + time */}
                                <div className="flex items-end justify-between mb-5" dir="rtl">
                                    <h2 className={`text-[42px] font-amiri font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {nextPrayer.prayer.nameAr}
                                    </h2>
                                    <div className={`flex flex-col items-end`}>
                                        <span className={`text-[32px] font-amiri font-bold leading-none ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>
                                            {nextPrayer.prayer.time}
                                        </span>
                                        <span className={`text-[11px] font-bold mt-1 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                            متبقي {nextPrayer.remaining}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className={`h-[6px] rounded-full overflow-hidden ${isDark ? 'bg-white/[0.05]' : 'bg-slate-100'}`}>
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                                        style={{
                                            width: `${progress}%`,
                                            background: isDark
                                                ? 'linear-gradient(90deg, #d4a520, #f5c842)'
                                                : 'linear-gradient(90deg, #c49010, #e8b830)',
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                    </div>
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className={`text-[10px] font-bold ${isDark ? 'text-white/20' : 'text-slate-300'}`}>0%</span>
                                    <span className={`text-[10px] font-bold ${isDark ? 'text-gold-400/60' : 'text-gold-600/70'}`}>{Math.round(progress)}%</span>
                                </div>

                                {/* Ramadan Iftar countdown */}
                                {isRamadan && (
                                    <div className={`mt-5 pt-5 border-t ${isDark ? 'border-white/[0.05]' : 'border-slate-100'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <p className={`text-[10px] font-bold uppercase tracking-[2px] ${isDark ? 'text-gold-400/50' : 'text-gold-600/60'}`}>متبقي على الإفطار</p>
                                            <LanternIcon className="w-4 h-4 text-gold-500/50 animate-float" />
                                        </div>
                                        <div className="flex items-center justify-center gap-3">
                                            {[
                                                { val: iftarCountdown.h, label: 'ساعة' },
                                                { val: iftarCountdown.m, label: 'دقيقة' },
                                                { val: iftarCountdown.s, label: 'ثانية' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex flex-col items-center flex-1">
                                                    <div className={`w-full py-3 rounded-2xl flex items-center justify-center ${isDark ? 'bg-black/30 border border-white/[0.05]' : 'bg-slate-50 border border-slate-100'}`}>
                                                        <span className={`text-2xl font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-slate-800'}`}>{String(item.val).padStart(2, '0')}</span>
                                                    </div>
                                                    <span className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-slate-400'}`}>{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                </button>
            </div>

            {/* ── XP / Streak Banner ── */}
            <div className="px-5 mb-5" dir="rtl">
                <div className={`rounded-2xl px-5 py-3.5 flex items-center justify-between border ${isDark
                    ? 'bg-gradient-to-r from-gold-500/[0.07] to-amber-500/[0.04] border-gold-400/[0.12]'
                    : 'bg-gradient-to-r from-gold-50 to-amber-50 border-gold-100'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-gold-400/10' : 'bg-gold-100'}`}>
                            <SparkleIcon className="w-4 h-4 text-gold-500" />
                        </div>
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-white/25' : 'text-slate-400'}`}>إجمالي النقاط</p>
                            <p className={`text-[18px] font-amiri font-bold leading-none ${isDark ? 'text-gold-300' : 'text-gold-700'}`}>{rewardsState.totalXP} <span className={`text-[11px] ${isDark ? 'text-gold-400/50' : 'text-gold-500/70'}`}>XP</span></p>
                        </div>
                    </div>
                    <div className={`w-px h-10 ${isDark ? 'bg-white/[0.06]' : 'bg-gold-100'}`} />
                    <div className="flex items-center gap-3">
                        <div>
                            <p className={`text-[10px] font-bold uppercase tracking-widest text-left ${isDark ? 'text-white/25' : 'text-slate-400'}`}>الأيام المتتالية</p>
                            <p className={`text-[18px] font-amiri font-bold leading-none text-left ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{rewardsState.currentStreak} <span className={`text-[11px] ${isDark ? 'text-orange-400/50' : 'text-orange-400/70'}`}>يوم</span></p>
                        </div>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-400/10' : 'bg-orange-50'}`}>
                            <FlameIcon className="w-4 h-4 text-orange-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Daily Challenge ── */}
            <div className="px-5 mb-5" dir="rtl">
                <div className={`rounded-3xl p-5 border relative overflow-hidden transition-all ${challengeCompleted
                    ? isDark ? 'bg-emerald-500/[0.07] border-emerald-400/20' : 'bg-emerald-50 border-emerald-100'
                    : isDark ? 'bg-gradient-to-br from-gold-400/[0.06] to-transparent border-gold-400/[0.15]' : 'bg-white border-gold-100 shadow-sm'
                    }`}>
                    {!challengeCompleted && (
                        <div className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-[60px] pointer-events-none ${isDark ? 'bg-gold-400/8' : 'bg-gold-200/30'}`} />
                    )}

                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${challengeCompleted
                                ? isDark ? 'bg-emerald-400/15' : 'bg-emerald-100'
                                : isDark ? 'bg-gold-400/15' : 'bg-gold-100'
                                }`}>
                                {challengeCompleted
                                    ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                    : <ZapIcon className="w-3.5 h-3.5 text-gold-500" />
                                }
                            </div>
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${challengeCompleted
                                ? isDark ? 'text-emerald-400/70' : 'text-emerald-600'
                                : isDark ? 'text-gold-400/60' : 'text-slate-400'
                                }`}>
                                {challengeCompleted ? 'أحسنت! تم الإنجاز' : 'تحدي اليوم'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {rewardsState.currentStreak > 0 && (
                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${isDark ? 'bg-orange-400/10 border-orange-400/20' : 'bg-orange-50 border-orange-100'}`}>
                                    <FlameIcon className="w-3 h-3 text-orange-500" />
                                    <span className={`text-[10px] font-bold ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>{rewardsState.currentStreak}</span>
                                </div>
                            )}
                            {dailyChallenge && (
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${isDark ? 'bg-gold-400/10 text-gold-300/60 border-gold-400/15' : 'bg-gold-50 text-gold-600 border-gold-100'}`}>
                                    {dailyChallenge.category}
                                </span>
                            )}
                        </div>
                    </div>

                    {dailyChallenge && (
                        <p className={`text-[16px] leading-[1.7] font-amiri font-bold mb-4 ${challengeCompleted
                            ? isDark ? 'text-white/25 line-through' : 'text-slate-400 line-through'
                            : isDark ? 'text-white/80' : 'text-slate-700'
                            }`}>
                            {dailyChallenge.text}
                        </p>
                    )}

                    <button
                        onClick={() => {
                            setChallengeCompleted(isChallengeCompletedToday());
                            onNavigate(`deeds:${dailyChallenge?.id ?? ''}`);
                        }}
                        className={`w-full py-3 rounded-2xl text-[13px] font-amiri font-bold active:scale-[0.98] transition-all ${challengeCompleted
                            ? isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20' : 'bg-emerald-100 text-emerald-700'
                            : isDark ? 'bg-gold-400/15 text-gold-300 border border-gold-400/25 hover:bg-gold-400/20' : 'bg-gold-500 text-white shadow-md shadow-gold-500/20 hover:bg-gold-600'
                            }`}
                    >
                        {challengeCompleted ? 'عرض سجل الحسنات' : 'سجل إنجازك'}
                    </button>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <div className="px-5 mb-5" dir="rtl">
                <div className="flex items-center justify-between mb-3 px-1">
                    <p className={`text-[12px] font-bold uppercase tracking-wider ${isDark ? 'text-white/20' : 'text-slate-400'}`}>الوصول السريع</p>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    {[
                        { img: '/assets/quick-actions/quran.png', label: 'المصحف الشريف', screen: 'quran' },
                        { img: '/assets/quick-actions/hadith.png', label: 'الحديث', screen: 'hadith' },
                        { img: '/assets/quick-actions/duas.png', label: 'الأدعية', screen: 'duas' },
                        { img: '/assets/quick-actions/adhkar.png', label: 'الأذكار', screen: 'adhkar' },
                        { img: '/assets/quick-actions/tasbih.png', label: 'التسبيح', screen: 'tasbih' },
                        { img: '/assets/quick-actions/calendar.png', label: 'التقويم', screen: 'calendar' },
                        { img: '/assets/quick-actions/qibla.png', label: 'القبلة', screen: 'qibla' },
                        { img: '/assets/quick-actions/zakat.png', label: 'الزكاة', screen: 'zakat' },
                    ].map((item) => (
                        <button
                            key={item.screen}
                            onClick={() => onNavigate(item.screen)}
                            className={`flex flex-col items-center gap-2 py-4 rounded-3xl transition-all active:scale-95 border ${isDark
                                ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                                : 'bg-white border-slate-100 shadow-sm hover:shadow-md'
                                }`}
                        >
                            <div className="w-14 h-14 flex items-center justify-center transition-all">
                                <img src={item.img} className="w-12 h-12 object-contain drop-shadow-md" alt={item.label} />
                            </div>
                            <span className={`text-[10px] font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Women's Section Banner (Visible only for females) */}
            {gender === 'female' && (
                <div className="px-5 mb-5" dir="rtl">
                    <button
                        onClick={() => onNavigate('women')}
                        className={`w-full p-5 rounded-[2rem] flex items-center justify-between border relative overflow-hidden group ${isDark
                            ? 'bg-gradient-to-br from-pink-500/[0.1] to-purple-500/[0.05] border-pink-400/[0.15]'
                            : 'bg-gradient-to-br from-pink-50 to-purple-50 border-pink-100 shadow-sm'}`}
                    >
                        <div className="relative z-10 flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDark ? 'bg-pink-400/20 text-pink-300' : 'bg-pink-100 text-pink-600'}`}>
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div className="text-right">
                                <h3 className={`font-bold font-amiri text-lg ${isDark ? 'text-pink-100' : 'text-pink-900'}`}>ركن المرأة المسلمة</h3>
                                <p className={`text-xs mt-1 ${isDark ? 'text-pink-200/60' : 'text-pink-700/60'}`}>أحاديث، إرشادات، وأحكام شرعية</p>
                            </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform group-active:-translate-x-1 ${isDark ? 'bg-pink-400/10 text-pink-300' : 'bg-white text-pink-500 shadow-sm'}`}>
                            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </div>
                    </button>
                </div>
            )}

            {/* Hidden Share Card for Hadith */}
            <div className="overflow-hidden h-0 w-0 absolute pointer-events-none">
                <div id="share-card-hadith" className="w-[1080px] h-[1080px] bg-gradient-to-b from-[#0b1929] to-[#0a1525] flex flex-col items-center justify-center p-16 text-center relative" dir="rtl">
                    <div className="absolute inset-0 border-[20px] border-gold-500/20 m-8 rounded-[40px]" />
                    <div className="absolute inset-0 border-2 border-gold-500/40 m-12 rounded-[30px]" />

                    <svg className="w-24 h-24 text-gold-500 mb-12 opacity-80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>

                    <p className="text-[50px] font-scheherazade text-white leading-relaxed mb-16 px-12" style={{ fontFamily: "'Scheherazade New', serif" }}>
                        « {todayHadith.arabic} »
                    </p>

                    <div className="flex flex-col items-center gap-4">
                        <p className="text-[32px] font-amiri text-gold-400" style={{ fontFamily: "'Amiri', serif" }}>رواه {todayHadith.source}</p>
                        <div className="w-32 h-1 bg-gold-500/30 rounded-full my-4" />
                        <p className="text-[24px] font-amiri text-white/60" style={{ fontFamily: "'Amiri', serif" }}>تمت المشاركة عبر تطبيق Sirat 🌙</p>
                    </div>
                </div>
            </div>

            {/* ── Daily Verse / Hadith — Swipeable Card ── */}
            <div className="px-5 mb-5" dir="rtl">
                <div
                    className={`rounded-3xl border relative overflow-hidden ${isDark ? 'bg-white/[0.015] border-gold-400/[0.06]' : 'bg-white border-slate-100 shadow-sm'}`}
                    onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                        const diff = touchStartX.current - e.changedTouches[0].clientX;
                        if (Math.abs(diff) > 40) setCardSlide(diff > 0 ? 1 : 0);
                    }}
                >
                    {/* Top accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-[1px] z-10 ${isDark ? 'bg-gradient-to-r from-transparent via-gold-400/20 to-transparent' : 'bg-gradient-to-r from-transparent via-gold-300/30 to-transparent'}`} />

                    {/* Sliding track — side-by-side cards */}
                    <div
                        className="flex transition-transform duration-500 ease-out"
                        style={{
                            width: '200%',
                            transform: `translateX(${cardSlide * 50}%)`,
                        }}
                    >
                        {/* ── Card 0: Daily Verse (appears on right when slide is 0) ── */}
                        <div className="w-1/2 flex-shrink-0 p-5 cursor-pointer active:bg-black/5 transition-all" onClick={() => onNavigate(`quran:${dailyVerse.surahId}:${dailyVerse.page}:${dailyVerse.number}`)}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-1 h-5 rounded-full ${isDark ? 'bg-gold-400/40' : 'bg-gold-400'}`} />
                                    <p className={`text-[10px] font-bold uppercase tracking-[3px] ${isDark ? 'text-gold-400/40' : 'text-gold-600/70'}`}>آية اليوم</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setCardSlide(1); }} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 z-20 ${isDark ? 'border-white/[0.08] text-white/25 hover:text-white/50' : 'border-slate-100 text-slate-300 hover:text-slate-500'}`}>
                                    الحديث ←
                                </button>
                            </div>
                            <p className={`text-[18px] font-scheherazade leading-[1.9] text-right mb-4 ${isDark ? 'text-white/75' : 'text-slate-700'}`}>
                                {dailyVerse.text}
                            </p>
                            <p className={`text-[10px] font-bold ${isDark ? 'text-gold-400/30' : 'text-gold-600/60'}`}>
                                سورة {dailyVerse.surahName} — آية {dailyVerse.number}
                            </p>
                        </div>

                        {/* ── Card 1: Daily Hadith (appears on left when slide is 1) ── */}
                        <div className="w-1/2 flex-shrink-0 p-5">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setCardSlide(0)} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 ${isDark ? 'border-white/[0.08] text-white/25 hover:text-white/50' : 'border-slate-100 text-slate-300 hover:text-slate-500'}`}>
                                    → الآية
                                </button>
                                <div className="flex items-center gap-2">
                                    <p className={`text-[10px] font-bold uppercase tracking-[3px] ${isDark ? 'text-gold-400/40' : 'text-gold-600/70'}`}>حديث اليوم</p>
                                    <div className={`w-1 h-5 rounded-full ${isDark ? 'bg-gold-400/40' : 'bg-gold-400'}`} />
                                </div>
                            </div>
                            <p className={`text-[19px] font-scheherazade leading-[1.9] text-right mb-3 ${isDark ? 'text-white/80' : 'text-slate-800'}`}>
                                {todayHadith.arabic}
                            </p>
                            {showHadithTranslation && (
                                <p className={`text-[13px] leading-relaxed italic border-t pt-3 mb-3 animate-fade-in ${isDark ? 'text-white/40 border-white/[0.05]' : 'text-slate-400 border-slate-100'}`}>
                                    {todayHadith.english}
                                </p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                                <p className={`text-[10px] font-bold ${isDark ? 'text-gold-400/30' : 'text-gold-600/60'}`}>رواه {todayHadith.source}</p>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleCopyHadith} title="نسخ" className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${isDark ? 'border-white/5 text-slate-400 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </button>
                                    <button onClick={handleShareHadith} disabled={isSharingHadith} title="مشاركة" className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${isDark ? 'border-white/5 text-slate-400 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} ${isSharingHadith ? 'opacity-50' : ''}`}>
                                        {isSharingHadith ? (
                                            <div className="w-3 h-3 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                        )}
                                    </button>
                                    <button onClick={handleToggleSaveHadith} title="حفظ" className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${savedHadithIndex === todayHadithIndex ? 'bg-gold-500 border-gold-500 text-black' : isDark ? 'border-white/5 text-slate-400 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                        <svg className="w-3 h-3" fill={savedHadithIndex === todayHadithIndex ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => setShowHadithTranslation(v => !v)}
                                        className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 ${showHadithTranslation ? isDark ? 'bg-gold-400/15 border-gold-400/30 text-gold-300' : 'bg-gold-100 border-gold-200 text-gold-700' : isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/30' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            {showHadithTranslation
                                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                                        </svg>
                                        {showHadithTranslation ? 'إخفاء' : 'الترجمة'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dot indicators */}
                    <div className="flex justify-center gap-2 pb-4 -mt-1">
                        {[0, 1].map(i => (
                            <button key={i} onClick={() => setCardSlide(i)}
                                className={`rounded-full transition-all duration-300 ${cardSlide === i
                                    ? isDark ? 'w-5 h-1.5 bg-gold-400' : 'w-5 h-1.5 bg-gold-500'
                                    : isDark ? 'w-1.5 h-1.5 bg-white/15' : 'w-1.5 h-1.5 bg-slate-200'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Prayer Times List ── */}
            <div id="prayer-times-list" className="px-5 pb-4" dir="rtl">
                <div className="flex items-center justify-between mb-3 px-1">
                    <p className={`text-[12px] font-bold uppercase tracking-wider ${isDark ? 'text-white/20' : 'text-slate-400'}`}>مواقيت الصلاة</p>
                </div>
                <div className={`rounded-3xl overflow-hidden border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-slate-100 shadow-sm'}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className={`w-5 h-5 border-2 rounded-full animate-spin ${isDark ? 'border-gold-400/20 border-t-gold-400' : 'border-gold-300/30 border-t-gold-500'}`} />
                        </div>
                    ) : prayers.map((prayer, index) => {
                        const isNext = nextPrayer?.prayer.nameAr === prayer.nameAr;
                        return (
                            <div
                                key={prayer.name}
                                className={`flex items-center justify-between px-5 py-4 transition-colors ${index !== prayers.length - 1
                                    ? isDark ? 'border-b border-white/[0.03]' : 'border-b border-slate-50'
                                    : ''
                                    } ${isNext ? isDark ? 'bg-gold-400/[0.04]' : 'bg-gold-50/60' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    {isNext ? (
                                        <div className="w-2 h-2 rounded-full bg-gold-500 shadow-[0_0_8px_rgba(212,165,40,0.6)] animate-pulse flex-shrink-0" />
                                    ) : (
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDark ? 'bg-white/[0.06]' : 'bg-slate-200'}`} />
                                    )}
                                    <span className={`text-[16px] font-amiri font-bold ${isNext
                                        ? isDark ? 'text-gold-300' : 'text-slate-900'
                                        : isDark ? 'text-white/35' : 'text-slate-400'
                                        }`}>
                                        {prayer.nameAr}
                                    </span>
                                </div>
                                <span className={`text-[16px] font-amiri font-bold tabular-nums ${isNext
                                    ? isDark ? 'text-gold-300' : 'text-gold-600'
                                    : isDark ? 'text-white/25' : 'text-slate-300'
                                    }`}>
                                    {prayer.time}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="h-4" />

            {showLocationSelector && (
                <LocationSelector onClose={() => setShowLocationSelector(false)} />
            )}
        </div>
    );
}
