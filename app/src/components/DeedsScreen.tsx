import { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, AwardIcon, FlameIcon, ZapIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { ALL_DEEDS, getDailyChallengeId, type DeedCategory } from '../data/challengeData';
import { completeDeed, getRewardsState, resetDailyDeeds, type Badge } from '../services/rewardsStore';
import { RewardCelebration } from './RewardCelebration';

interface DeedsScreenProps {
    onBack: () => void;
    highlightDeedId?: number; // passed from HomeScreen when coming from challenge button
    onNavigate?: (screen: string) => void;
}

const CATEGORY_COLORS: Record<DeedCategory, string> = {
    'صلاة': 'bg-amber-500/10 text-amber-600 border-amber-200',
    'قرآن': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    'ذكر': 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    'صدقة': 'bg-pink-500/10 text-pink-600 border-pink-200',
    'أخلاق': 'bg-teal-500/10 text-teal-600 border-teal-200',
    'أسرة': 'bg-rose-500/10 text-rose-600 border-rose-200',
    'مجتمع': 'bg-blue-500/10 text-blue-600 border-blue-200',
    'صيام': 'bg-purple-500/10 text-purple-600 border-purple-200',
    'علم': 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
};

const CATEGORY_COLORS_DARK: Record<DeedCategory, string> = {
    'صلاة': 'bg-amber-400/10 text-amber-300 border-amber-400/20',
    'قرآن': 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
    'ذكر': 'bg-indigo-400/10 text-indigo-300 border-indigo-400/20',
    'صدقة': 'bg-pink-400/10 text-pink-300 border-pink-400/20',
    'أخلاق': 'bg-teal-400/10 text-teal-300 border-teal-400/20',
    'أسرة': 'bg-rose-400/10 text-rose-300 border-rose-400/20',
    'مجتمع': 'bg-blue-400/10 text-blue-300 border-blue-400/20',
    'صيام': 'bg-purple-400/10 text-purple-300 border-purple-400/20',
    'علم': 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
};

export function DeedsScreen({ onBack, highlightDeedId, onNavigate }: DeedsScreenProps) {
    const { theme } = useTheme();
    const challengeId = getDailyChallengeId();
    const effectiveHighlight = highlightDeedId ?? challengeId;

    // Load rewards state
    const [rewardsState, setRewardsState] = useState(() => {
        resetDailyDeeds();
        return getRewardsState();
    });

    const [completedIds, setCompletedIds] = useState<Set<number>>(
        () => new Set(rewardsState.completedDeedIds)
    );

    const [celebration, setCelebration] = useState<{
        xp: number; streak: number; newBadges: Badge[];
    } | null>(null);

    const highlightRef = useRef<HTMLButtonElement | null>(null);

    // Scroll to highlighted deed on mount
    useEffect(() => {
        if (highlightRef.current) {
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, []);

    const toggleDeed = (id: number, xp: number) => {
        if (completedIds.has(id)) {
            // Allow un-toggling (just locally, don't subtract XP)
            setCompletedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
            return;
        }

        // Mark done
        setCompletedIds(prev => new Set([...prev, id]));
        const result = completeDeed(id, xp);
        setRewardsState(getRewardsState());

        // Show celebration
        setCelebration({
            xp,
            streak: result.newStreak,
            newBadges: result.newBadges,
        });
    };

    const doneCount = completedIds.size;
    const totalCount = ALL_DEEDS.length;

    // Group deeds by category
    const categories = Array.from(new Set(ALL_DEEDS.map(d => d.category)));

    return (
        <div className={`h-full transition-colors duration-300 overflow-y-auto hide-scrollbar pb-24 ${theme === 'light' ? 'bg-[#f8fbff] text-slate-800' : 'bg-gradient-to-b from-[#0b1929] via-[#0f1f38] to-[#0a1525] text-white'
            }`}>
            {/* Header */}
            <div className={`px-5 pt-5 pb-3 sticky top-0 z-10 backdrop-blur-lg transition-all ${theme === 'light' ? 'bg-white/90 border-b border-slate-200 shadow-sm' : 'bg-[#0b1929]/90 shadow-md'
                }`}>
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onBack}
                        className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${theme === 'light' ? 'bg-slate-100 border border-slate-200' : 'bg-white/[0.08] border border-white/[0.1]'
                            }`}
                    >
                        <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${theme === 'light' ? 'text-slate-600' : 'text-white/80'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>
                        سجل الحسنات
                    </h1>
                    {onNavigate && (
                        <button
                            onClick={() => onNavigate('badges')}
                            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${theme === 'light' ? 'bg-gold-50 border border-gold-200' : 'bg-gold-400/10 border border-gold-400/20'
                                }`}
                        >
                            <AwardIcon className={`w-5 h-5 ${theme === 'light' ? 'text-gold-500' : 'text-gold-400'}`} />
                        </button>
                    )}
                </div>

                {/* Stats row */}
                <div className={`flex items-center justify-between border rounded-2xl p-4 ${theme === 'light' ? 'bg-white border-gold-200' : 'bg-gold-400/10 border-gold-400/30'
                    }`} dir="rtl">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${theme === 'light' ? 'bg-gold-50 border-gold-200 text-gold-600' : 'bg-gold-400/20 border-gold-400/40 text-gold-400'
                            }`}>
                            <AwardIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className={`text-[14px] font-amiri font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white/90'}`}>
                                {doneCount} من {totalCount} حسنة
                            </p>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-gold-500' : 'text-gold-300/60'
                                }`}>
                                {rewardsState.totalXP} نقطة
                                {rewardsState.currentStreak > 0 && (
                                    <> · <FlameIcon className="w-3 h-3 inline text-orange-500" /> {rewardsState.currentStreak} يوم</>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className={`text-2xl font-amiri font-bold px-4 py-2 rounded-xl border ${theme === 'light' ? 'bg-gold-500 text-white border-gold-600' : 'bg-black/30 text-gold-300 border-gold-400/20'
                        }`}>
                        {totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}%
                    </div>
                </div>
            </div>

            {/* Deeds grouped by category */}
            <div className="px-5 mt-6 pb-8" dir="rtl">
                {/* Daily Challenge highlight banner */}
                <div className={`mb-5 rounded-2xl p-4 border flex items-center gap-3 ${theme === 'light'
                    ? 'bg-gradient-to-l from-gold-50 to-amber-50 border-gold-200'
                    : 'bg-gradient-to-l from-gold-400/10 to-amber-400/5 border-gold-400/30'
                    }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${theme === 'light' ? 'bg-gold-500' : 'bg-gold-400/30'}`}>
                        <ZapIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'light' ? 'text-gold-600' : 'text-gold-400/70'
                            }`}>تحدي اليوم</p>
                        <p className={`text-[13px] font-amiri font-bold ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                            {ALL_DEEDS.find(d => d.id === challengeId)?.text}
                        </p>
                    </div>
                </div>

                {categories.map(category => {
                    const deedsInCat = ALL_DEEDS.filter(d => d.category === category);
                    return (
                        <div key={category} className="mb-6">
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${theme === 'light' ? CATEGORY_COLORS[category] : CATEGORY_COLORS_DARK[category]
                                    }`}>{category}</span>
                                <div className={`flex-1 h-px ${theme === 'light' ? 'bg-slate-100' : 'bg-white/[0.05]'}`} />
                            </div>

                            <div className="space-y-2">
                                {deedsInCat.map((deed, index) => {
                                    const isDone = completedIds.has(deed.id);
                                    const isChallenge = deed.id === challengeId;
                                    const isHighlighted = deed.id === effectiveHighlight;

                                    return (
                                        <button
                                            key={deed.id}
                                            ref={isHighlighted ? highlightRef : null}
                                            onClick={() => toggleDeed(deed.id, deed.xp)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] shadow-sm text-right ${isChallenge && !isDone
                                                ? theme === 'light'
                                                    ? 'bg-gradient-to-l from-gold-50 to-amber-50/50 border-gold-300 shadow-gold-100'
                                                    : 'bg-gradient-to-l from-gold-400/15 to-amber-400/5 border-gold-400/50'
                                                : isDone
                                                    ? theme === 'light'
                                                        ? 'bg-emerald-50 border-emerald-200'
                                                        : 'bg-emerald-500/10 border-emerald-400/30'
                                                    : theme === 'light'
                                                        ? 'bg-white border-slate-100 hover:bg-slate-50'
                                                        : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                                                }`}
                                            style={{
                                                animationDelay: `${index * 30}ms`,
                                                boxShadow: isChallenge && !isDone
                                                    ? theme === 'light'
                                                        ? '0 0 0 2px rgba(212,165,40,0.3), 0 4px 12px rgba(212,165,40,0.1)'
                                                        : '0 0 0 1px rgba(212,165,40,0.4), 0 4px 20px rgba(212,165,40,0.1)'
                                                    : undefined,
                                            }}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {/* Checkbox */}
                                                <div className={`w-6 h-6 rounded-lg border flex-shrink-0 flex items-center justify-center transition-all ${isDone
                                                    ? theme === 'light' ? 'bg-emerald-500 border-emerald-600' : 'bg-emerald-500 border-emerald-400'
                                                    : isChallenge
                                                        ? theme === 'light' ? 'bg-gold-50 border-gold-400' : 'bg-gold-400/20 border-gold-400'
                                                        : theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
                                                    }`}>
                                                    {isDone && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>

                                                {/* Text only — no emoji icon */}
                                                <span className={`text-[14px] font-amiri leading-snug transition-all ${isDone
                                                    ? theme === 'light' ? 'text-emerald-600/50 line-through' : 'text-white/30 line-through'
                                                    : theme === 'light' ? 'text-slate-800 font-bold' : 'text-white/90 font-bold'
                                                    }`}>
                                                    {deed.text}
                                                </span>
                                            </div>

                                            {/* Right side: challenge badge + XP */}
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0 mr-1">
                                                {isChallenge && !isDone && (
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${theme === 'light' ? 'bg-gold-500 text-white' : 'bg-gold-400 text-black'
                                                        }`}>تحدي</span>
                                                )}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDone
                                                    ? theme === 'light' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20'
                                                    : theme === 'light' ? 'bg-slate-50 text-slate-400 border-slate-100' : 'bg-white/5 text-white/20 border-white/5'
                                                    }`}>
                                                    +{deed.xp}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Celebration overlay */}
            {celebration && (
                <RewardCelebration
                    xp={celebration.xp}
                    streak={celebration.streak}
                    newBadges={celebration.newBadges}
                    onDismiss={() => setCelebration(null)}
                />
            )}
        </div>
    );
}
