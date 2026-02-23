import { useEffect, useState } from 'react';
import { useTheme } from './ThemeContext';
import { AwardIcon, FlameIcon, ZapIcon } from './Icons';
import { BadgeIconComponent } from './BadgesScreen';
import type { Badge } from '../services/rewardsStore';

interface RewardCelebrationProps {
    xp: number;
    streak: number;
    newBadges: Badge[];
    onDismiss: () => void;
}

export function RewardCelebration({ xp, streak, newBadges, onDismiss }: RewardCelebrationProps) {
    const { theme } = useTheme();
    const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter');

    useEffect(() => {
        const t1 = setTimeout(() => setPhase('show'), 50);
        const t2 = setTimeout(() => {
            setPhase('exit');
            setTimeout(onDismiss, 400);
        }, 2800);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    const hasBadge = newBadges.length > 0;
    const badge = newBadges[0];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={() => { setPhase('exit'); setTimeout(onDismiss, 300); }}
            style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(10px)',
                opacity: phase === 'show' ? 1 : 0,
                transition: 'opacity 0.35s ease',
            }}
        >
            {/* Particle dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 16 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1.5 h-1.5 rounded-full"
                        style={{
                            left: `${12 + (i * 5.5) % 76}%`,
                            top: `${25 + (i * 7.1) % 50}%`,
                            background: i % 3 === 0 ? '#f3d88a' : i % 3 === 1 ? '#a78bfa' : '#34d399',
                            animation: `particle-float ${1.1 + (i % 4) * 0.25}s ease-out ${i * 0.07}s both`,
                            opacity: phase === 'show' ? 1 : 0,
                        }}
                    />
                ))}
            </div>

            <div
                dir="rtl"
                className={`relative mx-6 rounded-[2rem] p-7 shadow-2xl border transition-all ${theme === 'light'
                        ? 'bg-white border-slate-100'
                        : 'bg-gradient-to-br from-[#1a2c42] to-[#0d1624] border-white/10'
                    }`}
                style={{
                    transform: phase === 'show' ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(30px)',
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
                    opacity: phase === 'show' ? 1 : 0,
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Award icon burst */}
                <div className="flex flex-col items-center mb-5">
                    <div
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-400 to-amber-500 flex items-center justify-center shadow-2xl shadow-gold-500/30 mb-4"
                        style={{ animation: 'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both' }}
                    >
                        <AwardIcon className="w-10 h-10 text-white" />
                    </div>
                    <h2 className={`text-2xl font-amiri font-bold mb-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                        أحسنت! جزاك الله خيراً
                    </h2>
                    <p className={`text-sm font-bold ${theme === 'light' ? 'text-slate-400' : 'text-white/40'}`}>
                        لقد سجَّلت حسنةً في ميزانك
                    </p>
                </div>

                {/* XP + Streak Row */}
                <div className="flex gap-3 mb-5">
                    <div className={`flex-1 rounded-2xl p-4 text-center border ${theme === 'light' ? 'bg-gold-50 border-gold-100' : 'bg-gold-400/10 border-gold-400/20'
                        }`}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <ZapIcon className={`w-4 h-4 ${theme === 'light' ? 'text-gold-500' : 'text-gold-400'}`} />
                        </div>
                        <p className={`text-3xl font-amiri font-bold ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>
                            +{xp}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme === 'light' ? 'text-gold-500' : 'text-gold-400/60'
                            }`}>نقطة</p>
                    </div>
                    <div className={`flex-1 rounded-2xl p-4 text-center border ${theme === 'light' ? 'bg-orange-50 border-orange-100' : 'bg-orange-400/10 border-orange-400/20'
                        }`}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <FlameIcon className="w-4 h-4 text-orange-500" />
                        </div>
                        <p className={`text-3xl font-amiri font-bold ${theme === 'light' ? 'text-orange-600' : 'text-orange-300'}`}>
                            {streak}
                        </p>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme === 'light' ? 'text-orange-500' : 'text-orange-400/60'
                            }`}>يوم متتالي</p>
                    </div>
                </div>

                {/* Badge Unlock */}
                {hasBadge && (
                    <div
                        className={`rounded-2xl p-4 border mb-5 ${theme === 'light' ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-400/10 border-indigo-400/20'
                            }`}
                        style={{ animation: 'badge-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}
                    >
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${theme === 'light' ? 'text-indigo-500' : 'text-indigo-300/60'
                            }`}>وسام جديد مفتوح</p>
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center shadow-lg`}>
                                <BadgeIconComponent name={badge.iconName} className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className={`font-amiri font-bold text-lg ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                                    {badge.nameAr}
                                </p>
                                <p className={`text-[11px] ${theme === 'light' ? 'text-slate-500' : 'text-white/40'}`}>
                                    {badge.descriptionAr}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => { setPhase('exit'); setTimeout(onDismiss, 300); }}
                    className={`w-full py-3.5 rounded-2xl font-amiri font-bold text-[15px] transition-all active:scale-95 ${theme === 'light'
                            ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20'
                            : 'bg-gold-400/20 text-gold-300 border border-gold-400/30'
                        }`}
                >
                    الحمد لله
                </button>
            </div>

            <style>{`
                @keyframes particle-float {
                    0% { transform: translateY(0) scale(0); opacity: 1; }
                    100% { transform: translateY(-110px) scale(1.4); opacity: 0; }
                }
                @keyframes bounce-in {
                    0% { transform: scale(0) rotate(-10deg); opacity: 0; }
                    100% { transform: scale(1) rotate(0deg); opacity: 1; }
                }
                @keyframes badge-appear {
                    0% { transform: translateX(20px); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
}
