import { useState, useRef, useEffect } from 'react';
import { useAudio } from './AudioContext';
import { useTheme } from './ThemeContext';

export function MiniAudioPlayer({ hasTabBar, onNavigate }: { hasTabBar: boolean, onNavigate?: (surahId: number) => void }) {
    const { isPlaying, isPaused, currentSurah, currentReciter, pauseAudio, resumeAudio, stopAudio, progress } = useAudio();
    const { theme } = useTheme();
    const isDark = theme !== 'light';

    const [position, setPosition] = useState({ x: -1000, y: -1000 }); // Hidden initially until measured
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [side, setSide] = useState<'left' | 'right'>('right');
    const [isInitialized, setIsInitialized] = useState(false);
    
    const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number, hasMoved: boolean } | null>(null);
    const playerRef = useRef<HTMLDivElement>(null);

    // Initialize position on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && !isInitialized) {
            const playerWidth = 250; // Approximate initial width
            const x = (window.innerWidth - playerWidth) / 2;
            const y = window.innerHeight - (hasTabBar ? 140 : 100);
            setPosition({ x, y });
            setIsInitialized(true);
        }
    }, [hasTabBar, isInitialized]);

    if (!currentSurah || !currentReciter) return null;

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        // Ignore if clicking on buttons
        if ((e.target as HTMLElement).closest('button')) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initialX: position.x,
            initialY: position.y,
            hasMoved: false
        };
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging || !dragRef.current) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        
        const deltaX = clientX - dragRef.current.startX;
        const deltaY = clientY - dragRef.current.startY;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            dragRef.current.hasMoved = true;
        }
        
        setPosition({
            x: dragRef.current.initialX + deltaX,
            y: dragRef.current.initialY + deltaY
        });
    };

    const handleTouchEnd = () => {
        if (!isDragging || !dragRef.current) return;
        setIsDragging(false);
        
        if (!dragRef.current.hasMoved) {
            // It was a click on the player body
            if (isMinimized) {
                setIsMinimized(false);
                const screenWidth = window.innerWidth;
                const playerWidth = 250; // Approximate
                setPosition(prev => ({
                    ...prev,
                    x: side === 'left' ? 16 : screenWidth - playerWidth - 16
                }));
            } else if (onNavigate && currentSurah) {
                onNavigate(currentSurah.number);
            }
            dragRef.current = null;
            return;
        }

        // Handle snapping and minimizing
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const playerWidth = playerRef.current?.offsetWidth || 250;
        const playerHeight = playerRef.current?.offsetHeight || 60;
        
        let newX = position.x;
        let newY = position.y;
        let newMinimized = false;
        let newSide = side;

        // Bound Y to screen
        const minY = 16;
        const maxY = screenHeight - playerHeight - (hasTabBar ? 80 : 16);
        newY = Math.max(minY, Math.min(newY, maxY));

        const centerX = position.x + playerWidth / 2;

        // Check if dragged off screen to minimize
        if (centerX < 0 || position.x < -playerWidth / 3) {
            newMinimized = true;
            newSide = 'left';
            newX = -24; // Hide half of the minimized icon
        } else if (centerX > screenWidth || position.x > screenWidth - playerWidth * 2 / 3) {
            newMinimized = true;
            newSide = 'right';
            newX = screenWidth - 24; // Hide half of the minimized icon
        } else {
            // Snap to nearest edge
            if (centerX < screenWidth / 2) {
                newSide = 'left';
                newX = 16;
            } else {
                newSide = 'right';
                newX = screenWidth - playerWidth - 16;
            }
        }

        setSide(newSide);
        setIsMinimized(newMinimized);
        setPosition({ x: newX, y: newY });
        dragRef.current = null;
    };

    if (isMinimized) {
        return (
            <div 
                className={`fixed z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl backdrop-blur-xl border transition-all duration-300 cursor-pointer ${isDark ? 'bg-[#0b1929]/95 border-white/10 shadow-black/50' : 'bg-white/95 border-slate-200 shadow-slate-200/50'}`}
                style={{ 
                    left: 0, 
                    top: 0, 
                    transform: `translate3d(${side === 'left' ? -12 : window.innerWidth - 36}px, ${position.y}px, 0)`,
                    touchAction: 'none'
                }}
                onClick={() => {
                    setIsMinimized(false);
                    const playerWidth = 250;
                    setPosition(prev => ({
                        ...prev,
                        x: side === 'left' ? 16 : window.innerWidth - playerWidth - 16
                    }));
                }}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gold-500 text-black' : 'bg-gold-500 text-white'}`}>
                    {isPlaying && !isPaused ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 14.5V1.5h3v13h-3zm6 0V1.5h3v13h-3z" transform="translate(4.5, 4.5)" /></svg>
                    ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div 
            ref={playerRef}
            className={`fixed z-50 rounded-full px-3 py-2 flex items-center gap-3 shadow-2xl backdrop-blur-xl border w-auto max-w-[90%] cursor-grab active:cursor-grabbing ${isDragging ? 'transition-none' : 'transition-all duration-300'} ${isDark ? 'bg-[#0b1929]/95 border-white/10 shadow-black/50' : 'bg-white/95 border-slate-200 shadow-slate-200/50'}`} 
            dir="rtl"
            style={{ 
                left: 0, 
                top: 0, 
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                touchAction: 'none',
                opacity: isInitialized ? 1 : 0,
                pointerEvents: isInitialized ? 'auto' : 'none'
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
        >
            <button 
                onClick={(e) => { e.stopPropagation(); isPlaying && !isPaused ? pauseAudio() : resumeAudio(); }} 
                className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all shadow-md ${isDark ? 'bg-gold-500 text-black shadow-gold-500/20' : 'bg-gold-500 text-white shadow-gold-500/30'}`}
            >
                {isPlaying && !isPaused ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 14.5V1.5h3v13h-3zm6 0V1.5h3v13h-3z" transform="translate(4.5, 4.5)" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                )}
            </button>
            
            <div className="flex flex-col min-w-[130px] max-w-[180px] pointer-events-none">
                <div className="flex items-center justify-between gap-2">
                    <p className={`text-[13px] font-amiri font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>سورة {currentSurah.name}</p>
                    <p className={`text-[9px] truncate ${isDark ? 'text-white/50' : 'text-slate-400'}`}>{currentReciter.arabicName}</p>
                </div>
                <div className={`h-[3px] mt-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div className="h-full bg-gold-500 transition-all duration-300 rounded-full" style={{ width: `${progress * 100}%` }} />
                </div>
            </div>

            <button 
                onClick={(e) => { e.stopPropagation(); stopAudio(); }} 
                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/10 text-white/60 hover:bg-rose-500/20 hover:text-rose-400' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500'}`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>
    );
}
