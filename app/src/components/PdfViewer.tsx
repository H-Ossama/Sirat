import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeftIcon, TrashIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
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
    const [scale, setScale] = useState(1.0);
    const [width, setWidth] = useState(window.innerWidth);
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        
        // Hide status bar or set to immersive
        if (Capacitor.isNativePlatform()) {
            StatusBar.hide().catch(() => {});
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            if (Capacitor.isNativePlatform()) {
                StatusBar.show().catch(() => {});
            }
        };
    }, []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber(1);
    }

    const goToPrevPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 1.0));
    const resetZoom = () => setScale(1.0);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.targetTouches.length === 2) {
            // Start pinch
            const t1 = e.targetTouches[0];
            const t2 = e.targetTouches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const midX = (t1.clientX + t2.clientX) / 2;
            const midY = (t1.clientY + t2.clientY) / 2;
            
            setLastPinchDistance(dist);
            // Store the initial touch center to calculate scroll offsets
            (window as any)._pinchMid = { x: midX, y: midY };
            setTouchStart(null);
        } else if (e.targetTouches.length === 1) {
            setTouchStart({
                x: e.targetTouches[0].clientX,
                y: e.targetTouches[0].clientY
            });
            setLastPinchDistance(null);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.targetTouches.length === 2 && lastPinchDistance !== null) {
            const t1 = e.targetTouches[0];
            const t2 = e.targetTouches[1];
            const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            
            const delta = dist / lastPinchDistance;
            const newScale = Math.min(Math.max(scale * delta, 1.0), 4.0);
            
            if (newScale !== scale) {
                const container = e.currentTarget;
                const mid = (window as any)._pinchMid;
                
                if (mid) {
                    // Calculate the position of the midpoint relative to the scroll container
                    const rect = container.getBoundingClientRect();
                    const relativeMidX = mid.x - rect.left;
                    const relativeMidY = mid.y - rect.top;
                    
                    // Zoom at point calculation:
                    // NewScroll = (OldScroll + Mid) * (NewScale / OldScale) - Mid
                    const scrollX = (container.scrollLeft + relativeMidX) * (newScale / scale) - relativeMidX;
                    const scrollY = (container.scrollTop + relativeMidY) * (newScale / scale) - relativeMidY;
                    
                    setScale(newScale);
                    container.scrollLeft = scrollX;
                    container.scrollTop = scrollY;
                } else {
                    setScale(newScale);
                }
            }
            
            setLastPinchDistance(dist);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        setLastPinchDistance(null);
        if (!touchStart || scale > 1.05) {
            setTouchStart(null);
            return;
        } 
        
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
            <div 
                className={`px-4 flex items-center justify-between border-b ${isDark ? 'bg-[#0a1220] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}
                style={{ paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))', paddingBottom: '10px' }}
            >
                <button onClick={onClose} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                    <ChevronLeftIcon className={`w-6 h-6 rotate-180 ${isDark ? 'text-white' : 'text-slate-700'}`} />
                </button>
                <div className="flex-1 px-2 flex flex-col items-center">
                    <h2 className={`font-bold font-amiri text-sm sm:text-lg truncate max-w-[150px] sm:max-w-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{title}</h2>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={zoomOut} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <button onClick={resetZoom} className={`px-2 py-1 text-xs font-bold rounded ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        {Math.round(scale * 100)}%
                    </button>
                    <button onClick={zoomIn} className={`p-2 rounded-full ${isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-slate-100 text-slate-700'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                    {onDelete && (
                        <button onClick={onDelete} className={`p-2 rounded-full text-red-500 ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                            <TrashIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* PDF Content */}
            <div 
                className="flex-1 overflow-auto p-4 relative hide-scrollbar" 
                dir="ltr"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div 
                    style={{ 
                        width: `${(width - 20) * scale}px`,
                        height: 'fit-content',
                        minHeight: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: scale > 1 ? 'flex-start' : 'center',
                        justifyContent: 'flex-start'
                    }}
                >
                <Document
                    file={!Capacitor.isNativePlatform() && url.startsWith('https://siraj.net/') ? url.replace('https://siraj.net/', '/siraj-proxy/') : url}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col items-center"
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
                    <div 
                        style={{ 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'top left', // Use top-left for easier scroll calculation
                            transition: lastPinchDistance === null ? 'transform 0.1s ease-out' : 'none',
                            willChange: 'transform',
                            width: width - 20,
                            margin: scale > 1 ? '0' : '0 auto'
                        }}
                    >
                        <Page 
                            pageNumber={pageNumber} 
                            width={width - 20} // Fixed width for high-res render
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            className="shadow-xl"
                        />
                    </div>
                </Document>
                </div>
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
