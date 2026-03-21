import { useState, useMemo, useEffect, useRef } from 'react';
import { 
    ChevronLeftIcon, HeartIcon, BookIcon, SparkleIcon, LanternIcon, 
    UsersIcon, DropletIcon, StarIcon, ScrollIcon, DiamondIcon, MoonIcon
} from './Icons';
import { useTheme } from './ThemeContext';
import { womenContent, WomanContentItem } from '../data/womenContent';
import { WomenTracker } from './WomenTracker';

interface WomenScreenProps {
    onBack: () => void;
}

type ScreenMode = 'dashboard' | 'category' | 'tracker';

export function WomenScreen({ onBack }: WomenScreenProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [mode, setMode] = useState<ScreenMode>('dashboard');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo(0, 0);
        }
    }, [mode, selectedCategory]);

    const heroImage = '/assets/women_hero.png';

    const categories = [
        { id: 'hadith', label: 'درر من السنة', icon: <BookIcon className="w-6 h-6" />, color: 'from-pink-500 to-rose-400', description: 'أحاديث نبوية تهم المرأة' },
        { id: 'fiqh', label: 'فقه المرأة', icon: <LanternIcon className="w-6 h-6" />, color: 'from-purple-500 to-indigo-400', description: 'أحكام العبادات والطهارة' },
        { id: 'family', label: 'البيت والمجتمع', icon: <UsersIcon className="w-6 h-6" />, color: 'from-amber-500 to-orange-400', description: 'بناء الأسرة المسلمة' },
        { id: 'faith', label: 'نور الإيمان', icon: <MoonIcon className="w-6 h-6" />, color: 'from-indigo-500 to-blue-400', description: 'تزكية النفس والروح' },
        { id: 'health', label: 'صحتكِ وزينتكِ', icon: <HeartIcon className="w-6 h-6" />, color: 'from-rose-400 to-pink-300', description: 'عناية بالروح والجسد' },
        { id: 'dua', label: 'مناجاة الزاهدة', icon: <SparkleIcon className="w-6 h-6" />, color: 'from-emerald-500 to-teal-400', description: 'أدعية وأذكار مختارة' },
        { id: 'advice', label: 'همسات إيمانية', icon: <HeartIcon className="w-6 h-6" />, color: 'from-rose-500 to-pink-400', description: 'نصائح لروحك وقلبك' },
        { id: 'tracker', label: 'متابع الطهارة', icon: <DropletIcon className="w-6 h-6" />, color: 'from-blue-500 to-cyan-400', description: 'نظام متابعة الصلاة والحيض', special: true },
    ];

    const filteredContent = useMemo(() => {
        if (selectedCategory === 'all') return womenContent;
        return womenContent.filter(item => item.category === selectedCategory);
    }, [selectedCategory]);

    const dailyInspiration = useMemo(() => {
        return womenContent[Math.floor(Math.random() * womenContent.length)];
    }, []);

    const handleCategoryClick = (catId: string) => {
        if (catId === 'tracker') {
            setMode('tracker');
        } else {
            setSelectedCategory(catId);
            setMode('category');
        }
    };

    const renderDashboard = () => (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Hero Section */}
            <div className="relative h-64 rounded-[2.5rem] overflow-hidden mx-5 shadow-2xl">
                <img src={heroImage} alt="Hero" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent flex flex-col justify-end p-8">
                    <h2 className="text-3xl font-amiri font-bold text-white mb-2 leading-tight">روضة السكينة</h2>
                    <p className="text-white/70 text-sm font-bold">مساحتكِ الخاصة للنمو الروحي والمعرفي</p>
                </div>
            </div>

            {/* Daily Card */}
            <div className="px-5">
                <div className={`p-6 rounded-[2rem] relative overflow-hidden transition-all ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-100 shadow-sm'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <StarIcon className="w-12 h-12 text-gold-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-6 bg-pink-500 rounded-full" />
                        <span className={`text-xs font-bold ${isDark ? 'text-white/50' : 'text-slate-400'}`}>نفحة اليوم</span>
                    </div>
                    <p className={`font-amiri text-lg leading-loose mb-3 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {dailyInspiration.content}
                    </p>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-pink-500/80">{dailyInspiration.title}</span>
                        <DiamondIcon className="w-4 h-4 text-pink-500/20" />
                    </div>
                </div>
            </div>

            {/* Premium Tracker CTA (Stylish & Distinct) */}
            <div className="px-5">
                <button
                    onClick={() => setMode('tracker')}
                    className={`w-full relative overflow-hidden p-8 rounded-[2.5rem] transition-all duration-500 active:scale-[0.98] group ${
                        isDark 
                        ? 'bg-white/[0.03] border border-white/[0.08]' 
                        : 'bg-white border border-slate-100 shadow-xl shadow-blue-100/50'
                    }`}
                >
                    {/* Background Decorative Glows */}
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-[40px] transition-all group-hover:bg-blue-500/20" />
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/10 rounded-full blur-[40px] transition-all group-hover:bg-teal-500/20" />
                    
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex flex-col items-start gap-1">
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-blue-400' : 'text-blue-500'}`}>متابعة ذكية</span>
                            <h3 className={`text-2xl font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>مُـتابع الطهارة</h3>
                            <p className={`text-xs opacity-60 font-medium ${isDark ? 'text-white' : 'text-slate-600'}`}>نظامكِ الخاص لمتابعة الصلاة والحيض بخصوصية تامة</p>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl animate-pulse-ring" />
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 animate-float-slow">
                                <DropletIcon className="w-8 h-8" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-white/[0.05] flex items-center gap-2 justify-start opacity-40 group-hover:opacity-100 transition-all">
                        <SparkleIcon className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-[10px] font-bold">ابدئي رحلة التنظيم اليوم</span>
                    </div>
                </button>
            </div>

            {/* Categories Grid */}
            <div className="px-5 grid grid-cols-2 gap-4">
                {categories.filter(c => c.id !== 'tracker').map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={`group p-5 rounded-[2rem] transition-all relative overflow-hidden border active:scale-95 ${
                            isDark 
                            ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05]' 
                            : 'bg-white border-slate-100 hover:shadow-lg hover:border-slate-200'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center bg-gradient-to-br ${cat.color} text-white shadow-lg`}>
                            {cat.icon}
                        </div>
                        <h3 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{cat.label}</h3>
                        <p className={`text-[10px] leading-relaxed opacity-60 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{cat.description}</p>
                    </button>
                ))}
            </div>
            
            <div className="h-24" />
        </div>
    );

    const renderCategoryView = () => (
        <div className="px-5 space-y-4 animate-in fade-in slide-in-from-left-4 duration-500 pb-10" dir="rtl">
            <div className="pt-2 mb-2">
                <h2 className={`text-sm font-bold opacity-40 uppercase tracking-widest ${isDark ? 'text-pink-400' : 'text-pink-600'}`}>
                    محتوى {categories.find(c => c.id === selectedCategory)?.label}
                </h2>
            </div>

            {filteredContent.map((item) => (
                <div 
                    key={item.id} 
                    className={`p-6 rounded-[2.5rem] border transition-all relative overflow-hidden ${
                        isDark 
                        ? 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.05]' 
                        : 'bg-white border-slate-200 shadow-sm hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-xl bg-pink-500/10 text-pink-500`}>
                            <ScrollIcon className="w-5 h-5" />
                        </div>
                        <h3 className={`font-bold font-amiri text-lg flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {item.title}
                        </h3>
                    </div>
                    
                    <p className={`leading-loose font-amiri text-xl mb-4 text-center ${isDark ? 'text-white/90' : 'text-slate-700'}`}>
                        {item.content}
                    </p>
                    
                    {item.source && (
                        <div className="flex justify-start">
                            <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${isDark ? 'bg-white/5 text-white/40' : 'bg-slate-50 text-slate-400'}`}>
                                {item.source}
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const renderTrackerView = () => (
        <WomenTracker onBack={() => setMode('dashboard')} />
    );

    return (
        <div 
            ref={scrollContainerRef}
            className={`h-full overflow-y-auto hide-scrollbar pb-24 transition-colors duration-300 ${isDark ? 'bg-[#0a1220] text-white' : 'bg-[#f8fafc] text-slate-800'}`}
        >
            {/* Header (Hidden in Tracker Mode as Tracker has its own immersive header) */}
            {mode !== 'tracker' && (
                <div className={`px-5 pt-6 pb-4 sticky top-0 z-20 backdrop-blur-xl transition-all ${isDark ? 'bg-[#0a1220]/80' : 'bg-white/80 shadow-sm'}`}>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={mode === 'dashboard' ? onBack : () => setMode('dashboard')}
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.03] border border-white/[0.05]' : 'bg-white border border-slate-200 shadow-sm'}`}
                        >
                            <ChevronLeftIcon className={`w-5 h-5 rotate-180 ${isDark ? 'text-white/80' : 'text-slate-600'}`} />
                        </button>
                        <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            {mode === 'dashboard' ? 'خاص بالنساء' : categories.find(c => c.id === selectedCategory)?.label}
                        </h1>
                        <div className="w-11" />
                    </div>
                </div>
            )}

            {mode === 'dashboard' && renderDashboard()}
            {mode === 'category' && renderCategoryView()}
            {mode === 'tracker' && renderTrackerView()}
        </div>
    );
}
