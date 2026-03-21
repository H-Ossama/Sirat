import { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, BookIcon, DownloadIcon, CheckIcon, ShareIcon, TrashIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { Book, sirajBooks, allBooks } from '../data/booksData';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { PdfViewer } from './PdfViewer';
import { useBackHandler } from './BackHandlerContext';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SearchIcon } from './Icons';

interface BooksScreenProps {
    onBack: () => void;
}

export function BooksScreen({ onBack }: BooksScreenProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
    const [downloadedBooks, setDownloadedBooks] = useState<string[]>(() => {
        const saved = localStorage.getItem('downloaded_books');
        return saved ? JSON.parse(saved) : [];
    });
    const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
    const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useBackHandler(() => {
        if (pdfViewerUrl) {
            closeBook();
            return true;
        }
        return false;
    }, true);

    const localBooksList = useMemo(() => {
        return (sirajBooks as Book[]).filter(book => {
            const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || book.author.toLowerCase().includes(searchTerm.toLowerCase());
            if (activeTab === 'saved') {
                return matchesSearch && downloadedBooks.includes(book.id);
            }
            return matchesSearch;
        });
    }, [sirajBooks, searchTerm, activeTab, downloadedBooks]);

    const openBook = async (book: Book) => {
        const isDownloaded = downloadedBooks.includes(book.id);
        const fileName = `${book.id}.pdf`;
        const path = `books/${fileName}`;

        if (isDownloaded) {
            try {
                const stat = await Filesystem.stat({ path, directory: Directory.Data });
                if (stat) {
                    const uri = await Filesystem.getUri({ path, directory: Directory.Data });
                    const fileUrl = Capacitor.convertFileSrc(uri.uri);
                    setPdfViewerUrl(fileUrl);
                    setSelectedBook(book);
                    return;
                }
            } catch (e) {
                console.warn('Local file missing, falling back to online...');
            }
        }

        // Solve CORS in development/web
        const getDevUrl = (url?: string) => {
            if (!url) return null;
            if (!Capacitor.isNativePlatform() && url.startsWith('https://siraj.net/')) {
                return url.replace('https://siraj.net/', '/siraj-proxy/');
            }
            return url;
        };

        // Online or fallback
        const onlineUrl = getDevUrl(book.readUrl || book.downloadUrl);
        if (onlineUrl) {
            setPdfViewerUrl(onlineUrl);
            setSelectedBook(book);
        } else {
            alert('الكتاب غير متاح حالياً.');
        }
    };

    const closeBook = () => {
        setSelectedBook(null);
        setPdfViewerUrl(null);
    };

    const handleManualDownload = async (e: React.MouseEvent, book: Book) => {
        e.stopPropagation();
        if (!book.downloadUrl || downloadedBooks.includes(book.id) || downloadingIds.includes(book.id)) return;
        
        try {
            setDownloadingIds(prev => [...prev, book.id]);
            await Filesystem.mkdir({ path: 'books', directory: Directory.Data, recursive: true }).catch(() => {});
            const path = `books/${book.id}.pdf`;
            const downloadUrl = !Capacitor.isNativePlatform() && book.downloadUrl?.startsWith('https://siraj.net/') 
                ? book.downloadUrl.replace('https://siraj.net/', '/siraj-proxy/') 
                : book.downloadUrl;

            const result = await Filesystem.downloadFile({
                url: downloadUrl!,
                path: path,
                directory: Directory.Data,
            });
            
            if (result.path) {
                setDownloadedBooks(prev => {
                    const newDownloaded = [...prev, book.id];
                    localStorage.setItem('downloaded_books', JSON.stringify(newDownloaded));
                    return newDownloaded;
                });
                Haptics.notification({ type: NotificationType.Success });
            }
        } catch (error) {
            console.error('Download failed:', error);
            alert('فشل التنزيل. يرجى المحاولة مرة أخرى.');
        } finally {
            setDownloadingIds(prev => prev.filter(id => id !== book.id));
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
            // If file not found, still remove from downloaded list
            const newDownloaded = downloadedBooks.filter(id => id !== book.id);
            setDownloadedBooks(newDownloaded);
            localStorage.setItem('downloaded_books', JSON.stringify(newDownloaded));
        }
    };
    
    if (selectedBook) {
        return (
            <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a1220]' : 'bg-[#f0f2f5]'}`}>
                <div className="flex-1 overflow-hidden relative">
                    {pdfViewerUrl ? (
                        <PdfViewer 
                            url={pdfViewerUrl} 
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
        <div className={`h-full flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0a1220] text-white' : 'bg-[#f8fafc] text-slate-800'}`}>
            {/* Header with Search and Tabs */}
            <div className={`pt-2 pb-4 px-4 sticky top-0 z-20 transition-all ${isDark ? 'bg-[#0a1220]/80 backdrop-blur-xl' : 'bg-white/80 backdrop-blur-xl shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                    <button onClick={onBack} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                        <ChevronLeftIcon className={`w-6 h-6 rotate-180 ${isDark ? 'text-white' : 'text-slate-700'}`} />
                    </button>
                    <h2 className={`text-xl font-bold font-amiri ${isDark ? 'text-white' : 'text-slate-800'}`}>مكتبة سراج</h2>
                    <div className="w-10 h-10" /> {/* Spacer */}
                </div>

                {/* Tab Switcher */}
                <div className={`p-1 rounded-2xl flex items-center mb-4 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                            activeTab === 'all'
                                ? isDark ? 'bg-gold-500 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm'
                                : isDark ? 'text-white/40' : 'text-slate-400'
                        }`}
                    >
                        كل الكتب
                    </button>
                    <button
                        onClick={() => setActiveTab('saved')}
                        className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all relative ${
                            activeTab === 'saved'
                                ? isDark ? 'bg-gold-500 text-white shadow-lg' : 'bg-white text-slate-800 shadow-sm'
                                : isDark ? 'text-white/40' : 'text-slate-400'
                        }`}
                    >
                        المكتبة الخاصة
                        {downloadedBooks.length > 0 && (
                            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center border border-white">
                                {downloadedBooks.length}
                            </span>
                        )}
                    </button>
                </div>

                <div className={`relative flex items-center px-4 py-3 rounded-2xl border transition-all ${isDark ? 'bg-white/5 border-white/10 focus-within:border-gold-500/50' : 'bg-slate-50 border-slate-200 focus-within:border-gold-500/50'}`}>
                    <SearchIcon className={`w-5 h-5 ml-3 ${isDark ? 'text-white/20' : 'text-slate-400'}`} />
                    <input
                        type="search"
                        placeholder="ابحث عن كتاب أو مؤلف..."
                        className={`bg-transparent border-none outline-none flex-1 text-sm font-amiri text-right ${isDark ? 'text-white placeholder:text-white/20' : 'text-slate-700'}`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative" dir="rtl">
                <div className="h-full overflow-y-auto hide-scrollbar p-4 grid grid-cols-2 gap-4 content-start pb-24">
                         {downloadingIds.length > 0 && (
                            <div className="col-span-2 p-4 mb-2 flex items-center justify-center bg-gold-400/10 border border-gold-400/20 text-gold-500 rounded-2xl">
                                <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin ml-3" />
                                <span className="font-bold text-sm font-amiri">جاري التنزيل، يرجى الانتظار...</span>
                            </div>
                        )}
                        
                        {localBooksList.map((book) => {
                            const isDownloaded = downloadedBooks.includes(book.id);
                            return (
                                <div 
                                    key={book.id} 
                                    onClick={() => openBook(book)}
                                    className="group relative flex flex-col cursor-pointer active:scale-[0.98] transition-all duration-300"
                                >
                                    {/* Book Cover Container */}
                                    <div 
                                        className={`relative w-full rounded-xl overflow-hidden shadow-lg transition-shadow duration-300 group-hover:shadow-xl ${isDark ? 'bg-[#152033]' : 'bg-slate-100'}`}
                                        style={{ aspectRatio: '3/4.5' }}
                                    >
                                        {book.coverUrl ? (
                                            <>
                                                <img 
                                                    src={book.coverUrl} 
                                                    alt="" 
                                                    className="absolute inset-0 w-full h-full object-cover blur-md opacity-40 scale-110"
                                                />
                                                <img 
                                                    src={book.coverUrl} 
                                                    alt={book.title} 
                                                    className="relative z-10 w-full h-full object-contain p-0.5 transition-transform duration-500 group-hover:scale-105"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        if (!target.src.includes('placeholder')) {
                                                            target.src = 'https://placehold.co/300x450?text=No+Cover'; 
                                                        }
                                                    }}
                                                />
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                                <BookIcon className={`w-10 h-10 mb-2 ${isDark ? 'text-white/10' : 'text-slate-200'}`} />
                                                <span className={`text-[10px] font-amiri ${isDark ? 'text-white/20' : 'text-slate-300'}`}>{book.title}</span>
                                            </div>
                                        )}
                                        
                                        {/* Status Indicators */}
                                        <div className="absolute top-2 left-2 flex flex-col gap-2 z-30">
                                            {downloadingIds.includes(book.id) ? (
                                                <div className="w-8 h-8 rounded-full bg-gold-500 text-white flex items-center justify-center shadow-lg border border-white/30">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                </div>
                                            ) : isDownloaded ? (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border border-white/30">
                                                    <CheckIcon className="w-4 h-4" />
                                                </div>
                                            ) : book.downloadUrl && (
                                                <button
                                                    onClick={(e) => handleManualDownload(e, book)}
                                                    className="w-8 h-8 rounded-full bg-gold-400/90 text-white flex items-center justify-center shadow-lg transition-all active:scale-90 border border-white/40"
                                                >
                                                    <DownloadIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {isDownloaded && (
                                            <button
                                                onClick={(e) => handleDeleteBook(e, book)}
                                                className="absolute bottom-2 left-2 w-7 h-7 rounded-full backdrop-blur-md bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Book Info below */}
                                    <div className="mt-3 px-1 text-center">
                                        <h3 className={`font-bold font-amiri text-[13px] leading-tight line-clamp-2 ${isDark ? 'text-white/90' : 'text-slate-800'}`}>
                                            {book.title}
                                        </h3>
                                        <p className={`text-[9px] mt-1 font-bold ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                            {book.author}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}

                        {/* More books coming footer - only show if not empty or in saved tab */}
                        {localBooksList.length > 0 && activeTab === 'all' && (
                            <div className="col-span-2 py-10 text-center flex flex-col items-center">
                                <div className={`w-12 h-px mb-4 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                                <p className={`text-[13px] font-amiri font-bold ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                    سيتم إضافة المزيد من الكتب والرسائل العلمية قريباً إن شاء الله.
                                </p>
                            </div>
                        )}

                        {/* Empty States */}
                        {localBooksList.length === 0 && (
                            <div className="col-span-2 py-20 text-center flex flex-col items-center animate-in fade-in zoom-in duration-500">
                                <SearchIcon className={`w-16 h-16 mb-4 ${isDark ? 'text-white/10' : 'text-slate-200'}`} />
                                <h3 className={`text-lg font-amiri font-bold mb-2 ${isDark ? 'text-white/80' : 'text-slate-700'}`}>
                                    {activeTab === 'saved' ? 'مكتبتك الخاصة فارغة حالياً' : 'لم نجد الكتاب المطلوب'}
                                </h3>
                                <p className={`text-sm font-amiri px-10 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                                    {activeTab === 'saved' 
                                        ? 'يمكنك تحميل الكتب من "كل الكتب" لتجدها هنا وتتمكن من قراءتها بدون إنترنت.'
                                        : 'تأكد من كتابة الاسم بشكل صحيح، وسيتم اقتراح وإضافة المزيد من الكتب قريباً لهذا القسم.'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
}
