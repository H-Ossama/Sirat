import { useState } from 'react';
import { ChevronLeftIcon, HeartIcon, BookIcon, SparkleIcon, LanternIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { womenContent, WomanContentItem } from '../data/womenContent';

interface WomenScreenProps {
    onBack: () => void;
}

export function WomenScreen({ onBack }: WomenScreenProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    const filteredContent = selectedCategory === 'all' 
        ? womenContent 
        : womenContent.filter(item => item.category === selectedCategory);

    const categories = [
        { id: 'all', label: 'الكل' },
        { id: 'hadith', label: 'أحاديث' },
        { id: 'fiqh', label: 'أحكام' },
        { id: 'dua', label: 'أدعية' },
        { id: 'advice', label: 'همسات' },
    ];

    const getCategoryIcon = (cat: string) => {
        switch(cat) {
            case 'hadith': return <BookIcon className="w-4 h-4" />;
            case 'fiqh': return <LanternIcon className="w-4 h-4" />;
            case 'dua': return <SparkleIcon className="w-4 h-4" />;
            case 'advice': return <HeartIcon className="w-4 h-4" />;
            default: return <SparkleIcon className="w-4 h-4" />;
        }
    };

    return (
        <div className={`h-full overflow-y-auto hide-scrollbar pb-24 transition-colors duration-300 ${isDark ? 'bg-[#0a1220] text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header */}
            <div className={`px-5 pt-6 pb-4 sticky top-0 z-20 backdrop-blur-xl transition-all ${isDark ? 'bg-[#0a1220]/80 border-b border-white/[0.05]' : 'bg-white/80 border-b border-slate-200/50 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08]' : 'bg-white border border-slate-200 shadow-sm hover:bg-slate-50'}`}
                    >
                        <ChevronLeftIcon className={`w-5 h-5 rotate-180 ${isDark ? 'text-white/80' : 'text-slate-600'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        خاص بالنساء
                    </h1>
                    <div className="w-11" /> {/* Spacer */}
                </div>
            </div>

            {/* Categories */}
            <div className="px-5 py-4 overflow-x-auto hide-scrollbar flex gap-2 flex-nowrap" dir="rtl">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            selectedCategory === cat.id
                            ? (isDark ? 'bg-white text-slate-900' : 'bg-slate-800 text-white')
                            : (isDark ? 'bg-white/[0.05] text-white/60 hover:bg-white/[0.1]' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50')
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="px-5 space-y-4" dir="rtl">
                {filteredContent.map((item) => (
                    <div 
                        key={item.id} 
                        className={`p-5 rounded-[2rem] border transition-all ${
                            isDark 
                            ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]' 
                            : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                        }`}
                    >
                        <div className="flex items-start gap-3 mb-3">
                            <div className={`p-2 rounded-xl ${
                                item.category === 'hadith' ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600') :
                                item.category === 'fiqh' ? (isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600') :
                                item.category === 'dua' ? (isDark ? 'bg-gold-500/10 text-gold-400' : 'bg-gold-50 text-gold-600') :
                                (isDark ? 'bg-pink-500/10 text-pink-400' : 'bg-pink-50 text-pink-600')
                            }`}>
                                {getCategoryIcon(item.category)}
                            </div>
                            <h3 className={`font-bold font-amiri text-lg flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {item.title}
                            </h3>
                        </div>
                        
                        <p className={`leading-loose font-amiri text-lg mb-2 ${isDark ? 'text-white/80' : 'text-slate-600'}`}>
                            {item.content}
                        </p>
                        
                        {item.source && (
                            <p className={`text-xs font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                {item.source}
                            </p>
                        )}
                    </div>
                ))}

                {filteredContent.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p>لا يوجد محتوى في هذا القسم حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
}
