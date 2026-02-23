import { ChevronLeftIcon, MoonIcon, StarIcon } from './Icons';
import { useTheme } from './ThemeContext';

interface LastTenScreenProps {
    onBack: () => void;
}

export function LastTenScreen({ onBack }: LastTenScreenProps) {
    const { theme } = useTheme();
    const points = [
        { title: 'تحري ليلة القدر', desc: 'هي خير من ألف شهر، وكان النبي ﷺ يجتهد فيها ما لا يجتهد في غيرها.' },
        { title: 'الاعتكاف', desc: 'سنة نبوية مؤكدة في العشر الأواخر للانقطاع للعبادة.' },
        { title: 'الإكثار من الدعاء', desc: '«اللهم إنك عفو تحب العفو فاعف عني»' },
        { title: 'الصدقة والبر', desc: 'كان النبي ﷺ أجود الناس، وكان أجود ما يكون في رمضان.' },
    ];

    const nightStatus = [
        { night: '٢١', date: '٢٠ مارس', status: 'مضت' },
        { night: '٢٣', date: '٢٢ مارس', status: 'مضت' },
        { night: '٢٥', date: '٢٤ مارس', status: 'قادمة' },
        { night: '٢٧', date: '٢٦ مارس', status: 'قادمة' },
        { night: '٢٩', date: '٢٨ مارس', status: 'قادمة' },
    ];

    return (
        <div className={`h-full transition-colors duration-300 overflow-y-auto hide-scrollbar pb-24 ${theme === 'light' ? 'bg-[#f8f9ff] text-slate-800' : 'bg-gradient-to-b from-[#1a0f2e] via-[#0b1929] to-[#0a1525] text-white'}`}>
            <div className={`px-5 pt-4 pb-3 sticky top-0 z-10 transition-all ${theme === 'light' ? 'bg-white/90 border-b border-indigo-100 shadow-sm' : 'bg-[#1a0f2e]/90 backdrop-blur-lg shadow-md'}`}>
                <div className="flex items-center justify-between mb-3">
                    <button onClick={onBack} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all outline-none ${theme === 'light' ? 'bg-slate-100 border border-slate-200' : 'bg-white/[0.08] border border-white/[0.1]'}`}>
                        <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${theme === 'light' ? 'text-slate-600' : 'text-white/80'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${theme === 'light' ? 'text-indigo-600' : 'text-gold-300'}`}>العشر الأواخر</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="px-5 pt-2">
                {/* Hero Section */}
                <div className={`relative rounded-3xl p-8 mb-8 overflow-hidden shadow-2xl transition-all border ${theme === 'light' ? 'bg-white border-indigo-100 shadow-indigo-700/5' : 'bg-gradient-to-br from-[#2a164d] to-[#1e344d]/30 border-night-400/40 shadow-black/50'}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full transition-opacity ${theme === 'light' ? 'bg-indigo-100/50' : 'bg-white/5'}`} />
                    <div className="relative z-10 text-center">
                        <MoonIcon className={`w-10 h-10 mb-4 mx-auto animate-pulse transition-colors ${theme === 'light' ? 'text-indigo-500' : 'text-gold-400/60'}`} />
                        <h2 className={`text-3xl font-amiri font-bold leading-tight ${theme === 'light' ? 'text-indigo-900' : 'text-white'}`}>أدرِك ليلة القدر</h2>
                        <p className={`mt-4 text-[13px] leading-relaxed font-bold font-naskh transition-colors ${theme === 'light' ? 'text-slate-500' : 'text-white/70'}`}>أعظم عشر ليالٍ في العام، فيها ليلة هي خير من ألف شهر.</p>
                    </div>
                </div>

                {/* Guides */}
                <div className="space-y-6 mb-10" dir="rtl">
                    <h3 className={`text-[12px] mb-4 px-2 font-bold uppercase tracking-widest font-naskh transition-colors ${theme === 'light' ? 'text-indigo-400' : 'text-white/60'}`}>أعمال مستحبة في العشر</h3>
                    {points.map((p, i) => (
                        <div key={i} className="flex gap-4 group">
                            <div className={`flex-shrink-0 w-1.5 rounded-full transition-all group-hover:bg-gold-400 shadow-[0_0_8px_rgba(212,165,40,0.3)] ${theme === 'light' ? 'bg-indigo-200' : 'bg-gold-400/40'}`} />
                            <div>
                                <h4 className={`text-[17px] font-amiri font-bold transition-colors ${theme === 'light' ? 'text-indigo-700 group-hover:text-indigo-900' : 'text-gold-300 group-hover:text-gold-200'}`}>{p.title}</h4>
                                <p className={`text-[13px] leading-relaxed mt-1.5 font-bold font-naskh transition-colors ${theme === 'light' ? 'text-slate-600' : 'text-white/80'}`}>{p.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Odd Nights Status */}
                <div className={`rounded-3xl p-6 shadow-xl mb-8 border transition-all ${theme === 'light' ? 'bg-white border-slate-100 shadow-slate-200/40' : 'bg-white/[0.03] border-white/[0.1]'}`}>
                    <h3 className={`text-[13px] mb-6 text-center font-bold uppercase tracking-widest font-naskh transition-colors ${theme === 'light' ? 'text-slate-300' : 'text-white/60'}`}>الليالي الوترية المباركة</h3>
                    <div className="space-y-3">
                        {nightStatus.map((n, i) => (
                            <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${n.status === 'مضت'
                                ? (theme === 'light' ? 'bg-slate-50 border-slate-100 grayscale-[0.8]' : 'bg-black/20 border-white/[0.05] grayscale-[0.5]')
                                : (theme === 'light' ? 'bg-white border-indigo-100 shadow-sm shadow-indigo-100' : 'bg-white/[0.03] border-white/[0.1] shadow-md')
                                }`} dir="rtl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-[16px] font-amiri font-bold transition-all border ${n.status === 'مضت'
                                        ? (theme === 'light' ? 'bg-slate-100 text-slate-300 border-transparent' : 'bg-white/5 text-white/30 border-transparent')
                                        : (theme === 'light' ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-inner' : 'bg-gold-400/20 text-gold-400 border-gold-400/30 shadow-inner')
                                        }`}>
                                        {n.night}
                                    </div>
                                    <div>
                                        <p className={`text-[15px] font-amiri font-bold transition-colors ${n.status === 'مضت'
                                            ? (theme === 'light' ? 'text-slate-300' : 'text-white/40')
                                            : (theme === 'light' ? 'text-slate-800' : 'text-white')}`}>{n.night} رمضان</p>
                                        <p className={`text-[10px] font-bold tracking-wider transition-colors ${theme === 'light' ? 'text-slate-200' : 'text-white/20'}`}>{n.date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[12px] font-bold transition-colors ${n.status === 'مضت'
                                        ? (theme === 'light' ? 'text-slate-200' : 'text-white/20')
                                        : (theme === 'light' ? 'text-emerald-500' : 'text-islamic-400')}`}>{n.status}</span>
                                    {n.status === 'قادمة' && <StarIcon className={`w-2.5 h-2.5 animate-pulse transition-colors ${theme === 'light' ? 'text-gold-500' : 'text-gold-400/60'}`} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
