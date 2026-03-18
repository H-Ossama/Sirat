import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeftIcon, TrashIcon } from './Icons';
import { useTheme } from './ThemeContext';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface PdfViewerProps {
    url: string;
    title: string;
    onClose: () => void;
    onDelete?: () => void;
}

export function PdfViewer({ url, title, onClose, onDelete }: PdfViewerProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [width, setWidth] = useState(window.innerWidth);
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchStart.x - touchEndX;
        const deltaY = Math.abs(touchStart.y - touchEndY);

        // Ensure it's a horizontal swipe (not scrolling vertically)
        if (deltaY < 50) {
            if (deltaX > 50) {
                // Swiped left (←) -> Next Page (Forward in RTL)
                goToNextPage();
            } else if (deltaX < -50) {
                // Swiped right (→) -> Previous Page (Back in RTL)
                goToPrevPage();
            }
        }
        setTouchStart(null);
    };

    return (
        <div className={`fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-[#0a1220]' : 'bg-[#f0f2f5]'}`}>
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between border-b ${isDark ? 'bg-[#0a1220] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                    <ChevronLeftIcon className={`w-6 h-6 rotate-180 ${isDark ? 'text-white' : 'text-slate-700'}`} />
                </button>
                <div className="text-center flex-1 px-4">
                    <h2 className={`font-bold font-amiri text-lg truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
                </div>
                {onDelete ? (
                    <button onClick={onDelete} className={`p-2 rounded-full text-red-500 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                        <TrashIcon className="w-6 h-6" />
                    </button>
                ) : (
                    <div className="w-10" />
                )}
            </div>

            {/* PDF Content */}
            <div 
                className="flex-1 overflow-hidden flex justify-center items-center p-2 relative" 
                dir="ltr"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                <Document
                    file={url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="w-full h-full flex justify-center items-center"
                    loading={
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className={`font-amiri ${isDark ? 'text-white/70' : 'text-slate-600'}`}>جاري تحميل الكتاب...</p>
                        </div>
                    }
                    error={
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className={`font-amiri text-red-500 mb-2`}>حدث خطأ أثناء تحميل الكتاب.</p>
                            <button onClick={onClose} className="px-4 py-2 bg-indigo-500 text-white rounded-lg">العودة</button>
                        </div>
                    }
                >
                    <Page 
                        pageNumber={pageNumber} 
                        width={width} 
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-lg pdf-page-fit"
                    />
                </Document>
            </div>

            {/* Footer Controls */}
            {numPages && (
                <div className={`px-4 py-3 flex items-center justify-between border-t ${isDark ? 'bg-[#0a1220] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`} dir="rtl">
                    <button 
                        onClick={goToNextPage} 
                        disabled={pageNumber >= numPages}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${pageNumber >= numPages ? 'opacity-50 cursor-not-allowed' : isDark ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                        التالي
                    </button>
                    <span className={`font-amiri text-sm ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
                        صفحة {pageNumber} من {numPages}
                    </span>
                    <button 
                        onClick={goToPrevPage} 
                        disabled={pageNumber <= 1}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${pageNumber <= 1 ? 'opacity-50 cursor-not-allowed' : isDark ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                        السابق
                    </button>
                </div>
            )}
        </div>
    );
}
