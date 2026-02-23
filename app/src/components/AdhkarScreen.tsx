import { useState, useMemo } from 'react';
import { morningAdhkar, eveningAdhkar, afterPrayerAdhkar, sleepAdhkar } from '../data/adhkar';
import { ChevronLeftIcon, SunIcon, SunsetIcon, MoonIcon, BeadsIcon, CheckIcon, ShareIcon, CopyIcon } from './Icons';
import type { Dhikr } from '../data/adhkar';
import { useTheme } from './ThemeContext';

interface AdhkarScreenProps {
    onBack: () => void;
}

type Tab = 'morning' | 'evening' | 'afterPrayer' | 'sleep';

export function AdhkarScreen({ onBack }: AdhkarScreenProps) {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState<Tab>('morning');
    const [completedCounts, setCompletedCounts] = useState<Record<number, number>>({});

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'morning', label: 'الصباح', icon: <SunIcon className="w-4 h-4" /> },
        { id: 'evening', label: 'المساء', icon: <SunsetIcon className="w-4 h-4" /> },
        { id: 'afterPrayer', label: 'بعد الصلاة', icon: <BeadsIcon className="w-4 h-4" /> },
        { id: 'sleep', label: 'النوم', icon: <MoonIcon className="w-4 h-4" /> },
    ];

    const adhkar = useMemo((): Dhikr[] => {
        switch (activeTab) {
            case 'morning': return morningAdhkar;
            case 'evening': return eveningAdhkar;
            case 'afterPrayer': return afterPrayerAdhkar;
            case 'sleep': return sleepAdhkar;
            default: return morningAdhkar;
        }
    }, [activeTab]);

    const handleCount = (dhikr: Dhikr) => {
        const current = completedCounts[dhikr.id] || 0;
        if (current < dhikr.count) {
            // Haptic/Sound feedback logic could go here
            setCompletedCounts(prev => ({ ...prev, [dhikr.id]: current + 1 }));
        }
    };

    const resetCount = (id: number) => {
        setCompletedCounts(prev => ({ ...prev, [id]: 0 }));
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Add toast feedback if needed
    };

    const handleShare = (text: string) => {
        if (navigator.share) {
            navigator.share({ title: 'ذكر من أذكار المسلم', text }).catch(() => { });
        }
    };

    const totalInTab = adhkar.length;
    const completedInTab = adhkar.filter(d => (completedCounts[d.id] || 0) >= d.count).length;
    const progressPercent = totalInTab > 0 ? (completedInTab / totalInTab) * 100 : 0;

    const isDark = theme !== 'light';

    return (
        <div className={`h-full transition-all duration-500 overflow-y-auto hide-scrollbar pb-32 ${isDark ? 'bg-[#080b14] text-white' : 'bg-[#f4f7fe] text-slate-800'}`}>
            {/* ── Header ── */}
            <div className={`px-5 pt-5 pb-4 sticky top-0 backdrop-blur-xl z-20 shadow-sm border-b transition-all ${isDark ? 'bg-[#080b14]/90 border-white/5' : 'bg-white/90 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onBack} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-white border border-slate-100 text-slate-600'}`}>
                        <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="text-center">
                        <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>أذكار المسلم</h1>
                        <p className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>Muslim Fortress</p>
                    </div>
                    <button onClick={() => setCompletedCounts({})} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all hover:bg-red-500/10 ${isDark ? 'text-white/40' : 'text-slate-300'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex gap-1 rounded-2xl p-1 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100/50 border-slate-200/50'}`}>
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col items-center gap-1 flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all ${activeTab === tab.id
                                ? (isDark ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'bg-gold-500 text-white shadow-md shadow-gold-500/20')
                                : (isDark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600')
                                }`}>
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Progress Bar */}
                <div className="mt-5 px-1">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-slate-400'}`}>إحصائيات القسم</span>
                        </div>
                        <span className={`text-[11px] font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>تم إنجاز {completedInTab} من {totalInTab}</span>
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-700 relative overflow-hidden"
                            style={{ width: `${progressPercent}%` }}>
                            <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="px-5 space-y-5 mt-8">
                {adhkar.map((dhikr, index) => {
                    const current = completedCounts[dhikr.id] || 0;
                    const isComplete = current >= dhikr.count;
                    const percent = (current / dhikr.count) * 100;

                    return (
                        <div key={dhikr.id}
                            className={`group rounded-[2.5rem] p-6 border transition-all duration-300 relative overflow-hidden ${isComplete
                                ? (isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100')
                                : (isDark ? 'bg-white/[0.03] border-white/10 hover:border-gold-500/30' : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-gold-300')
                                }`}
                            style={{ animationDelay: `${index * 40}ms` }}>

                            {/* Decorative ID */}
                            <div className={`absolute top-4 right-6 text-[40px] font-black pointer-events-none opacity-[0.03] ${isDark ? 'text-white' : 'text-black'}`}>
                                {index + 1}
                            </div>

                            <div className="relative z-10">
                                <p className={`text-[21px] font-scheherazade leading-[1.8] text-right mb-6 ${isComplete ? (isDark ? 'text-white/40' : 'text-slate-400') : (isDark ? 'text-white' : 'text-slate-800')}`}>
                                    {dhikr.text}
                                </p>

                                <div className={`flex flex-col gap-5 pt-5 border-t ${isDark ? 'border-white/5' : 'border-slate-50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleCopy(dhikr.text)} className={`p-2 rounded-lg transition-all active:scale-90 ${isDark ? 'bg-white/5 text-white/30 hover:text-white/60' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`} title="نسخ">
                                                <CopyIcon className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => handleShare(dhikr.text)} className={`p-2 rounded-lg transition-all active:scale-90 ${isDark ? 'bg-white/5 text-white/30 hover:text-white/60' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`} title="مشاركة">
                                                <ShareIcon className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => resetCount(dhikr.id)} className={`p-2 rounded-lg transition-all active:scale-90 ${isDark ? 'bg-white/5 text-white/30 hover:text-red-400' : 'bg-slate-50 text-slate-400 hover:text-red-500'}`} title="إعادة">
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </button>
                                        </div>
                                        <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${isDark ? 'bg-gold-500/10 text-gold-400/80' : 'bg-gold-50 text-gold-600'}`}>{dhikr.reference}</span>
                                    </div>

                                    <button
                                        onClick={() => handleCount(dhikr)}
                                        disabled={isComplete}
                                        className={`w-full py-4 rounded-3xl font-amiri font-bold text-xl transition-all relative overflow-hidden active:scale-[0.98] ${isComplete
                                            ? (isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500 text-white')
                                            : (isDark ? 'bg-gold-500/10 text-gold-400 border border-gold-500/20' : 'bg-gold-500 text-white shadow-lg shadow-gold-500/20')
                                            }`}
                                    >
                                        {isComplete ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <CheckIcon className="w-5 h-5" />
                                                <span>تم الإتمام</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between px-6">
                                                <span className="opacity-40 text-sm">{dhikr.count}</span>
                                                <span className="text-2xl">{current}</span>
                                                <span className="opacity-0 w-4" /> {/* Spacer */}
                                            </div>
                                        )}

                                        {/* Counter Progress Overlay */}
                                        {!isComplete && (
                                            <div className="absolute left-0 top-0 bottom-0 bg-gold-500/10 transition-all duration-300 pointer-events-none"
                                                style={{ width: `${percent}%` }} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Celebration State */}
            {completedInTab === totalInTab && totalInTab > 0 && (
                <div className="flex flex-col items-center justify-center py-10 animate-bounce">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg mb-3">
                        <CheckIcon className="w-8 h-8" />
                    </div>
                    <p className={`font-amiri font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>بارك الله فيك، أتممت جميع الأذكار!</p>
                </div>
            )}

            <div className="h-10" />
        </div>
    );
}
