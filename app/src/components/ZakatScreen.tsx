import { useState } from 'react';
import { ChevronLeftIcon, CalculatorIcon } from './Icons';
import { useTheme } from './ThemeContext';

interface ZakatScreenProps {
    onBack: () => void;
}

export function ZakatScreen({ onBack }: ZakatScreenProps) {
    const { theme } = useTheme();
    const [amount, setAmount] = useState('');
    const nisab = 85; // Standard 85g gold threshold

    const calculation = parseFloat(amount) ? (parseFloat(amount) * 0.025).toFixed(2) : '0.00';
    const isEligible = parseFloat(amount) > 10000; // Average threshold based on current value

    return (
        <div className={`h-full flex flex-col overflow-hidden transition-colors duration-300 ${theme === 'light' ? 'bg-[#f8fbff] text-slate-800' : 'bg-gradient-to-b from-[#0b1929] via-[#0f1f38] to-[#0a1525] text-white'}`}>
            <div className={`px-5 pt-5 pb-3 sticky top-0 z-10 backdrop-blur-lg transition-all ${theme === 'light' ? 'bg-white/90 border-b border-slate-200' : 'bg-[#0b1929]/90 shadow-md'}`}>
                <div className="flex items-center justify-between">
                    <button onClick={onBack} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${theme === 'light' ? 'bg-slate-100 border border-slate-200' : 'bg-white/[0.08] border border-white/[0.1]'}`}>
                        <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${theme === 'light' ? 'text-slate-600' : 'text-white/80'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>حاسبة الزكاة</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6 hide-scrollbar pb-32">
                <div className={`relative rounded-3xl overflow-hidden p-6 mb-8 shadow-2xl transition-all border ${theme === 'light' ? 'bg-white border-slate-100 shadow-slate-200/40' : 'bg-gradient-to-br from-[#1e344d] to-[#0f1f38] border-gold-400/20 shadow-black/50'}`}>
                    <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] rounded-full transition-opacity ${theme === 'light' ? 'bg-gold-100/50' : 'bg-gold-400/10'}`} />
                    <div className="relative z-10 text-center">
                        <CalculatorIcon className={`w-10 h-10 mx-auto mb-4 animate-float ${theme === 'light' ? 'text-gold-600' : 'text-gold-400/60'}`} />
                        <p className={`text-[12px] mb-2 font-bold tracking-widest uppercase ${theme === 'light' ? 'text-slate-400' : 'text-white/50'}`}>زكاة مالك هي طُهرة له</p>
                        <h2 className={`text-2xl font-amiri font-bold leading-tight ${theme === 'light' ? 'text-slate-900' : 'text-gold-300'}`}>احسب مقدار زكاتك الواجبة</h2>
                    </div>
                </div>

                <div className="space-y-6" dir="rtl">
                    <div>
                        <label className={`text-[11px] mb-2 block font-bold px-1 uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-white/60'}`}>إجمالي المبلغ الذي دار عليه الحول</label>
                        <div className="relative group">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="أدخل المبلغ هنا..."
                                className={`w-full rounded-2xl p-5 text-2xl font-amiri outline-none transition-all shadow-inner ${theme === 'light' ? 'bg-white border-2 border-slate-200 text-gold-600 placeholder:text-slate-200 focus:border-gold-300/50' : 'bg-black/40 border-2 border-white/[0.1] text-gold-300 placeholder:text-white/10 focus:border-gold-400/50'}`}
                            />
                            <span className={`absolute left-6 top-1/2 -translate-y-1/2 text-[14px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-200' : 'text-white/20'}`}>USD/MAD</span>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className={`flex-1 p-5 rounded-2xl border flex flex-col items-center justify-center shadow-lg transition-all ${isEligible
                            ? (theme === 'light' ? 'bg-gold-50 border-gold-300 shadow-gold-100' : 'bg-gold-500/10 border-gold-400/40')
                            : (theme === 'light' ? 'bg-slate-50 border-slate-100 shadow-none' : 'bg-white/[0.03] border-white/10')
                            }`}>
                            <p className={`text-[10px] mb-1 font-bold uppercase tracking-wider ${theme === 'light' ? 'text-slate-400' : 'text-white/50'}`}>هل تجب الزكاة؟</p>
                            <p className={`text-[16px] font-amiri font-bold ${isEligible ? (theme === 'light' ? 'text-gold-600' : 'text-gold-300') : (theme === 'light' ? 'text-slate-300' : 'text-white/70')}`}>
                                {isEligible ? 'نعم، بلغت النصاب' : 'لم تبلغ النصاب'}
                            </p>
                        </div>
                        <div className={`flex-1 p-5 rounded-2xl border flex flex-col items-center justify-center shadow-lg transition-all ${theme === 'light' ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100' : 'bg-islamic-500/10 border-islamic-400/40 shadow-emerald-900/10'}`}>
                            <p className={`text-[10px] mb-1 font-bold font-sans uppercase tracking-wider ${theme === 'light' ? 'text-emerald-400' : 'text-white/50'}`}>مقدار الزكاة (2.5%)</p>
                            <p className={`text-xl font-amiri font-bold drop-shadow-sm ${theme === 'light' ? 'text-emerald-700' : 'text-islamic-400'}`}>{calculation}</p>
                        </div>
                    </div>

                    <div className={`rounded-2xl p-5 shadow-sm border transition-all ${theme === 'light' ? 'bg-white border-slate-100 shadow-slate-200/30' : 'bg-white/[0.04] border-white/[0.1]'}`}>
                        <h4 className={`text-[13px] font-amiri font-bold mb-2 ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>تعليمات هامة:</h4>
                        <ul className={`space-y-2 text-[12px] leading-relaxed font-bold font-sans transition-colors ${theme === 'light' ? 'text-slate-600' : 'text-white/80'}`}>
                            <li className="flex gap-3 items-start"><span className="text-gold-500 mt-1">•</span> تجب الزكاة إذا بلغ المال النصاب (ما يعادل 85 جراماً من الذهب) ومر عليه عام كامل (حول هجري).</li>
                            <li className="flex gap-3 items-start"><span className="text-gold-500 mt-1">•</span> النسبة الواجبة هي 2.5% من إجمالي المال المدخر.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
