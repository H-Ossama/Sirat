import { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeContext';
import { useVideoPlayer } from './VideoPlayerContext';

export function MiniVideoPlayer({ hasTabBar }: { hasTabBar: boolean }) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';
    const { currentVideo, iframeSrc, isPlaying, viewMode, togglePlayPause, seekBy, closeVideo } = useVideoPlayer();

    // Load saved position
    const [position, setPosition] = useState<{ x: number; y: number }>(() => {
        const saved = localStorage.getItem('mini-player-pos');
        if (!saved) return { x: -1000, y: -1000 };
        try {
            const parsed = JSON.parse(saved);
            if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
                return { x: parsed.x, y: parsed.y };
            }
        } catch {
        }
        return { x: -1000, y: -1000 };
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [side, setSide] = useState<'left' | 'right'>(() => {
        return (localStorage.getItem('mini-player-side') as 'left' | 'right') || 'right';
    });
    const [isInitialized, setIsInitialized] = useState(false);

    const dragRef = useRef<{ startX: number, startY: number, initialX: number, initialY: number, hasMoved: boolean } | null>(null);
    const playerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!currentVideo) return;
        if (!isInitialized) {
            if (position.x === -1000) {
                const playerWidth = 300;
                const x = (window.innerWidth - playerWidth) / 2;
                const y = window.innerHeight - (hasTabBar ? 220 : 180);
                setPosition({ x, y });
            }
            setIsInitialized(true);
        }
    }, [currentVideo, hasTabBar, isInitialized, position.x]);

    // Save position whenever it changes
    useEffect(() => {
        if (isInitialized && position.x !== -1000) {
            localStorage.setItem('mini-player-pos', JSON.stringify(position));
            localStorage.setItem('mini-player-side', side);
        }
    }, [position, side, isInitialized]);

    useEffect(() => {
        if (viewMode === 'mini') {
            setIsMinimized(false);
            // If we don't have a valid position yet, center it
            if (position.x === -1000) {
                const width = 300;
                const x = (window.innerWidth - width) / 2;
                const y = window.innerHeight - (hasTabBar ? 220 : 180);
                setPosition({ x, y });
            }
        }
    }, [viewMode, hasTabBar, position.x]);

    if (!currentVideo || viewMode !== 'mini') return null;

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
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

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) dragRef.current.hasMoved = true;

        setPosition({
            x: dragRef.current.initialX + deltaX,
            y: dragRef.current.initialY + deltaY,
        });
    };

    const handleTouchEnd = () => {
        if (!isDragging || !dragRef.current) return;
        setIsDragging(false);

        if (!dragRef.current.hasMoved) {
            if (isMinimized) {
                setIsMinimized(false);
                const width = 300;
                setPosition(prev => ({ ...prev, x: side === 'left' ? 16 : window.innerWidth - width - 16 }));
            } else {
                setIsMinimized(true);
            }
            dragRef.current = null;
            return;
        }

        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const playerWidth = playerRef.current?.offsetWidth || 300;
        const playerHeight = playerRef.current?.offsetHeight || 220;

        let newX = position.x;
        let newY = position.y;
        let newMin = isMinimized;
        let newSide = side;

        const minY = 16;
        const maxY = screenHeight - playerHeight - (hasTabBar ? 80 : 16);
        newY = Math.max(minY, Math.min(newY, maxY));

        const centerX = position.x + playerWidth / 2;

        if (centerX < 0 || position.x < -playerWidth / 3) {
            newMin = true;
            newSide = 'left';
            newX = -24;
        } else if (centerX > screenWidth || position.x > screenWidth - playerWidth * 2 / 3) {
            newMin = true;
            newSide = 'right';
            newX = screenWidth - 24;
        } else {
            if (centerX < screenWidth / 2) {
                newSide = 'left';
                newX = 16;
            } else {
                newSide = 'right';
                newX = screenWidth - playerWidth - 16;
            }
        }

        setSide(newSide);
        setIsMinimized(newMin);
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
                    const width = 300;
                    setPosition(prev => ({ ...prev, x: side === 'left' ? 16 : window.innerWidth - width - 16 }));
                }}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-gold-500 text-black' : 'bg-gold-500 text-white'}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={playerRef}
            className={`fixed z-50 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl border w-[300px] cursor-grab active:cursor-grabbing ${isDragging ? 'transition-none' : 'transition-all duration-300'} ${isDark ? 'bg-[#0b1929]/95 border-white/10 shadow-black/50' : 'bg-white/95 border-slate-200 shadow-slate-200/50'}`}
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
            dir="rtl"
        >
            <div className="w-full h-[168px] bg-black">
                {iframeSrc && (
                    <iframe
                        id="global-video-player-iframe"
                        className="w-full h-full"
                        src={iframeSrc}
                        title={currentVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    />
                )}
            </div>

            <div className="px-3 py-2">
                <p className={`text-[12px] font-amiri font-bold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{currentVideo.title}</p>
                <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); seekBy(5); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-600'}`}>
                            <span className="text-[10px] font-bold">+5</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-gold-500 text-black' : 'bg-gold-500 text-white'}`}>
                            {isPlaying ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 14.5V1.5h3v13h-3zm6 0V1.5h3v13h-3z" transform="translate(4.5, 4.5)" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                            )}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); seekBy(-5); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-600'}`}>
                            <span className="text-[10px] font-bold">-5</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white/75' : 'bg-slate-100 text-slate-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); closeVideo(); }} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-600'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
