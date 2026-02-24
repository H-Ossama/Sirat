import { useState, useEffect } from 'react';
import { fetchHadithBooks, fetchHadiths, HadithBook, Hadith, searchHadith } from '../services/hadithService';
import { ChevronLeftIcon, HadithIcon } from './Icons';
import { useBackHandler } from './BackHandlerContext';
import { useTheme } from './ThemeContext';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toPng } from 'html-to-image';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { logInteraction } from '../services/activityLogStore';

interface HadithScreenProps {
    onBack: () => void;
    onDetailViewChange?: (inDetails: boolean) => void;
}

const BOOK_ARABIC_NAMES: Record<string, string> = {
    'sahih-bukhari': 'صحيح البخاري',
    'sahih-muslim': 'صحيح مسلم',
    'al-tirmidhi': 'جامع الترمذي',
    'abu-dawood': 'سنن أبي داود',
    'sunan-abu-dawood': 'سنن أبي داود',
    'ibn-e-majah': 'سنن ابن ماجه',
    'sunan-ibn-e-majah': 'سنن ابن ماجه',
    'sunan-nasai': 'سنن النسائي',
    'mishkat-ul-masabih': 'مشكاة المصابيح',
    'mishkat-al-masabih': 'مشكاة المصابيح',
    'mishkat_al_masabih': 'مشكاة المصابيح',
    'mishkat_ul_masabih': 'مشكاة المصابيح',
    'mishkat-masabih': 'مشكاة المصابيح',
    'mishkat': 'مشكاة المصابيح',
    'musnad-ahmad': 'مسند أحمد',
    'musnad-ahmed': 'مسند أحمد',
    'al-silsila-sahiha': 'السلسلة الصحيحة',
    'silsila-sahiha': 'السلسلة الصحيحة',
    'riyad-us-saliheen': 'رياض الصالحين',
    'al-adab-al-mufrad': 'الأدب المفرد',
};

function normalizeArabic(text: string): string {
    if (!text) return '';
    return text
        .replace(/[\u064B-\u065F]/g, "") // Strip diacritics
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .toLowerCase();
}

// Topics with broader keyword sets for better matching
const TOPICS = [
    { id: 'all', label: 'الكل', keywords: [] },
    { id: 'prayer', label: 'الصلاة', keywords: ['صلاة', 'صلوات', 'وضوء', 'أذان', 'ركعة', 'سجود', 'قبلة', 'إمام', 'جماعة', 'فجر', 'ظهر', 'عصر', 'مغرب', 'عشاء'] },
    { id: 'fasting', label: 'الصيام', keywords: ['صيام', 'صوم', 'رمضان', 'إفطار', 'سحور', 'صائم', 'فطر'] },
    { id: 'zakat', label: 'الزكاة', keywords: ['زكاة', 'صدقة', 'إنفاق', 'مال', 'فقير', 'مسكين'] },
    { id: 'quran', label: 'القرآن', keywords: ['قرآن', 'تلاوة', 'حفظ', 'آية', 'سورة', 'قراءة'] },
    { id: 'manners', label: 'الأخلاق', keywords: ['أخلاق', 'آداب', 'حسن', 'معاملة', 'صدق', 'أمانة', 'رحمة', 'عدل'] },
    { id: 'dhikr', label: 'الذكر والدعاء', keywords: ['ذكر', 'دعاء', 'استغفار', 'تسبيح', 'تحميد', 'تكبير', 'صلاة على النبي'] },
    { id: 'family', label: 'الأسرة', keywords: ['أهل', 'زوج', 'زوجة', 'ولد', 'والدين', 'أسرة', 'أم', 'أب', 'أولاد'] },
    { id: 'knowledge', label: 'العلم', keywords: ['علم', 'تعلم', 'طالب', 'عالم', 'حكمة'] },
];

function getBookArabicName(book: HadithBook): string {
    const slug = book.bookSlug?.toLowerCase() || '';
    return BOOK_ARABIC_NAMES[slug] ?? book.bookName;
}

function filterByTopic(hadiths: Hadith[], topicId: string): Hadith[] {
    const topic = TOPICS.find(t => t.id === topicId);
    if (!topic || topic.keywords.length === 0) return hadiths;

    const normalizedKeywords = topic.keywords.map(kw => normalizeArabic(kw));

    return hadiths.filter(h => {
        const normalizedArabic = normalizeArabic(h.hadithArabic || '');
        const normalizedChapter = normalizeArabic(h.chapterName || '');
        const english = (h.hadithEnglish || '').toLowerCase();

        return normalizedKeywords.some(kw =>
            normalizedChapter.includes(kw) ||
            normalizedArabic.includes(kw) ||
            english.includes(kw)
        );
    });
}

function HadithCard({ hadith, isDark, isSaved, onToggleSave }: { hadith: Hadith; isDark: boolean; isSaved?: boolean; onToggleSave?: (hadith: Hadith) => void }) {
    const [showTrans, setShowTrans] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const bookArabicName = getBookArabicName({ bookSlug: hadith.bookSlug, bookName: hadith.bookName } as any);

    const handleCopy = async () => {
        const text = `« ${hadith.hadithArabic} »\n\nالمرجع: ${bookArabicName} - حديث رقم ${hadith.hadithNumber}\n\n(تم النسخ من تطبيق Sirat 🌙)`;
        await Clipboard.write({ string: text });
        Haptics.notification({ type: NotificationType.Success });
        logInteraction({
            type: 'hadith_copy',
            category: 'hadith',
            title: 'نسخ حديث',
            details: `${bookArabicName} - ${hadith.hadithNumber}`,
            meta: { hadithNumber: hadith.hadithNumber, bookSlug: hadith.bookSlug },
        });
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const cardElement = document.getElementById(`share-card-hadith-${hadith.hadithNumber}`);
            if (!cardElement) return;
            
            const dataUrl = await toPng(cardElement, { cacheBust: true, quality: 0.95 });
            const base64Data = dataUrl.split(',')[1];
            const fileName = `hadith_${hadith.hadithNumber}.png`;
            
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache
            });
            
            await Share.share({
                title: `حديث رقم ${hadith.hadithNumber}`,
                url: savedFile.uri,
                dialogTitle: 'مشاركة الحديث'
            });
        } catch (error) {
            console.error('Error sharing:', error);
            const text = `« ${hadith.hadithArabic} »\n\nالمرجع: ${bookArabicName} - حديث رقم ${hadith.hadithNumber}\n\n(تمت المشاركة عبر تطبيق Sirat 🌙)`;
            await Share.share({
                title: `حديث رقم ${hadith.hadithNumber}`,
                text: text,
                dialogTitle: 'مشاركة الحديث'
            });
        } finally {
            setIsSharing(false);
        }
        logInteraction({
            type: 'hadith_share',
            category: 'hadith',
            title: 'مشاركة حديث',
            details: `${bookArabicName} - ${hadith.hadithNumber}`,
            meta: { hadithNumber: hadith.hadithNumber, bookSlug: hadith.bookSlug },
        });
    };

    // Construct a verification link. Since we use hadithapi.com, we can link to a search on their site or sunnah.com
    // For simplicity and reliability, we'll use a direct link to hadithapi search if possible, 
    // or construction for sunnah.com which is the standard.
    const getVerificationLink = () => {
        const slugMap: Record<string, string> = {
            'sahih-bukhari': 'bukhari',
            'sahih-muslim': 'muslim',
            'al-tirmidhi': 'tirmidhi',
            'abu-dawood': 'abudawud',
            'ibn-e-majah': 'ibnmajah',
            'sunan-nasai': 'nasai',
            'riyad-us-saliheen': 'riyadussalihin',
            'al-adab-al-mufrad': 'adab',
        };
        const sunnahSlug = slugMap[hadith.bookSlug];
        if (sunnahSlug) {
            return `https://sunnah.com/${sunnahSlug}:${hadith.hadithNumber}`;
        }
        return `https://www.google.com/search?q=${encodeURIComponent(hadith.bookName + ' ' + hadith.hadithNumber)}`;
    };

    const getStatusStyles = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s.includes('sahih') || s.includes('صحيح')) {
            return isDark ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100';
        }
        if (s.includes('hasan') || s.includes('حسن')) {
            return isDark ? 'bg-blue-400/10 text-blue-400 border-blue-400/20' : 'bg-blue-50 text-blue-600 border-blue-100';
        }
        if (s.includes('daif') || s.includes('daeef') || s.includes('ضعيف')) {
            return isDark ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-amber-50 text-amber-600 border-amber-100';
        }
        if (s.includes('mauzu') || s.includes('fabricated') || s.includes('موضوع')) {
            return isDark ? 'bg-rose-400/10 text-rose-400 border-rose-400/20' : 'bg-rose-50 text-rose-600 border-rose-100';
        }
        return isDark ? 'bg-slate-400/10 text-slate-400 border-slate-400/20' : 'bg-slate-50 text-slate-600 border-slate-100';
    };

    return (
        <>
            {/* Hidden Share Card */}
            <div className="fixed -left-[9999px] top-0">
                <div
                    id={`share-card-hadith-${hadith.hadithNumber}`}
                    className="w-[1080px] min-h-[1080px] bg-[#0f172a] relative overflow-hidden flex flex-col"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at 0% 0%, rgba(250, 204, 21, 0.15) 0%, transparent 50%),
                            radial-gradient(circle at 100% 100%, rgba(250, 204, 21, 0.1) 0%, transparent 50%)
                        `
                    }}
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                        <div className="absolute top-10 left-10 w-32 h-32 border border-gold-500/20 rounded-full" />
                        <div className="absolute bottom-10 right-10 w-48 h-48 border border-gold-500/20 rounded-full" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-gold-500/10 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="p-12 flex justify-between items-center border-b border-white/10 bg-white/5 backdrop-blur-sm relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
                                <svg className="w-8 h-8 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white font-amiri mb-1">تطبيق Sirat</h1>
                                <p className="text-gold-400 text-lg">Sirat App</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-white mb-2">{bookArabicName}</div>
                            <div className="text-gold-400 text-xl">حديث رقم {hadith.hadithNumber}</div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col items-center justify-center p-16 relative z-10">
                        <div className="w-full max-w-4xl relative">
                            <svg className="absolute -top-12 -right-12 w-24 h-24 text-gold-500/20 transform rotate-180" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                            </svg>
                            
                            <p className="text-5xl leading-[2.2] text-white text-center font-scheherazade mb-12" dir="rtl">
                                {hadith.hadithArabic}
                            </p>

                            <svg className="absolute -bottom-12 -left-12 w-24 h-24 text-gold-500/20" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                            </svg>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 text-center border-t border-white/10 bg-white/5 backdrop-blur-sm relative z-10">
                        <p className="text-white/60 text-xl">حمل تطبيق Sirat الآن</p>
                    </div>
                </div>
            </div>

            <div className={`animate-fade-in p-5 rounded-3xl border transition-all ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-4 flex-row-reverse">
                    <a
                        href={getVerificationLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[10px] px-3 py-1 rounded-full border font-bold flex items-center gap-2 transition-all active:scale-95 group ${isDark ? 'bg-gold-400/10 text-gold-300 border-gold-400/20 hover:bg-gold-400/20' : 'bg-gold-50 text-gold-600 border-gold-100 hover:bg-gold-100'}`}
                    >
                        <span className="opacity-60">المرجع: {bookArabicName}</span>
                        <span className="w-1 h-1 rounded-full bg-current opacity-20"></span>
                        <span>حديث رقم {hadith.hadithNumber}</span>
                        <svg className={`w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity ${isDark ? 'text-gold-300' : 'text-gold-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>

                    {hadith.hadithStatus && hadith.hadithStatus.trim() !== '' && (
                        <span className={`text-[10px] px-3 py-1 rounded-full border font-bold ${getStatusStyles(hadith.hadithStatus)}`}>
                            {hadith.hadithStatus}
                        </span>
                    )}
                </div>

                <p className={`text-[20px] font-scheherazade leading-[1.8] text-right mb-4 selection:bg-gold-400/30 ${isDark ? 'text-white' : 'text-slate-800'}`} dir="rtl">
                    {hadith.hadithArabic}
                </p>

                {showTrans && hadith.hadithEnglish && (
                    <p className={`text-[14px] leading-relaxed italic border-t pt-4 mb-4 animate-fade-in ${isDark ? 'text-white/60 border-white/[0.05]' : 'text-slate-500 border-slate-100'}`}>
                        {hadith.hadithEnglish}
                    </p>
                )}

                <div className="flex items-center justify-between mt-2 flex-row-reverse">
                    <div className={`text-[11px] font-bold flex items-center gap-1.5 ${isDark ? 'text-gold-400/60' : 'text-slate-400'}`}>
                        {hadith.chapterName && <span className="truncate max-w-[180px] text-right" dir="rtl">{hadith.chapterName}</span>}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className={`p-2 rounded-full transition-all active:scale-95 ${isDark ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                            title="نسخ"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>

                        <button
                            onClick={handleShare}
                            disabled={isSharing}
                            className={`p-2 rounded-full transition-all active:scale-95 ${isSharing ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                            title="مشاركة"
                        >
                            {isSharing ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={() => onToggleSave?.(hadith)}
                            className={`p-2 rounded-full transition-all active:scale-95 ${isSaved
                                ? isDark ? 'text-gold-400 bg-gold-400/10' : 'text-gold-600 bg-gold-50'
                                : isDark ? 'hover:bg-white/5 text-white/40 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
                                }`}
                            title={isSaved ? "إزالة من المحفوظات" : "حفظ"}
                        >
                            <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>

                        {hadith.hadithEnglish && (
                            <button
                                onClick={() => setShowTrans(v => !v)}
                                className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all active:scale-95 ${showTrans
                                    ? isDark ? 'bg-gold-400/15 border-gold-400/30 text-gold-300' : 'bg-gold-100 border-gold-200 text-gold-700'
                                    : isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/30' : 'bg-slate-100 border-slate-200 text-slate-400'
                                    }`}
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    {showTrans
                                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        : <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
                                </svg>
                                {showTrans ? 'إخفاء' : 'الترجمة'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export function HadithScreen({ onBack, onDetailViewChange }: HadithScreenProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';

    type ViewMode = 'books' | 'hadiths' | 'search';
    const [viewMode, setViewMode] = useState<ViewMode>('books');
    const [books, setBooks] = useState<HadithBook[]>([]);
    const [selectedBook, setSelectedBook] = useState<HadithBook | null>(null);
    const [selectedTopic, setSelectedTopic] = useState<string>('all');
    const [hadiths, setHadiths] = useState<Hadith[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingHadiths, setLoadingHadiths] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [filterLoading, setFilterLoading] = useState(false);
    const [savedHadiths, setSavedHadiths] = useState<Hadith[]>(() => {
        const saved = localStorage.getItem('savedHadiths');
        return saved ? JSON.parse(saved) : [];
    });

    const handleToggleSaveHadith = (hadith: Hadith) => {
        setSavedHadiths(prev => {
            const isSaved = prev.some(h => h.hadithNumber === hadith.hadithNumber && h.bookSlug === hadith.bookSlug);
            let newSaved;
            if (isSaved) {
                newSaved = prev.filter(h => !(h.hadithNumber === hadith.hadithNumber && h.bookSlug === hadith.bookSlug));
                logInteraction({
                    type: 'hadith_unsave',
                    category: 'hadith',
                    title: 'إزالة حديث من المحفوظات',
                    details: `${getBookArabicName({ bookSlug: hadith.bookSlug, bookName: hadith.bookName } as any)} - ${hadith.hadithNumber}`,
                    meta: { hadithNumber: hadith.hadithNumber, bookSlug: hadith.bookSlug },
                });
            } else {
                newSaved = [...prev, hadith];
                logInteraction({
                    type: 'hadith_save',
                    category: 'hadith',
                    title: 'حفظ حديث',
                    details: `${getBookArabicName({ bookSlug: hadith.bookSlug, bookName: hadith.bookName } as any)} - ${hadith.hadithNumber}`,
                    meta: { hadithNumber: hadith.hadithNumber, bookSlug: hadith.bookSlug },
                });
            }
            localStorage.setItem('savedHadiths', JSON.stringify(newSaved));
            return newSaved;
        });
    };

    const canGoBack = viewMode !== 'books';

    useEffect(() => {
        onDetailViewChange?.(viewMode !== 'books');
    }, [viewMode, onDetailViewChange]);

    useBackHandler(() => {
        if (canGoBack) {
            setViewMode('books');
            setSelectedBook(null);
            setHadiths([]);
            setSearch('');
            setSelectedTopic('all');
            return true;
        }
        return false;
    }, canGoBack);

    useEffect(() => {
        const loadBooks = async () => {
            try {
                const data = await fetchHadithBooks();
                // Filter out books with 0 hadiths as requested
                const filteredBooks = data.filter(book => parseInt(book.hadiths_count) > 0);
                setBooks(filteredBooks);
            } catch (err) {
                console.error('Error loading hadith books:', err);
            } finally {
                setLoading(false);
            }
        };
        loadBooks();
    }, []);

    const handleBookClick = async (book: HadithBook) => {
        setSelectedBook(book);
        setSelectedTopic('all');
        setLoadingHadiths(true);
        setPage(1);
        setViewMode('hadiths');
        logInteraction({
            type: 'hadith_open_book',
            category: 'hadith',
            title: 'فتح كتاب حديث',
            details: getBookArabicName(book),
            meta: { bookSlug: book.bookSlug },
        });
        try {
            // Load first 3 pages at once for better topic filtering
            const [p1, p2, p3] = await Promise.allSettled([
                fetchHadiths(book.bookSlug, 1),
                fetchHadiths(book.bookSlug, 2),
                fetchHadiths(book.bookSlug, 3),
            ]);
            const combined: Hadith[] = [];
            if (p1.status === 'fulfilled') combined.push(...p1.value);
            if (p2.status === 'fulfilled') combined.push(...p2.value);
            if (p3.status === 'fulfilled') combined.push(...p3.value);
            setHadiths(combined);
            setPage(3);
        } catch (err) {
            console.error('Error loading hadiths:', err);
        } finally {
            setLoadingHadiths(false);
        }
    };

    const handleTopicChange = async (topicId: string) => {
        setSelectedTopic(topicId);
        logInteraction({
            type: 'hadith_change_topic',
            category: 'hadith',
            title: 'تغيير موضوع الأحاديث',
            details: TOPICS.find(t => t.id === topicId)?.label || topicId,
            meta: { topicId },
        });
        // If filtering and we have few results, load more pages
        if (topicId !== 'all' && selectedBook) {
            const filtered = filterByTopic(hadiths, topicId);
            if (filtered.length < 5 && !filterLoading) {
                setFilterLoading(true);
                try {
                    const morePagesData = await Promise.allSettled([
                        fetchHadiths(selectedBook.bookSlug, page + 1),
                        fetchHadiths(selectedBook.bookSlug, page + 2),
                        fetchHadiths(selectedBook.bookSlug, page + 3),
                        fetchHadiths(selectedBook.bookSlug, page + 4),
                        fetchHadiths(selectedBook.bookSlug, page + 5),
                    ]);
                    const extra: Hadith[] = [];
                    morePagesData.forEach(r => { if (r.status === 'fulfilled') extra.push(...r.value); });
                    setHadiths(prev => [...prev, ...extra]);
                    setPage(p => p + 5);
                } catch (e) {
                    console.error(e);
                } finally {
                    setFilterLoading(false);
                }
            }
        }
    };

    const loadMore = async () => {
        if (!selectedBook || loadingMore) return;
        logInteraction({
            type: 'hadith_load_more',
            category: 'hadith',
            title: 'تحميل المزيد من الأحاديث',
            details: getBookArabicName(selectedBook),
            meta: { page: page + 1 },
        });
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const data = await fetchHadiths(selectedBook.bookSlug, nextPage);
            setHadiths(prev => [...prev, ...data]);
            setPage(nextPage);
        } catch (err) {
            console.error('Error loading more hadiths:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSearch = async () => {
        if (!search.trim()) return;
        logInteraction({
            type: 'hadith_search',
            category: 'hadith',
            title: 'بحث في الأحاديث',
            details: search.trim(),
            meta: { queryLength: search.trim().length },
        });
        setLoadingHadiths(true);
        setSelectedBook(null);
        setViewMode('search');
        try {
            const data = await searchHadith(search);
            setHadiths(data);
        } catch (err) {
            console.error('Error searching hadiths:', err);
        } finally {
            setLoadingHadiths(false);
        }
    };

    const displayedHadiths = viewMode === 'hadiths' ? filterByTopic(hadiths, selectedTopic) : hadiths;

    // ── Hadith list view ──
    if (viewMode === 'hadiths' || viewMode === 'search') {
        return (
            <div className={`h-full flex flex-col transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                <div className={`px-5 pt-4 pb-3 border-b sticky top-0 z-20 backdrop-blur-xl transition-all ${isDark ? 'bg-[#0b1929]/95 border-white/[0.08]' : 'bg-white/80 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => { setViewMode('books'); setSelectedBook(null); setHadiths([]); setSearch(''); setSelectedTopic('all'); }}
                            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}
                        >
                            <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${isDark ? 'text-white/80' : 'text-slate-600'}`} />
                        </button>
                        <div className="text-center">
                            <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>
                                {viewMode === 'search' ? 'نتائج البحث' : (selectedBook ? getBookArabicName(selectedBook) : '')}
                            </h1>
                            <p className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-white/60' : 'text-slate-400'}`}>
                                {filterLoading ? 'جاري البحث...' : `${displayedHadiths.length} حديث`}
                            </p>
                        </div>
                        <div className="w-10" />
                    </div>

                    {/* Topic filter chips */}
                    {viewMode === 'hadiths' && (
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-row-reverse">
                            {TOPICS.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTopicChange(t.id)}
                                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${selectedTopic === t.id
                                        ? isDark ? 'bg-gold-400/20 border-gold-400/40 text-gold-300' : 'bg-gold-500 border-gold-500 text-white'
                                        : isDark ? 'bg-white/[0.04] border-white/[0.08] text-white/40' : 'bg-white border-slate-200 text-slate-400'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`flex-1 overflow-y-auto hide-scrollbar px-5 py-5`}>
                    {loadingHadiths && hadiths.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-16 opacity-60">
                            <div className={`w-8 h-8 border-2 rounded-full animate-spin mb-4 ${isDark ? 'border-gold-400/30 border-t-gold-400' : 'border-gold-500/20 border-t-gold-500'}`} />
                            <p className={`text-[14px] font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>جاري تحميل الأحاديث الشريفة...</p>
                        </div>
                    ) : filterLoading && displayedHadiths.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-60">
                            <div className={`w-8 h-8 border-2 rounded-full animate-spin mb-4 ${isDark ? 'border-gold-400/30 border-t-gold-400' : 'border-gold-500/20 border-t-gold-500'}`} />
                            <p className={`text-[14px] font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>جاري البحث في الأحاديث...</p>
                        </div>
                    ) : displayedHadiths.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <HadithIcon className={`w-12 h-12 mb-4 ${isDark ? 'text-white/20' : 'text-slate-300'}`} />
                            <p className={`text-[15px] font-amiri font-bold ${isDark ? 'text-white/40' : 'text-slate-400'}`}>لا توجد أحاديث في هذا الموضوع</p>
                            <p className={`text-[12px] mt-2 ${isDark ? 'text-white/25' : 'text-slate-300'}`}>جرب موضوعاً آخر أو اختر "الكل"</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {displayedHadiths.map((hadith, idx) => (
                                <HadithCard 
                                    key={idx} 
                                    hadith={hadith} 
                                    isDark={isDark} 
                                    isSaved={savedHadiths.some(h => h.hadithNumber === hadith.hadithNumber && h.bookSlug === hadith.bookSlug)}
                                    onToggleSave={handleToggleSaveHadith}
                                />
                            ))}

                            {viewMode === 'hadiths' && selectedTopic === 'all' && (
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className={`w-full py-4 rounded-2xl border font-amiri font-bold active:scale-95 transition-all outline-none ${isDark ? 'bg-white/[0.05] border-white/[0.1] text-gold-300' : 'bg-white border-slate-200 text-gold-600 hover:bg-slate-50'}`}
                                >
                                    {loadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="h-10" />
                </div>
            </div>
        );
    }

    // ── Books list view ──
    return (
        <div className={`h-full flex flex-col transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-800'}`}>
            <div className={`px-5 pt-5 pb-4 sticky top-0 z-20 shadow-md transition-all ${isDark ? 'bg-[#0b1929]/90 backdrop-blur-xl' : 'bg-white/90 border-b border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={onBack} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.08] border border-white/[0.1]' : 'bg-slate-100 border border-slate-200'}`}>
                        <ChevronLeftIcon className={`w-4 h-4 rotate-180 ${isDark ? 'text-white/80' : 'text-slate-600'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>السنة النبوية</h1>
                    <div className="w-10" />
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="ابحث برقم الحديث (مثلاً: 1)..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className={`w-full border rounded-2xl px-5 py-3 text-[14px] outline-none transition-all text-right shadow-inner ${isDark ? 'bg-black/40 border-white/[0.1] text-white placeholder:text-white/30 focus:border-gold-400/50' : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-gold-300'}`}
                        dir="rtl"
                    />
                    <button onClick={handleSearch} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-gold-400 hover:text-gold-300' : 'text-gold-500 hover:text-gold-600'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-5 py-4 pb-20 mt-safe-bottom">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 opacity-60">
                        <div className={`w-8 h-8 border-2 rounded-full animate-spin mb-4 ${isDark ? 'border-gold-400/30 border-t-gold-400' : 'border-gold-500/20 border-t-gold-500'}`} />
                        <p className={`text-[12px] font-bold ${isDark ? 'text-white/70' : 'text-slate-400'}`}>جاري إحضار الكتب...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {books.map((book) => (
                            <button
                                key={book.bookSlug}
                                onClick={() => handleBookClick(book)}
                                className={`flex items-center justify-between p-4 rounded-3xl border active:scale-[0.98] transition-all text-right shadow-sm group ${isDark ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-4 flex-row-reverse">
                                    <div>
                                        <p className={`text-[17px] font-amiri font-bold transition-colors ${isDark ? 'text-white group-hover:text-gold-300' : 'text-slate-800'}`}>
                                            {getBookArabicName(book)}
                                        </p>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-slate-400'}`}>
                                            {book.hadiths_count} حديث
                                        </p>
                                    </div>
                                </div>
                                <ChevronLeftIcon className={`w-4 h-4 transition-colors ${isDark ? 'text-white/10 group-hover:text-gold-400/30' : 'text-slate-300 group-hover:text-gold-500'}`} />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
