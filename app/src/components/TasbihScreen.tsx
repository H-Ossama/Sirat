import { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronLeftIcon, BeadsIcon, SparkleIcon, CheckIcon, RibbonIcon, PlusIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { tasbihs as staticTasbihs, type Tasbih } from '../data/tasbihs';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { completeDeed, getDailyChallenge, isChallengeCompletedToday, type Badge } from '../services/rewardsStore';
import { getDeedById } from '../data/challengeData';
import { logInteraction } from '../services/activityLogStore';

interface SavedTasbih extends Tasbih {
    target: number;
}

interface TasbihScreenProps {
    onBack: () => void;
}

type ConfirmType = 'reset_task' | 'reset_all' | null;

export function TasbihScreen({ onBack }: TasbihScreenProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';

    // State for individual counts
    const [allCounts, setAllCounts] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('tasbih_all_counts');
        return saved ? JSON.parse(saved) : {};
    });

    // Saved custom tasbihs
    const [savedTasbihs, setSavedTasbihs] = useState<SavedTasbih[]>(() => {
        const saved = localStorage.getItem('tasbih_saved_list');
        return saved ? JSON.parse(saved) : [];
    });

    const [selectedId, setSelectedId] = useState(() => {
        const saved = localStorage.getItem('last_selected_tasbih');
        return saved || staticTasbihs[1].id; 
    });

    const [customTitle, setCustomTitle] = useState(() => localStorage.getItem('tasbih_custom_title') || 'تسبيح مخصص');
    const [customTarget, setCustomTarget] = useState(() => Number(localStorage.getItem('tasbih_custom_target')) || 33);
    const [isConfiguringCustom, setIsConfiguringCustom] = useState(false);

    const [sessionCount, setSessionCount] = useState(0);
    const [target, setTarget] = useState(33);
    const [vibrate, setVibrate] = useState(true);
    const [isSuperDarkMode, setIsSuperDarkMode] = useState(false);
    const [confirmModal, setConfirmModal] = useState<ConfirmType>(null);
    const [showRewardModal, setShowRewardModal] = useState<{ xp: number; badges: Badge[] } | null>(null);

    const dailyChallenge = useMemo(() => getDailyChallenge(), []);
    const isCompletedAlready = useMemo(() => isChallengeCompletedToday(), [showRewardModal]);

    // Combined tasbihs list
    const allTasbihsList = useMemo(() => {
        return [...staticTasbihs, ...savedTasbihs];
    }, [savedTasbihs]);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem('tasbih_all_counts', JSON.stringify(allCounts));
    }, [allCounts]);

    useEffect(() => {
        localStorage.setItem('tasbih_saved_list', JSON.stringify(savedTasbihs));
    }, [savedTasbihs]);

    useEffect(() => {
        localStorage.setItem('last_selected_tasbih', selectedId);
    }, [selectedId]);

    useEffect(() => {
        localStorage.setItem('tasbih_custom_title', customTitle);
    }, [customTitle]);

    useEffect(() => {
        localStorage.setItem('tasbih_custom_target', customTarget.toString());
    }, [customTarget]);

    const currentLifetimeCount = allCounts[selectedId] || 0;
    const currentTasbih = useMemo((): Tasbih => {
        if (selectedId === 'custom') {
            return { id: 'custom', title: customTitle };
        }
        return allTasbihsList.find(t => t.id === selectedId) || staticTasbihs[1];
    }, [selectedId, customTitle, allTasbihsList]);

    // Update target when switching tasbih
    useEffect(() => {
        if (selectedId === 'custom') {
            setTarget(customTarget);
        } else {
            const saved = savedTasbihs.find(t => t.id === selectedId);
            if (saved) {
                setTarget(saved.target);
            } else if (target === 0) {
                setTarget(33);
            }
        }
    }, [selectedId, customTarget, savedTasbihs]);

    const saveCustomTasbih = () => {
        const newTasbih: SavedTasbih = {
            id: `saved_${Date.now()}`,
            title: customTitle,
            target: customTarget
        };
        setSavedTasbihs(prev => [...prev, newTasbih]);
        setSelectedId(newTasbih.id);
        setIsConfiguringCustom(false);
        triggerHaptic('success');
        logInteraction({
            type: 'tasbih_create_custom',
            category: 'tasbih',
            title: 'إنشاء تسبيح مخصص',
            details: `${customTitle} — الهدف ${customTarget}`,
            meta: { target: customTarget },
        });
    };

    const deleteSavedTasbih = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const targetTasbih = savedTasbihs.find(t => t.id === id);
        setSavedTasbihs(prev => prev.filter(t => t.id !== id));
        if (selectedId === id) setSelectedId(staticTasbihs[1].id);
        triggerHaptic('warning');
        logInteraction({
            type: 'tasbih_delete_custom',
            category: 'tasbih',
            title: 'حذف تسبيح مخصص',
            details: targetTasbih?.title || id,
        });
    };

    const triggerHaptic = useCallback(async (type: 'impact' | 'success' | 'warning' | 'selection') => {
        if (!vibrate) return;
        try {
            switch (type) {
                case 'impact':
                    // Light impact feels more like a physical button click
                    await Haptics.impact({ style: ImpactStyle.Light });
                    break;
                case 'success':
                    await Haptics.notification({ type: NotificationType.Success });
                    break;
                case 'warning':
                    await Haptics.notification({ type: NotificationType.Warning });
                    break;
                case 'selection':
                    await Haptics.selectionStart();
                    break;
            }
        } catch (e) {
            // Fallback for browser or if plugin fails
            if ('vibrate' in navigator) {
                if (type === 'impact') navigator.vibrate(15); // Very short for click
                else if (type === 'success') navigator.vibrate([40, 30, 40]);
                else if (type === 'warning') navigator.vibrate([100, 50, 100]);
                else if (type === 'selection') navigator.vibrate(10);
            }
        }
    }, [vibrate]);

    const handlePress = useCallback(() => {
        const nextSessionCount = sessionCount + 1;
        setAllCounts(prev => ({
            ...prev,
            [selectedId]: (prev[selectedId] || 0) + 1
        }));
        setSessionCount(nextSessionCount);

        const isCycleCompleted = target !== 0 && nextSessionCount % target === 0;

        if (nextSessionCount % 10 === 0) {
            logInteraction({
                type: 'tasbih_progress',
                category: 'tasbih',
                title: 'تقدم التسبيح',
                details: `${currentTasbih.title} — ${nextSessionCount}`,
                meta: { sessionCount: nextSessionCount, target },
            });
        }

        if (isCycleCompleted) {
            triggerHaptic('success');
            logInteraction({
                type: 'tasbih_cycle_completed',
                category: 'tasbih',
                title: 'إكمال دورة تسبيح',
                details: `${currentTasbih.title} — الهدف ${target}`,
                meta: { sessionCount: nextSessionCount, target },
            });
            
            // Integrate with rewards system
            const tasbihWithDeed = allTasbihsList.find(t => t.id === selectedId);
            const myDeedId = tasbihWithDeed?.deedId;

            // Also check if daily challenge is a general tasbih challenge (ID 18, 19, 20 are common)
            const isDailyRelevant = dailyChallenge?.id === 18 || dailyChallenge?.id === 6 || dailyChallenge?.id === 19 || dailyChallenge?.id === 20;

            if (myDeedId) {
                const deed = getDeedById(myDeedId);
                if (deed) {
                    const wasCompleted = isChallengeCompletedToday();
                    const res = completeDeed(myDeedId, deed.xp);
                    const isNewCompletion = myDeedId === dailyChallenge?.id && !wasCompleted;
                    
                    if (res.newBadges.length > 0 || isNewCompletion) {
                        setShowRewardModal({ xp: deed.xp, badges: res.newBadges });
                    }
                }
            } else if (isDailyRelevant && !isChallengeCompletedToday()) {
                // Award some XP for completing a cycle if it's generally tasbih day and not yet done
                const res = completeDeed(dailyChallenge!.id, 5); 
                setShowRewardModal({ xp: 5, badges: res.newBadges });
            }
        } else {
            triggerHaptic('impact');
        }
    }, [selectedId, sessionCount, target, triggerHaptic, dailyChallenge, currentTasbih.title]);

    const resetSession = () => {
        setSessionCount(0);
        triggerHaptic('warning');
        logInteraction({
            type: 'tasbih_reset_session',
            category: 'tasbih',
            title: 'تصفير العداد الحالي',
            details: currentTasbih.title,
        });
    };

    const confirmResetLifetime = () => {
        setAllCounts(prev => ({ ...prev, [selectedId]: 0 }));
        setConfirmModal(null);
        triggerHaptic('warning');
        logInteraction({
            type: 'tasbih_reset_lifetime',
            category: 'tasbih',
            title: 'تصفير الإجمالي',
            details: currentTasbih.title,
            meta: { selectedId },
        });
    };

    const confirmResetAll = () => {
        setAllCounts({});
        setSessionCount(0);
        setConfirmModal(null);
        triggerHaptic('warning');
        logInteraction({
            type: 'tasbih_reset_all',
            category: 'tasbih',
            title: 'تصفير كل عدادات التسبيح',
            details: 'تم مسح جميع العدادات',
        });
    };

    const cycleTarget = () => {
        const targets = [33, 99, 100, 0];
        const currentIndex = targets.indexOf(target);
        const nextIndex = (currentIndex + 1) % targets.length;
        setTarget(targets[nextIndex]);
        triggerHaptic('selection');
        logInteraction({
            type: 'tasbih_change_target',
            category: 'tasbih',
            title: 'تغيير هدف التسبيح',
            details: `${currentTasbih.title} — ${targets[nextIndex] === 0 ? 'مفتوح' : targets[nextIndex]}`,
            meta: { target: targets[nextIndex] },
        });
    };

    return (
        <div className={`h-full flex flex-col transition-all duration-500 pb-32 ${isDark ? 'bg-[#080b14] text-white' : 'bg-[#f4f7fe] text-slate-800'} ${isSuperDarkMode ? 'overflow-hidden' : 'overflow-y-auto hide-scrollbar'}`}>

            {/* ── Reward Modal ── */}
            {showRewardModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center px-6 transition-all animate-fade-in">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRewardModal(null)} />
                    <div className={`relative w-full max-w-sm rounded-[3rem] p-8 border shadow-2xl transition-all scale-100 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-100'}`}>
                        <div className={`w-24 h-24 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center relative ${isDark ? 'bg-gold-500/20 text-gold-500' : 'bg-gold-50 text-gold-500'}`}>
                            <SparkleIcon className="w-12 h-12 animate-pulse" />
                            <div className="absolute -top-2 -right-2 bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-en font-black text-sm shadow-xl shadow-green-500/20">
                                +{showRewardModal.xp}
                            </div>
                        </div>

                        <h3 className="text-3xl font-amiri font-bold text-center mb-2">طاعة مقبولة!</h3>
                        <p className={`text-center font-bold mb-8 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            لقد ربحت {showRewardModal.xp} نقطة تقرباً إلى الله.
                        </p>

                        {showRewardModal.badges.length > 0 && (
                            <div className="mb-8 space-y-4">
                                <p className={`text-center text-[10px] uppercase font-black tracking-widest ${isDark ? 'text-white/20' : 'text-slate-300'}`}>أوسمة جديدة مُكتسبة</p>
                                {showRewardModal.badges.map(badge => (
                                    <div key={badge.id} className={`p-4 rounded-2xl flex items-center gap-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${badge.gradient} text-white shadow-lg`}>
                                            <RibbonIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className={`font-amiri font-bold text-lg leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{badge.nameAr}</h4>
                                            <p className={`text-[11px] font-bold mt-1.5 opacity-40 uppercase tracking-widest ${isDark ? 'text-white' : 'text-slate-500'}`}>{badge.unlockConditionAr}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => setShowRewardModal(null)}
                            className="w-full py-5 rounded-[2rem] font-bold text-lg bg-gold-500 text-white shadow-xl shadow-gold-500/20 active:scale-95 transition-all"
                        >
                            تَقَبَّل الله
                        </button>
                    </div>
                </div>
            )}

            {/* ── Confirmation Modal ── */}
            {confirmModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center px-6 transition-all animate-fade-in">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmModal(null)} />
                    <div className={`relative w-full max-w-sm rounded-[3rem] p-8 border shadow-2xl transition-all scale-100 ${isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-100'}`}>
                        <div className={`w-20 h-20 rounded-[2rem] mx-auto mb-6 flex items-center justify-center ${isDark ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-500'}`}>
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-amiri font-bold text-center mb-3">تأكيد المسح</h3>
                        <p className={`text-center text-sm font-bold leading-relaxed mb-10 px-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                            {confirmModal === 'reset_task'
                                ? "هل أنت متأكد من تصفير العداد الكلي لهذا الذكر؟ لا يمكن التراجع عن هذا الإجراء."
                                : "هل أنت متأكد من مسح جميع عدادات التسبيح لكل الأذكار؟ سيتم مسح كل تقدمك."}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => confirmModal === 'reset_task' ? confirmResetLifetime() : confirmResetAll()}
                                className="w-full py-5 rounded-2xl font-bold text-base bg-red-600 text-white shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                            >
                                نعم، متأكد
                            </button>
                            <button
                                onClick={() => setConfirmModal(null)}
                                className={`w-full py-5 rounded-2xl font-bold text-base transition-all active:scale-95 ${isDark ? 'bg-white/5 text-white/50 hover:bg-white/10' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                تراجع
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Super Dark Mode Overlay ── */}
            {isSuperDarkMode && (
                <div
                    onClick={handlePress}
                    className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-between py-20 animate-fade-in"
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsSuperDarkMode(false); }}
                        className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center active:scale-90 transition-all border border-white/5"
                    >
                        <svg className="w-7 h-7 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.674a1 1 0 0 0 .707-.293l2.627-2.627A1 1 0 0 0 18 13.376V11a6 6 0 1 0-12 0v2.376a1 1 0 0 0 .293.707l2.627 2.627a1 1 0 0 0 .707.293zM10 21h4v1h-4v-1z" />
                        </svg>
                    </button>
                    <div className="text-center opacity-[0.03] pointer-events-none select-none">
                        <span className="text-[140px] font-en font-black">{sessionCount.toLocaleString('en-US')}</span>
                        <p className="font-scheherazade text-5xl mt-6">{currentTasbih.title}</p>
                    </div>
                    <p className="text-[12px] font-bold text-white/[0.05] tracking-[0.3em] uppercase">المس أي مكان للتسبيح • توفير الطاقة</p>
                </div>
            )}

            {/* ── Header ── */}
            <div className={`px-5 pt-4 pb-3 sticky top-0 z-20 backdrop-blur-xl border-b transition-all ${isDark ? 'bg-[#080b14]/80 border-white/5' : 'bg-white/80 border-slate-100'}`}>
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-white border border-slate-100 text-slate-600'}`}>
                        <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="text-center">
                        <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>تسبيح</h1>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setIsSuperDarkMode(true); triggerHaptic('selection'); logInteraction({ type: 'tasbih_super_dark_on', category: 'tasbih', title: 'تفعيل وضع التوفير', details: 'وضع التسبيح الداكن' }); }}
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all ${isSuperDarkMode ? 'bg-gold-500 text-white' : (isDark ? 'bg-white/5 border border-white/10 text-white/40' : 'bg-slate-100 border border-slate-200 text-slate-500')}`}
                            title="توفير البطارية"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.674a1 1 0 0 0 .707-.293l2.627-2.627A1 1 0 0 0 18 13.376V11a6 6 0 1 0-12 0v2.376a1 1 0 0 0 .293.707l2.627 2.627a1 1 0 0 0 .707.293zM10 21h4v1h-4v-1z" />
                            </svg>
                        </button>
                        <button onClick={() => { const nextVibrate = !vibrate; setVibrate(nextVibrate); triggerHaptic('impact'); logInteraction({ type: 'tasbih_toggle_vibration', category: 'tasbih', title: nextVibrate ? 'تفعيل اهتزاز التسبيح' : 'تعطيل اهتزاز التسبيح', details: currentTasbih.title, meta: { enabled: nextVibrate } }); }} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all ${vibrate ? (isDark ? 'text-gold-400 bg-gold-400/10 border border-gold-400/20' : 'text-gold-600 bg-gold-50 border border-gold-200') : (isDark ? 'text-white/20 bg-white/5 border border-white/10' : 'text-slate-300 bg-slate-100 border border-slate-200')}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Tasbih Selector ── */}
            <div className="mt-4">
                <div className="flex overflow-x-auto hide-scrollbar gap-2 px-5 py-1">
                    {allTasbihsList.map(t => (
                        <div key={t.id} className="relative group/item">
                            <button
                                onClick={() => { 
                                    if (t.id === 'custom') {
                                        setIsConfiguringCustom(!isConfiguringCustom);
                                    } else {
                                        setSelectedId(t.id); resetSession(); 
                                        setIsConfiguringCustom(false);
                                    }
                                    triggerHaptic('selection'); 
                                }}
                                className={`whitespace-nowrap px-5 py-2 rounded-full font-amiri font-bold text-base transition-all border duration-300 flex items-center gap-2 ${selectedId === t.id || (t.id === 'custom' && isConfiguringCustom)
                                    ? (isDark ? 'bg-gold-500 border-gold-400/50 text-white shadow-lg shadow-gold-500/20' : 'bg-gold-500 border-gold-400/50 text-white shadow-md')
                                    : (isDark ? 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10' : 'bg-white border-slate-100 text-slate-400 hover:border-gold-200')
                                    }`}
                            >
                                {t.id === 'custom' && <PlusIcon className="w-4 h-4" />}
                                {t.title}
                            </button>
                            {t.id.startsWith('saved_') && (
                                <button 
                                    onClick={(e) => deleteSavedTasbih(t.id, e)}
                                    className={`absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity`}
                                >
                                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Custom Settings (Minimized & Saveable) ── */}
            {isConfiguringCustom && (
                <div className="px-5 mt-3 animate-fade-in">
                    <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-white/[0.03] border-white/5 shadow-inner' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 opacity-50 px-1 ${isDark ? 'text-white' : 'text-slate-500'}`}>الاسم</label>
                                    <input
                                        type="text"
                                        value={customTitle}
                                        onChange={(e) => setCustomTitle(e.target.value)}
                                        className={`w-full px-3 py-1.5 rounded-xl font-amiri font-bold text-sm outline-none transition-all border ${isDark ? 'bg-white/5 border-white/10 text-white focus:border-gold-500/50' : 'bg-slate-50 border-slate-100 text-slate-800 focus:border-gold-500/50'}`}
                                        placeholder="اسم الذكر..."
                                    />
                                </div>
                                <div className="w-24">
                                    <label className={`block text-[9px] font-bold uppercase tracking-wider mb-1 opacity-50 px-1 ${isDark ? 'text-white' : 'text-slate-500'}`}>الهدف</label>
                                    <input
                                        type="number"
                                        value={customTarget}
                                        onChange={(e) => setCustomTarget(parseInt(e.target.value) || 0)}
                                        className={`w-full px-3 py-1.5 rounded-xl font-en font-bold text-sm outline-none border text-center ${isDark ? 'bg-white/5 border-white/5 text-white' : 'bg-slate-50 border-slate-100 text-slate-800'}`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1 overflow-x-auto hide-scrollbar flex-1 py-1">
                                    {[33, 99, 100, 1000].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => { setCustomTarget(val); triggerHaptic('selection'); }}
                                            className={`px-3 py-1 rounded-lg font-en font-bold text-[10px] transition-all border shrink-0 ${customTarget === val
                                                ? (isDark ? 'bg-gold-500/20 border-gold-500 text-gold-400' : 'bg-gold-500 text-white border-gold-500 shadow-lg')
                                                : (isDark ? 'bg-white/5 border-white/5 text-white/40' : 'bg-slate-50 border-slate-100 text-slate-400')
                                                }`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={saveCustomTasbih}
                                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gold-500 text-white font-bold text-xs shadow-lg shadow-gold-500/20 active:scale-95 transition-all`}
                                >
                                    <CheckIcon className="w-3.5 h-3.5" />
                                    <span>حفظ</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Main Content Area (Reorganized) ── */}
            <div className="flex-1 flex flex-col px-5 mt-4">
                
                {/* Top Stats Row */}
                <div className="flex items-center justify-between mb-6">
                    <div className={`flex-1 p-3 rounded-2xl border ml-2 transition-all ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-50 shadow-sm'}`}>
                        <p className={`text-[9px] font-bold uppercase tracking-wider mb-1 opacity-50 ${isDark ? 'text-white' : 'text-slate-500'}`}>الإجمالي</p>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-xl font-en font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{currentLifetimeCount.toLocaleString('en-US')}</span>
                            <button onClick={() => setConfirmModal('reset_task')} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isDark ? 'bg-white/5 text-white/30 hover:text-red-400' : 'bg-slate-50 text-slate-400 hover:text-red-500'}`}>تصفير</button>
                        </div>
                    </div>

                    <div className={`flex-1 p-3 rounded-2xl border mr-2 transition-all ${isDark ? 'bg-white/[0.03] border-white/5' : 'bg-white border-slate-50 shadow-sm'}`}>
                        <p className={`text-[9px] font-bold uppercase tracking-wider mb-1 opacity-50 ${isDark ? 'text-white' : 'text-slate-500'}`}>الهدف</p>
                        <div className="flex items-center justify-between">
                            <span className={`text-xl font-en font-bold ${isDark ? 'text-gold-500' : 'text-gold-600'}`}>{target === 0 ? '∞' : target}</span>
                            <button onClick={cycleTarget} className={`p-1.5 rounded-md ${isDark ? 'bg-gold-500/10 text-gold-400' : 'bg-gold-50 text-gold-600'}`}>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Center Counter */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    {/* Fixed 280×280 wrapper — ring SVG fills it exactly, no negative positioning */}
                    <div
                        className="relative group cursor-pointer select-none"
                        style={{ width: 280, height: 280 }}
                        onClick={handlePress}
                    >
                        {/* Ambient glow pulse */}
                        <div
                            className="absolute rounded-full pointer-events-none transition-all duration-300 group-active:scale-110 group-active:opacity-30"
                            style={{
                                inset: 32,
                                filter: 'blur(36px)',
                                opacity: 0.18,
                                background: isDark ? '#c8973a' : '#d4a22a',
                            }}
                        />

                        {/* Progress ring SVG — exactly fills the wrapper */}
                        <svg
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', overflow: 'visible' }}
                            viewBox="0 0 100 100"
                        >
                            {/* Hairline outer decorative border */}
                            <circle cx="50" cy="50" r="49"
                                fill="none"
                                stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
                                strokeWidth="0.5"
                            />
                            {/* Track ring */}
                            <circle cx="50" cy="50" r="46"
                                fill="none"
                                stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.35)'}
                                strokeWidth="3"
                            />
                            {/* Progress arc */}
                            {target > 0 && (
                                <circle
                                    cx="50" cy="50" r="46"
                                    fill="none"
                                    stroke={isDark ? '#d4a017' : '#ca8a04'}
                                    strokeWidth="3.5"
                                    strokeDasharray="289.03"
                                    strokeDashoffset={289.03 - (289.03 * (sessionCount % target)) / target}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 0.35s cubic-bezier(0.4,0,0.2,1)' }}
                                />
                            )}
                            {/* Glowing dot at progress head */}
                            {target > 0 && sessionCount % target > 0 && (() => {
                                const pct = (sessionCount % target) / target;
                                const angle = pct * 2 * Math.PI; // already rotated -90 in parent
                                const x = 50 + 46 * Math.cos(angle);
                                const y = 50 + 46 * Math.sin(angle);
                                return (
                                    <circle cx={x} cy={y} r="2"
                                        fill={isDark ? '#f0c040' : '#ca8a04'}
                                        style={{ filter: 'drop-shadow(0 0 3px #d4a017)' }}
                                    />
                                );
                            })()}
                        </svg>

                        {/* Tap ripple */}
                        <div
                            className="absolute rounded-full border pointer-events-none transition-all duration-[450ms] scale-100 group-active:scale-[1.5] group-active:opacity-0"
                            style={{
                                inset: 18,
                                borderColor: isDark ? 'rgba(212,160,23,0.25)' : 'rgba(202,138,4,0.3)',
                                borderWidth: 1.5,
                            }}
                        />

                        {/* Inner circular button */}
                        <div
                            className="absolute flex flex-col items-center justify-center transition-transform duration-75 active:scale-[0.96]"
                            style={{
                                inset: 18,
                                borderRadius: '50%',
                                background: isDark
                                    ? 'radial-gradient(ellipse at 35% 30%, #1e3a5c, #0d1e33 60%, #070d1a)'
                                    : 'radial-gradient(ellipse at 35% 30%, #ffffff, #f1f5ff 60%, #e8eef8)',
                                boxShadow: isDark
                                    ? '0 8px 40px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.4)'
                                    : '0 8px 40px rgba(180,160,80,0.18), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 #fff',
                                border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(200,200,200,0.5)',
                            }}
                        >
                            <span
                                className="font-black font-en leading-none"
                                style={{
                                    fontSize: sessionCount > 9999 ? 40 : sessionCount > 999 ? 52 : sessionCount > 99 ? 64 : 78,
                                    color: isDark ? '#ffffff' : '#1e293b',
                                    textShadow: isDark ? '0 2px 12px rgba(0,0,0,0.6)' : '0 1px 4px rgba(0,0,0,0.1)',
                                    letterSpacing: '-0.04em',
                                }}
                            >
                                {sessionCount.toLocaleString('en-US')}
                            </span>
                            <span
                                className="font-black uppercase tracking-[0.3em]"
                                style={{ fontSize: 9, marginTop: 8, color: isDark ? 'rgba(212,160,23,0.55)' : 'rgba(161,98,7,0.6)' }}
                            >
                                الدورة الحالية
                            </span>

                            {/* Cycle dots */}
                            <div className="flex gap-2 mt-4">
                                {[0, 1, 2].map(i => {
                                    const activeCount = Math.floor(sessionCount / (target || 999999));
                                    const active = target > 0 && activeCount > i;
                                    return (
                                        <div
                                            key={i}
                                            className="rounded-full transition-all duration-500"
                                            style={{
                                                width: active ? 10 : 7,
                                                height: active ? 10 : 7,
                                                background: active
                                                    ? (isDark ? '#d4a017' : '#ca8a04')
                                                    : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'),
                                                boxShadow: active ? (isDark ? '0 0 8px #d4a017' : '0 0 6px #ca8a04') : 'none',
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Controls */}
                <div className="mt-6 mb-8 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h2 className={`text-xl font-scheherazade font-bold truncate ${isDark ? 'text-gold-200' : 'text-gold-700'}`}>
                            {currentTasbih.title}
                        </h2>
                        <p className={`text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1 ${isDark ? 'text-white' : 'text-slate-500'}`}>
                            كرر الذكر أعلاه
                        </p>
                    </div>
                    {/* Reset session to zero */}
                    <button
                        onClick={resetSession}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shrink-0 active:scale-95 transition-all border ${
                            isDark
                                ? 'bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                                : 'bg-white border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 shadow-sm'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>تصفير</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
