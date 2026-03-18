import { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, BookIcon, DownloadIcon, CheckIcon, SearchIcon, ShareIcon, TrashIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { Book, shamelaBooks as localShamelaBooks, sirajBooks, allBooks } from '../data/booksData';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { PdfViewer } from './PdfViewer';
import { shamelaService, ShamelaBook } from '../services/shamelaService';

interface BooksScreenProps {
    onBack: () => void;
}

export function BooksScreen({ onBack }: BooksScreenProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<'siraj' | 'shamela' | 'downloaded'>('siraj');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [pdfLocalUri, setPdfLocalUri] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Shamela Cloud States
    const [shamelaIndex, setShamelaIndex] = useState<ShamelaBook[]>([]);
    const [isSyncingShamela, setIsSyncingShamela] = useState(false);
    const [syncCount, setSyncCount] = useState(0);

    const [autoDownload, setAutoDownload] = useState(() => {
        const saved = localStorage.getItem('auto_download_books');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [showAutoDownloadPopup, setShowAutoDownloadPopup] = useState(false);
    const [downloadedBooks, setDownloadedBooks] = useState<string[]>(() => {
        const saved = localStorage.getItem('downloaded_books');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('auto_download_books', JSON.stringify(autoDownload));
    }, [autoDownload]);

    useEffect(() => {
        // Load Shamela local index
        const cached = shamelaService.getCachedIndex();
        setShamelaIndex(cached);
    }, []);

    const handleSyncShamela = async () => {
        setIsSyncingShamela(true);
        setSyncCount(0);
        try {
            const index = await shamelaService.syncMasterIndex((count) => setSyncCount(count));
            setShamelaIndex(index);
        } catch (error) {
            console.error('Failed to sync Shamela catalog:', error);
            alert('فشل تحديث الكتالوج. يرجى المحاولة لاحقاً.');
        } finally {
            setIsSyncingShamela(false);
        }
    };

    const handleToggleAutoDownload = () => {
        const newValue = !autoDownload;
        setAutoDownload(newValue);
        if (!newValue) {
            setShowAutoDownloadPopup(true);
            setTimeout(() => setShowAutoDownloadPopup(false), 10000);
        }
    };

    const openBook = async (book: Book) => {
        if (!book.downloadUrl) return;
        
        const isDownloaded = downloadedBooks.includes(book.id);
        const fileName = `${book.id}.pdf`;
        const directory = isDownloaded || autoDownload ? Directory.Data : Directory.Cache;
        const path = `books/${fileName}`;

        try {
            // Check if file already exists
            const stat = await Filesystem.stat({ path, directory });
            if (stat) {
                const uri = await Filesystem.getUri({ path, directory });
                setPdfLocalUri(Capacitor.convertFileSrc(uri.uri));
                setSelectedBook(book);
                return;
            }
        } catch (e) {
            // File doesn't exist, proceed to download
        }

        setIsDownloading(true);
        setDownloadProgress(0);
        setSelectedBook(book); // Show loading state in viewer

        try {
            // Ensure directory exists
            try {
                await Filesystem.mkdir({ path: 'books', directory, recursive: true });
            } catch (e) {
                // Ignore if exists
            }

            const result = await Filesystem.downloadFile({
                url: book.downloadUrl,
                path,
                directory,
                progress: true,
            });

            // Listen to progress (Capacitor 4+ supports this via addListener, but for simplicity we just wait)
            // In a real app, you'd use CapacitorHttp or a plugin that supports progress callbacks better.

            const uri = await Filesystem.getUri({ path, directory });
            setPdfLocalUri(Capacitor.convertFileSrc(uri.uri));

            if (autoDownload && !isDownloaded) {
                const newDownloaded = [...downloadedBooks, book.id];
                setDownloadedBooks(newDownloaded);
                localStorage.setItem('downloaded_books', JSON.stringify(newDownloaded));
            }
        } catch (error) {
            console.error('Error downloading book:', error);
            setSelectedBook(null);
            setPdfLocalUri(null);
            alert('حدث خطأ أثناء تحميل الكتاب. يرجى التحقق من اتصالك بالإنترنت.');
        } finally {
            setIsDownloading(false);
        }
    };

    const closeBook = async () => {
        if (selectedBook && !autoDownload && !downloadedBooks.includes(selectedBook.id)) {
            // Delete temporary file
            try {
                await Filesystem.deleteFile({
                    path: `books/${selectedBook.id}.pdf`,
                    directory: Directory.Cache
                });
            } catch (e) {
                console.error('Failed to delete temp book:', e);
            }
        }
        setSelectedBook(null);
        setPdfLocalUri(null);
    };

    const handleManualDownload = async (e: React.MouseEvent, book: Book) => {
        e.stopPropagation();
        if (downloadedBooks.includes(book.id) || !book.downloadUrl) return;

        setIsDownloading(true);
        try {
            await Filesystem.mkdir({ path: 'books', directory: Directory.Data, recursive: true }).catch(() => {});
            await Filesystem.downloadFile({
                url: book.downloadUrl,
                path: `books/${book.id}.pdf`,
                directory: Directory.Data,
            });
            const newDownloaded = [...downloadedBooks, book.id];
            setDownloadedBooks(newDownloaded);
            localStorage.setItem('downloaded_books', JSON.stringify(newDownloaded));
        } catch (error) {
            console.error('Manual download failed:', error);
            alert('فشل التنزيل. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDeleteBook = async (e: React.MouseEvent, book: Book) => {
        e.stopPropagation();
        if (!window.confirm(`هل أنت متأكد من حذف كتاب "${book.title}"؟`)) return;

        try {
            await Filesystem.deleteFile({
                path: `books/${book.id}.pdf`,
                directory: Directory.Data
            });
            const newDownloaded = downloadedBooks.filter(id => id !== book.id);
            setDownloadedBooks(newDownloaded);
            localStorage.setItem('downloaded_books', JSON.stringify(newDownloaded));
        } catch (error) {
            console.error('Delete book failed:', error);
            alert('فشل حذف الكتاب. قد يكون الملف محذوفاً بالفعل.');
            // Still update state to match reality
            const newDownloaded = downloadedBooks.filter(id => id !== book.id);
            setDownloadedBooks(newDownloaded);
            localStorage.setItem('downloaded_books', JSON.stringify(newDownloaded));
        }
    };

    const mappedShamelaBooks = useMemo(() => {
        // First get the hardcoded local shamela books
        const local = localShamelaBooks;
        
        // Then map the synced shamela index
        const cloud = shamelaIndex.map(sb => ({
            id: `shamela_${sb.id}`,
            title: sb.name,
            author: sb.author,
            coverUrl: `https://covers.islamway.net/books/${Math.floor(sb.id/100)}/${sb.id}.jpg`, // Estimated cover URL
            source: 'shamela' as const,
            downloadUrl: shamelaService.getPdfUrl(sb.id),
        } as Book));

        // Combine both (or prioritize local)
        return [...local, ...cloud];
    }, [shamelaIndex]);

    const currentBooksList = useMemo(() => {
        if (activeTab === 'downloaded') {
            // Include both static books and discovered cloud books that were downloaded
            const locals = allBooks.filter(b => downloadedBooks.includes(b.id));
            const clouds = mappedShamelaBooks.filter(b => downloadedBooks.includes(b.id) && !allBooks.find(ab => ab.id === b.id));
            return [...locals, ...clouds];
        }
        if (activeTab === 'shamela') {
            return mappedShamelaBooks;
        }
        return sirajBooks;
    }, [activeTab, downloadedBooks, mappedShamelaBooks]);

    const filteredBooks = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return currentBooksList.slice(0, 100);
        
        // Filter first then slice to prevent lagging with thousands of results
        return currentBooksList.filter(b => 
            b.title.toLowerCase().includes(q) || 
            b.author.toLowerCase().includes(q)
        ).slice(0, 100);
    }, [currentBooksList, searchQuery]);
    
    if (selectedBook) {
        return (
            <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a1220]' : 'bg-[#f0f2f5]'}`}>
                {/* PDF Viewer Container */}
                <div className="flex-1 overflow-hidden relative">
                    {isDownloading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className={`font-cairo text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>جاري تحميل الكتاب...</p>
                            <p className={`font-cairo text-sm mt-2 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>يرجى الانتظار</p>
                        </div>
                    ) : pdfLocalUri ? (
                        <PdfViewer 
                            url={pdfLocalUri} 
                            title={selectedBook.title} 
                            onClose={closeBook} 
                            onDelete={downloadedBooks.includes(selectedBook.id) ? () => {
                                handleDeleteBook({ stopPropagation: () => {} } as any, selectedBook);
                                closeBook();
                            } : undefined}
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="font-cairo text-lg text-red-500">تعذر تحميل الكتاب</p>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={`h-full overflow-y-auto hide-scrollbar pb-24 transition-colors duration-300 ${isDark ? 'bg-[#0a1220] text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header */}
            <div className={`px-5 pt-6 pb-2 sticky top-0 z-20 backdrop-blur-xl transition-all ${isDark ? 'bg-[#0a1220]/95 border-b border-white/[0.05]' : 'bg-white/95 border-b border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={onBack}
                        className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.1]' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                        <ChevronLeftIcon className={`w-5 h-5 rotate-180 ${isDark ? 'text-white/80' : 'text-slate-600'}`} />
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        المكتبة الإسلامية
                    </h1>
                     <div className="w-10" />
                </div>

                {/* Tabs */}
                <div className={`p-1 rounded-xl flex items-center mb-4 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`} dir="rtl">
                    <button
                        onClick={() => setActiveTab('siraj')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative overflow-hidden ${activeTab === 'siraj' 
                             ? (isDark ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-emerald-600 shadow-sm') 
                             : (isDark ? 'text-white/40 hover:text-white/60' : 'text-slate-400 hover:text-slate-600')}`}
                    >
                        موقع سراج
                         {activeTab === 'siraj' && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('shamela')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative overflow-hidden ${activeTab === 'shamela' 
                            ? (isDark ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 shadow-sm') 
                            : (isDark ? 'text-white/40 hover:text-white/60' : 'text-slate-400 hover:text-slate-600')}`}
                    >
                        المكتبة الشاملة
                        {activeTab === 'shamela' && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('downloaded')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all relative overflow-hidden ${activeTab === 'downloaded' 
                            ? (isDark ? 'bg-amber-600 text-white shadow-lg' : 'bg-white text-amber-600 shadow-sm') 
                            : (isDark ? 'text-white/40 hover:text-white/60' : 'text-slate-400 hover:text-slate-600')}`}
                    >
                        الكتب المحملة
                        {activeTab === 'downloaded' && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                    </button>
                </div>

                {/* Auto Download Toggle */}
                <div className={`flex items-center justify-between mb-4 px-2 ${isDark ? 'text-white/80' : 'text-slate-600'}`} dir="rtl">
                    <span className="text-sm font-bold font-cairo">الاحتفاظ بالكتب المحملة (تحميل تلقائي)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={autoDownload} onChange={handleToggleAutoDownload} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                    </label>
                </div>

                {/* Auto Download Warning Popup */}
                {showAutoDownloadPopup && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-500/30 flex items-start gap-3 animate-fade-in" dir="rtl">
                        <div className="text-amber-500 mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-cairo text-amber-800 dark:text-amber-200 leading-relaxed">
                                لتوفير مساحة التخزين، يتم تحميل هذا الكتاب مؤقتاً للقراءة وسيتم حذفه عند الإغلاق. يمكنك تفعيل 'التحميل التلقائي' أو النقر على زر التحميل للاحتفاظ بالكتاب بشكل دائم، علماً أن التحميل المؤقت يستهلك بيانات الشبكة في كل مرة.
                            </p>
                        </div>
                        <button onClick={() => setShowAutoDownloadPopup(false)} className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>
                )}
                
                 {/* Search */}
                <div className={`relative rounded-xl overflow-hidden transition-all ${isDark ? 'bg-white/5 focus-within:bg-white/10' : 'bg-slate-100 focus-within:bg-white focus-within:ring-2 ring-indigo-500/20'}`} dir="rtl">
                    <div className="absolute right-3 top-3 pointer-events-none">
                        <SearchIcon className={`w-4 h-4 ${isDark ? 'text-white/30' : 'text-slate-400'}`} />
                    </div>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث عن كتاب أو مؤلف..."
                        className="w-full py-2.5 pr-10 pl-4 bg-transparent border-none outline-none text-sm font-bold placeholder:font-normal"
                    />
                </div>
            </div>

            {/* Content List */}
            <div className="p-4 grid grid-cols-2 gap-4" dir="rtl">
                {activeTab === 'shamela' && shamelaIndex.length === 0 && (
                    <div className={`col-span-2 p-8 rounded-3xl text-center flex flex-col items-center ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-500'}`}>
                            <DownloadIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold font-cairo mb-2">تحديث كتالوج المكتبة الشاملة</h3>
                        <p className={`text-sm mb-6 ${isDark ? 'text-white/60' : 'text-slate-500'}`}>
                            تحميل قائمة الكتب (8500+ كتاب) للبحث والتحميل المباشر. 
                        </p>
                        <button
                            onClick={handleSyncShamela}
                            disabled={isSyncingShamela}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                isSyncingShamela 
                                ? 'bg-indigo-400 cursor-not-allowed text-white' 
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30'
                            }`}
                        >
                            {isSyncingShamela ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    جاري التحميل... ({syncCount})
                                </>
                            ) : (
                                <>
                                    <DownloadIcon className="w-4 h-4" />
                                    تحديث الآن
                                </>
                            )}
                        </button>
                    </div>
                )}

                {filteredBooks.map((book) => {
                    const isDownloaded = downloadedBooks.includes(book.id);
                    return (
                        <div 
                            key={book.id} 
                            onClick={() => openBook(book)}
                            className={`group relative flex flex-col rounded-2xl overflow-hidden transition-all cursor-pointer border ${
                                isDark 
                                ? 'bg-[#152033] border-white/5 hover:border-white/10' 
                                : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1'
                            }`}
                        >
                            {/* Cover Image Container */}
                            <div className="aspect-[2/3] w-full bg-slate-200 relative overflow-hidden">
                                {book.coverUrl ? (
                                    <img 
                                        src={book.coverUrl} 
                                        alt={book.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        onError={(e) => {
                                            // Prevent infinite loop if fallback fails
                                            const target = e.target as HTMLImageElement;
                                            if (target.src.includes('placeholder')) {
                                                target.style.display = 'none'; // Hide if even placeholder fails
                                                return;
                                            }
                                            // Fallback to a simpler, more reliable placeholder or hide
                                            target.src = 'https://placehold.co/300x450?text=No+Cover'; 
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-200">
                                        <BookIcon className="w-12 h-12" />
                                    </div>
                                )}
                                
                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
                                
                                {/* Absolute Download Button */}
                                {book.downloadUrl && !isDownloaded && (
                                    <button
                                        onClick={(e) => handleManualDownload(e, book)}
                                        className={`absolute bottom-2 right-2 p-2 rounded-full backdrop-blur-md transition-all active:scale-90 bg-white/20 hover:bg-white/40 text-white`}
                                        title="تحميل الكتاب"
                                    >
                                        <DownloadIcon className="w-4 h-4" />
                                    </button>
                                )}
                                {isDownloaded && (
                                    <>
                                        <div className="absolute bottom-2 right-2 p-2 rounded-full backdrop-blur-md bg-emerald-500/80 text-white" title="تم التحميل">
                                            <CheckIcon className="w-4 h-4" />
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteBook(e, book)}
                                            className="absolute top-2 right-2 p-2 rounded-full backdrop-blur-md transition-all active:scale-90 bg-red-500/80 text-white hover:bg-red-600/90"
                                            title="حذف الكتاب"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Book Info */}
                            <div className="p-3 flex-1 flex flex-col">
                                <h3 className={`font-bold font-amiri text-base leading-tight mb-1 line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                    {book.title}
                                </h3>
                                <p className={`text-[10px] mb-auto ${isDark ? 'text-white/50' : 'text-slate-500'}`}>
                                    {book.author}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {filteredBooks.length === 0 && (
                     <div className="col-span-2 flex flex-col items-center justify-center py-20 opacity-50 text-center">
                        <BookIcon className="w-12 h-12 mb-4" />
                        <p>
                            {activeTab === 'downloaded' && searchQuery === '' 
                                ? 'لا توجد كتب محملة حالياً' 
                                : 'لا توجد كتب مطابقة للبحث'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
