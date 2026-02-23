import { useState } from 'react';
import { ChevronLeftIcon, AwardIcon, FlameIcon, ShieldIcon, CrownIcon, DiamondIcon, MedalIcon, ScrollIcon, SunriseIcon, RibbonIcon, SparkleIcon, LeafIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { getAllBadges, getRewardsState, type Badge } from '../services/rewardsStore';

interface BadgesScreenProps {
    onBack: () => void;
}

// Map icon name string → actual SVG component
function BadgeIconComponent({ name, className }: { name: string; className?: string }) {
    const cls = className ?? 'w-7 h-7';
    switch (name) {
        case 'FlameIcon': return <FlameIcon className={cls} />;
        case 'ShieldIcon': return <ShieldIcon className={cls} />;
        case 'CrownIcon': return <CrownIcon className={cls} />;
        case 'DiamondIcon': return <DiamondIcon className={cls} />;
        case 'MedalIcon': return <MedalIcon className={cls} />;
        case 'ScrollIcon': return <ScrollIcon className={cls} />;
        case 'SunriseIcon': return <SunriseIcon className={cls} />;
        case 'RibbonIcon': return <RibbonIcon className={cls} />;
        case 'SparkleIcon': return <SparkleIcon className={cls} />;
        case 'LeafIcon': return <LeafIcon className={cls} />;
        case 'AwardIcon': return <AwardIcon className={cls} />;
        default: return <AwardIcon className={cls} />;
    }
}

export { BadgeIconComponent };

export function BadgesScreen({ onBack }: BadgesScreenProps) {
    const { theme } = useTheme();
    const state = getRewardsState();
    const badges = getAllBadges(state);
    const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

    const unlockedCount = badges.filter(b => b.unlocked).length;

    return (
        <div className={`h-full overflow-y-auto hide-scrollbar pb-24 transition-colors duration-300 ${theme === 'light' ? 'bg-[#f8fbff] text-slate-800' : 'bg-gradient-to-b from-[#0b1929] via-[#0f1f38] to-[#0a1525] text-white'
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
                        الأوسمة والإنجازات
                    </h1>
                    <div className="w-10" />
                </div>

                {/* Progress summary */}
                <div className={`flex items-center justify-between border rounded-2xl p-4 ${theme === 'light' ? 'bg-white border-gold-200' : 'bg-gold-400/10 border-gold-400/30'
                    }`} dir="rtl">
                    <div>
                        <p className={`text-[14px] font-amiri font-bold ${theme === 'light' ? 'text-slate-700' : 'text-white/80'}`}>
                            {unlockedCount} من {badges.length} وسام مفتوح
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-white/30'
                            }`}>
                            {state.totalXP} نقطة · {state.currentStreak} يوم متتالي
                        </p>
                    </div>
                    <div className={`text-2xl font-amiri font-bold px-4 py-2 rounded-xl border ${theme === 'light' ? 'bg-gold-500 text-white border-gold-600' : 'bg-black/30 text-gold-300 border-gold-400/20'
                        }`}>
                        {Math.round((unlockedCount / badges.length) * 100)}%
                    </div>
                </div>
            </div>

            <div className="px-5 mt-6" dir="rtl">
                <p className={`text-[11px] mb-4 px-1 font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-white/30'
                    }`}>
                    جميع الأوسمة مرئية — أكمل الشروط لفتحها
                </p>

                <div className="grid grid-cols-2 gap-3">
                    {badges.map((badge, i) => (
                        <button
                            key={badge.id}
                            onClick={() => setSelectedBadge(badge)}
                            className={`relative rounded-3xl p-5 border text-right transition-all active:scale-95 shadow-md ${badge.unlocked
                                    ? theme === 'light'
                                        ? 'bg-white border-slate-100 shadow-slate-200/40'
                                        : 'bg-white/[0.05] border-white/[0.1]'
                                    : theme === 'light'
                                        ? 'bg-slate-50/80 border-slate-100'
                                        : 'bg-white/[0.02] border-white/[0.04]'
                                }`}
                            style={{ animationDelay: `${i * 40}ms` }}
                        >
                            {/* Badge icon circle */}
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 mx-auto transition-all ${badge.unlocked
                                    ? `bg-gradient-to-br ${badge.gradient} shadow-lg`
                                    : theme === 'light' ? 'bg-slate-100' : 'bg-white/[0.05]'
                                }`}
                                style={{ filter: badge.unlocked ? 'none' : 'grayscale(1) opacity(0.35)' }}
                            >
                                <BadgeIconComponent
                                    name={badge.iconName}
                                    className={`w-7 h-7 ${badge.unlocked ? 'text-white' : theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}
                                />
                            </div>

                            <p className={`text-[14px] font-amiri font-bold text-center mb-1 ${badge.unlocked
                                    ? theme === 'light' ? 'text-slate-800' : 'text-white'
                                    : theme === 'light' ? 'text-slate-400' : 'text-white/30'
                                }`}>
                                {badge.nameAr}
                            </p>
                            <p className={`text-[10px] text-center font-bold ${badge.unlocked
                                    ? theme === 'light' ? 'text-gold-500' : 'text-gold-400/60'
                                    : theme === 'light' ? 'text-slate-300' : 'text-white/15'
                                }`}>
                                {badge.unlocked ? 'مفتوح' : badge.unlockConditionAr}
                            </p>

                            {/* Glow overlay for unlocked */}
                            {badge.unlocked && (
                                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${badge.gradient} opacity-[0.04] pointer-events-none`} />
                            )}

                            {/* Lock indicator */}
                            {!badge.unlocked && (
                                <div className={`absolute top-3 left-3 w-5 h-5 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-slate-200' : 'bg-white/10'
                                    }`}>
                                    <svg className={`w-3 h-3 ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                </div>
                            )}

                            {/* Checkmark for unlocked */}
                            {badge.unlocked && (
                                <div className={`absolute top-3 left-3 w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br ${badge.gradient}`}>
                                    <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Badge detail sheet */}
            {selectedBadge && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)' }}
                    onClick={() => setSelectedBadge(null)}
                >
                    <div
                        className={`w-full max-w-lg rounded-t-[2rem] p-7 border-t transition-all ${theme === 'light' ? 'bg-white border-slate-100' : 'bg-[#0f1f38] border-white/10'
                            }`}
                        dir="rtl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-4 mb-5">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${selectedBadge.gradient} shadow-xl`}
                                style={{ filter: selectedBadge.unlocked ? 'none' : 'grayscale(1) opacity(0.5)' }}
                            >
                                <BadgeIconComponent name={selectedBadge.iconName} className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className={`text-xl font-amiri font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                                    {selectedBadge.nameAr}
                                </h3>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${selectedBadge.unlocked
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : theme === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/10 text-white/30'
                                    }`}>
                                    {selectedBadge.unlocked ? 'مفتوح' : 'مقفل'}
                                </span>
                            </div>
                        </div>

                        <p className={`text-[14px] font-amiri leading-relaxed mb-4 ${theme === 'light' ? 'text-slate-600' : 'text-white/60'
                            }`}>
                            {selectedBadge.descriptionAr}
                        </p>

                        {!selectedBadge.unlocked && (
                            <div className={`rounded-2xl p-4 border mb-4 ${theme === 'light' ? 'bg-gold-50 border-gold-100' : 'bg-gold-400/10 border-gold-400/20'
                                }`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme === 'light' ? 'text-gold-500' : 'text-gold-400/60'
                                    }`}>شرط الفتح</p>
                                <p className={`text-[14px] font-amiri font-bold ${theme === 'light' ? 'text-slate-700' : 'text-white/80'
                                    }`}>{selectedBadge.unlockConditionAr}</p>
                            </div>
                        )}

                        <button
                            onClick={() => setSelectedBadge(null)}
                            className={`w-full py-3.5 rounded-2xl font-amiri font-bold text-[15px] active:scale-95 transition-all ${theme === 'light'
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-white/[0.05] text-white/60 border border-white/[0.08]'
                                }`}
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
