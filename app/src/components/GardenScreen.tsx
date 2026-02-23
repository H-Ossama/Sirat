import { useState } from 'react';
import { ChevronLeftIcon, LeafIcon, DropletIcon, FlameIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { getRewardsState, completeDeed } from '../services/rewardsStore';

interface GardenScreenProps {
    onBack: () => void;
}

export function GardenScreen({ onBack }: GardenScreenProps) {
    const { theme } = useTheme();
    const [rewardsState, setRewardsState] = useState(() => getRewardsState());
    const points = rewardsState.totalXP;
    const level = Math.floor(points / 100) + 1;
    const progress = points % 100;

    const waterPlant = () => {
        // Water the plant = complete a special garden deed (+10 XP)
        const result = completeDeed(9999, 10); // special garden deed id
        setRewardsState(getRewardsState());
        void result;

        const plant = document.getElementById('spiritual-plant');
        if (plant) {
            plant.classList.add('animate-grow-leaf');
            setTimeout(() => plant.classList.remove('animate-grow-leaf'), 500);
        }
    };

    return (
        <div className={`h-full transition-colors duration-300 overflow-y-auto hide-scrollbar pb-24 ${theme === 'light' ? 'bg-[#f0f9f4] text-slate-800' : 'bg-gradient-to-b from-[#14281a] via-[#0b1929] to-[#0a1525] text-white'}`}>
            <div className={`px-5 pt-5 pb-3 sticky top-0 z-10 backdrop-blur-lg transition-all ${theme === 'light' ? 'bg-white/80 border-b border-emerald-100' : 'bg-[#14281a]/95 shadow-md'}`}>
                <div className={`flex items-center justify-between transition-colors ${theme === 'light' ? 'text-emerald-700' : 'text-islamic-300'}`}>
                    <button onClick={onBack} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all outline-none ${theme === 'light' ? 'bg-emerald-50 border border-emerald-100 shadow-sm' : 'bg-white/[0.08] border border-white/[0.1]'}`}>
                        <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${theme === 'light' ? 'text-emerald-600' : 'text-islamic-400'}`} />
                    </button>
                    <h1 className="text-xl font-amiri font-bold">بستان الإيمان</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="px-5 pt-4">
                {/* Level Stats */}
                <div className={`flex items-center justify-between mb-6 p-6 rounded-2xl shadow-xl transition-all border ${theme === 'light' ? 'bg-white border-emerald-100 shadow-emerald-700/5' : 'bg-white/[0.04] border-white/[0.1]'}`} dir="rtl">
                    <div>
                        <p className={`text-[12px] mb-1 font-bold uppercase tracking-wider ${theme === 'light' ? 'text-emerald-400' : 'text-white/70'}`}>مستوى بستانك</p>
                        <h2 className={`text-2xl font-amiri font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-islamic-300'}`}>الدرجة الروحية {level}</h2>
                        {rewardsState.currentStreak > 0 && (
                            <p className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${theme === 'light' ? 'text-orange-500' : 'text-orange-300/70'}`}>
                                <FlameIcon className="w-3 h-3" /> {rewardsState.currentStreak} يوم متتالي
                            </p>
                        )}
                    </div>
                    <div className="text-left">
                        <p className={`text-[12px] mb-1 font-bold uppercase tracking-wider ${theme === 'light' ? 'text-emerald-400' : 'text-white/70'}`}>النقاط</p>
                        <p className={`text-3xl font-amiri font-bold drop-shadow-sm ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>{points}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="px-2 mb-8">
                    <div className="flex items-center justify-between mb-2" dir="rtl">
                        <span className={`text-[12px] font-bold ${theme === 'light' ? 'text-emerald-600/60' : 'text-white/80'}`}>المستوى القادم</span>
                        <span className={`text-[12px] font-bold ${theme === 'light' ? 'text-emerald-600' : 'text-islamic-300'}`}>{progress}%</span>
                    </div>
                    <div className={`h-3 rounded-full overflow-hidden shadow-inner border transition-all ${theme === 'light' ? 'bg-emerald-50 border-emerald-100' : 'bg-white/[0.1] border-white/[0.05]'}`}>
                        <div
                            className="h-full bg-gradient-to-l from-islamic-400 to-islamic-600 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(61,155,120,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* The Garden / Plant Visualization */}
                <div className="relative h-72 flex items-center justify-center mb-10">
                    <div className={`absolute inset-0 blur-[100px] rounded-full animate-pulse transition-all ${theme === 'light' ? 'bg-emerald-400/20' : 'bg-islamic-500/10'}`} />

                    <div id="spiritual-plant" className="relative transition-transform duration-500 hover:scale-105">
                        <svg className={`w-48 h-48 filter drop-shadow-[0_0_15px_rgba(61,155,120,0.3)] transition-colors ${theme === 'light' ? 'text-emerald-600' : 'text-islamic-400'}`} viewBox="0 0 100 100">
                            <path d="M50 95 V35" stroke="currentColor" strokeWidth="2.5" fill="none" />
                            <path d="M50 80 Q30 70 20 45" stroke="currentColor" strokeWidth="2" fill="none" opacity={points > 10 ? 1 : 0.2} />
                            <path d="M50 80 Q70 70 80 45" stroke="currentColor" strokeWidth="2" fill="none" opacity={points > 30 ? 1 : 0.2} />
                            <path d="M50 55 Q30 45 15 25" stroke="currentColor" strokeWidth="2" fill="none" opacity={points > 60 ? 1 : 0.2} />
                            <path d="M50 55 Q70 45 85 25" stroke="currentColor" strokeWidth="2" fill="none" opacity={points > 90 ? 1 : 0.2} />
                            <circle cx="50" cy="30" r="6" fill="#f3d88a" opacity={points > 100 ? 1 : 0} className="animate-pulse shadow-lg" />
                        </svg>
                        <LeafIcon className={`absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 animate-float transition-colors ${theme === 'light' ? 'text-emerald-500' : 'text-islamic-300'}`} />
                    </div>

                    <button
                        onClick={waterPlant}
                        className={`absolute bottom-4 right-1/2 translate-x-1/2 translate-y-8 w-16 h-16 rounded-full border-2 flex items-center justify-center shadow-2xl active:scale-90 transition-all backdrop-blur-sm group ${theme === 'light' ? 'bg-emerald-100/80 border-emerald-300 shadow-emerald-700/20' : 'bg-islamic-500/30 border-islamic-300 shadow-islamic-500/40'}`}
                    >
                        <DropletIcon className={`w-8 h-8 group-hover:scale-110 transition-transform ${theme === 'light' ? 'text-emerald-600' : 'text-islamic-300'}`} />
                        <div className={`absolute -top-2 -right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-md animate-bounce ${theme === 'light' ? 'bg-gold-500 border-white text-white' : 'bg-gold-400 border-[#14281a] text-[#0b1929]'}`}>
                            +10
                        </div>
                    </button>
                </div>

                {/* Tips / Missions */}
                <div className="space-y-4 mb-10">
                    <h3 className={`text-[13px] mb-3 px-2 font-bold uppercase tracking-widest font-naskh transition-colors ${theme === 'light' ? 'text-emerald-700/60' : 'text-white/60'}`}>زادك الروحاني</h3>
                    {[
                        { title: 'بر الوالدين وحسن صحبتهم', xp: '+٥٠ نقطة', icon: '🤲' },
                        { title: 'إماطة الأذى عن طريق الناس', xp: '+٢٠ نقطة', icon: '🌿' },
                        { title: 'التبسم في وجه أخيك المسلم', xp: '+١٠ نقاط', icon: '😊' },
                    ].map((item, i) => (
                        <div key={i} className={`flex items-center justify-between p-4.5 rounded-2xl border shadow-md active:scale-[0.99] transition-all ${theme === 'light' ? 'bg-white border-emerald-50 shadow-emerald-700/5' : 'bg-white/[0.03] border-white/[0.08]'}`} dir="rtl">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl filter drop-shadow-sm">{item.icon}</span>
                                <span className={`text-[14px] font-amiri font-bold ${theme === 'light' ? 'text-slate-700' : 'text-white/90'}`}>{item.title}</span>
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${theme === 'light' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-islamic-300 bg-islamic-400/10 border-islamic-400/20'}`}>{item.xp}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
