import { useState, useMemo } from 'react';
import { duas } from '../data/duas';
import { ChevronLeftIcon, HandsIcon, SearchIcon, CopyIcon, ShareIcon } from './Icons';
import { useTheme } from './ThemeContext';

interface DuasScreenProps {
    onBack: () => void;
}

export function DuasScreen({ onBack }: DuasScreenProps) {
    const { theme } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(duas.map(d => d.category)));
        return ['الكل', ...cats];
    }, []);

    const filteredDuas = useMemo(() => {
        return duas.filter(dua => {
            const matchesCategory = selectedCategory === 'الكل' || dua.category === selectedCategory;
            const matchesSearch =
                dua.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                dua.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                dua.category.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, searchQuery]);

    const handleCopy = (text: string, id: number) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleShare = (dua: typeof duas[0]) => {
        const shareText = `${dua.title}\n\n${dua.text}\n\nالمصدر: ${dua.reference}\n\nتمت المشاركة من تطبيق Sirat`;
        if (navigator.share) {
            navigator.share({
                title: dua.title,
                text: shareText,
            }).catch(console.error);
        } else {
            handleCopy(shareText, dua.id);
            alert('تم نسخ النص للمشاركة');
        }
    };

    return (
        <div className={`h-full transition-colors duration-300 overflow-y-auto hide-scrollbar pb-24 ${theme === 'light' ? 'bg-[#f8fbff] text-slate-800' : 'bg-gradient-to-b from-[#0b1929] via-[#0f1f38] to-[#0a1525] text-white'}`}>
            <div className={`px-5 pt-4 pb-3 sticky top-0 backdrop-blur-xl z-20 shadow-sm transition-all ${theme === 'light' ? 'bg-white/90 border-b border-slate-100' : 'bg-[#0b1929]/95 border-b border-white/5'}`}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={onBack} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-all shadow-sm ${theme === 'light' ? 'bg-white text-slate-600 border border-slate-100' : 'bg-white/[0.05] text-white/80 border border-white/10'}`}>
                        <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${theme === 'light' ? 'text-gold-600' : 'text-gold-300'}`}>الأدعية المختارة</h1>
                    <div className="w-10" />
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <div className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none`}>
                        <SearchIcon className={`w-4 h-4 ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`} />
                    </div>
                    <input
                        type="text"
                        placeholder="ابحث عن دعاء..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        dir="rtl"
                        className={`w-full py-2.5 pr-10 pl-4 rounded-xl text-sm font-amiri outline-none transition-all border ${theme === 'light'
                                ? 'bg-slate-50 border-slate-100 focus:bg-white focus:border-gold-300 text-slate-700'
                                : 'bg-white/[0.03] border-white/10 focus:bg-white/[0.06] focus:border-gold-400/30 text-white'
                            }`}
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1" dir="rtl">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-5 py-2 rounded-xl text-[12px] font-bold whitespace-nowrap transition-all border shadow-sm ${selectedCategory === cat
                                ? (theme === 'light' ? 'bg-gold-500 text-white border-gold-500' : 'bg-gold-500 text-white border-gold-400 shadow-gold-500/20')
                                : (theme === 'light' ? 'bg-white border-slate-100 text-slate-500' : 'bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-white/[0.06]')
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 space-y-5 mt-6">
                {filteredDuas.length > 0 ? (
                    filteredDuas.map((dua, index) => (
                        <div
                            key={dua.id}
                            className={`group rounded-3xl p-6 animate-fade-in shadow-lg backdrop-blur-sm transition-all border relative overflow-hidden ${theme === 'light'
                                    ? 'bg-white border-slate-100 hover:border-gold-200'
                                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'
                                }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Decorative Background Element */}
                            <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-[0.03] pointer-events-none ${theme === 'light' ? 'bg-gold-500' : 'bg-gold-300'}`} />

                            <div className="flex items-center justify-between mb-5" dir="rtl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${theme === 'light' ? 'bg-gold-50 text-gold-600' : 'bg-gold-400/10 text-gold-400'}`}>
                                        <HandsIcon className="w-5 h-5" />
                                    </div>
                                    <h3 className={`text-lg font-amiri font-bold ${theme === 'light' ? 'text-slate-800' : 'text-gold-200'}`}>{dua.title}</h3>
                                </div>
                                <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full border ${theme === 'light'
                                        ? 'bg-gold-50/50 text-gold-600 border-gold-100'
                                        : 'bg-gold-400/5 text-gold-400/80 border-gold-400/10'
                                    }`}>
                                    {dua.category}
                                </span>
                            </div>

                            <p className={`text-[24px] font-scheherazade leading-[1.8] text-right mb-6 px-1 selection:bg-gold-400/30 ${theme === 'light' ? 'text-slate-700' : 'text-white/90'}`} dir="rtl">
                                {dua.text}
                            </p>

                            <div className={`flex items-center justify-between border-t pt-4 ${theme === 'light' ? 'border-slate-50' : 'border-white/[0.05]'}`}>
                                <span className={`text-[11px] font-bold italic ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>
                                    — {dua.reference}
                                </span>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleCopy(dua.text, dua.id)}
                                        className={`p-2.5 rounded-xl transition-all active:scale-90 ${copiedId === dua.id
                                                ? 'bg-green-500 text-white'
                                                : (theme === 'light' ? 'bg-slate-50 text-slate-400 hover:text-gold-500 hover:bg-gold-50' : 'bg-white/5 text-white/40 hover:text-gold-400 hover:bg-white/10')
                                            }`}
                                        title="نسخ الدعاء"
                                    >
                                        {copiedId === dua.id ? (
                                            <span className="text-[10px] font-bold px-1">تم النسخ</span>
                                        ) : (
                                            <CopyIcon className="w-4 h-4" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleShare(dua)}
                                        className={`p-2.5 rounded-xl transition-all active:scale-90 ${theme === 'light' ? 'bg-slate-50 text-slate-400 hover:text-gold-500 hover:bg-gold-50' : 'bg-white/5 text-white/40 hover:text-gold-400 hover:bg-white/10'
                                            }`}
                                        title="مشاركة"
                                    >
                                        <ShareIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${theme === 'light' ? 'bg-slate-100 text-slate-400' : 'bg-white/5 text-white/20'}`}>
                            <SearchIcon className="w-8 h-8" />
                        </div>
                        <h3 className={`text-lg font-amiri font-bold mb-2 ${theme === 'light' ? 'text-slate-600' : 'text-white/60'}`}>لم يتم العثور على نتائج</h3>
                        <p className={`text-sm ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً</p>
                    </div>
                )}
            </div>
            <div className="h-12" />
        </div>
    );
}
