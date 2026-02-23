import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { ChevronLeftIcon, PlayIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { useBackHandler } from './BackHandlerContext';
import { useVideoPlayer } from './VideoPlayerContext';
import { videoCategories, type VideoCategory } from '../data/videoContent';
import { getVideosByCategory, isYouTubeApiConfigured, type FetchedVideoItem } from '../services/youtubeContentService';

interface VideosScreenProps {
    onBack: () => void;
    onCategoryViewChange?: (inCategory: boolean) => void;
}

function formatUpdatedAt(updatedAt: number | null): string {
    if (!updatedAt) return 'لم يتم التحديث بعد';
    const date = new Date(updatedAt);
    return `آخر تحديث ${date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
}

function PullSpinner({ isDark, pullDistance, refreshing }: { isDark: boolean; pullDistance: number; refreshing: boolean }) {
    const progress = Math.min(pullDistance / 64, 1);
    const show = refreshing || pullDistance > 0;
    
    if (!show && !refreshing) return null;

    // Smooth movement and appearance
    const translateY = refreshing ? 34 : (-28 + (progress * 62));
    const opacity = refreshing ? 1 : Math.max(0, (pullDistance - 10) / 40);
    const scale = refreshing ? 1 : (0.7 + (progress * 0.3));
    const rotate = refreshing ? 0 : (progress * 180);

    return (
        <div className="pointer-events-none sticky top-0 z-40 h-0 overflow-visible flex justify-center">
            <div
                className={`flex items-center justify-center w-11 h-11 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-transform duration-75 ease-out border backdrop-blur-xl ${
                    isDark 
                        ? 'bg-[#121826]/95 border-white/15 shadow-black/60' 
                        : 'bg-white/98 border-slate-200/60 shadow-slate-200/40'
                }`}
                style={{ 
                    transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`, 
                    opacity 
                }}
            >
                <div className="relative w-6 h-6">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className={`absolute left-1/2 top-0 w-[2.2px] h-[6px] rounded-full origin-[1.1px_12px] ${
                                refreshing ? 'animate-ios-spinner' : ''
                            } ${isDark ? 'bg-gold-400' : 'bg-gold-500'}`}
                            style={{
                                transform: `translateX(-50%) rotate(${index * 45}deg)`,
                                opacity: refreshing ? 1 : Math.max(0.1, ((index + 1) / 8) * progress),
                                animationDelay: refreshing ? `${index * 0.125}s` : '0s',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export function VideosScreen({ onBack, onCategoryViewChange }: VideosScreenProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [videos, setVideos] = useState<FetchedVideoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<number | null>(null);
    const [fromCache, setFromCache] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [videoLimit, setVideoLimit] = useState(20);
    const [selectedVideo, setSelectedVideo] = useState<FetchedVideoItem | null>(null);

    const youtubeConfigured = isYouTubeApiConfigured();
    const { currentVideo, iframeSrc, viewMode, openVideo, minimizeVideo } = useVideoPlayer();

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const touchStartY = useRef<number | null>(null);

    const selectedCategory = useMemo(() => {
        if (!selectedCategoryId) return null;
        return videoCategories.find(c => c.id === selectedCategoryId) ?? null;
    }, [selectedCategoryId]);

    useEffect(() => {
        onCategoryViewChange?.(!!selectedCategoryId);
    }, [selectedCategoryId, onCategoryViewChange]);

    const loadVideos = async (categoryId: string, forceRefresh = false, limit = videoLimit) => {
        setError(null);
        if (forceRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const result = await getVideosByCategory(categoryId, { forceRefresh, limit });
            setVideos(result.items);
            setUpdatedAt(result.updatedAt);
            setFromCache(result.fromCache);
            if (result.items.length === 0) {
                if (!youtubeConfigured) {
                    setError('مفتاح YouTube API غير مضاف. أضف VITE_YOUTUBE_API_KEY لتفعيل الجلب التلقائي.');
                } else {
                    setError('تعذر جلب الفيديوهات حالياً، جرّب التحديث بعد قليل.');
                }
            }
        } catch {
            setError('حدث خطأ أثناء جلب المحتوى.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (!selectedCategoryId) return;
        loadVideos(selectedCategoryId, false, videoLimit);
    }, [selectedCategoryId, videoLimit]);

    const handleBack = () => {
        if (selectedVideo && currentVideo && viewMode === 'fullscreen') {
            minimizeVideo();
            setSelectedVideo(null);
            return;
        }

        if (selectedCategoryId) {
            setSelectedCategoryId(null);
            setVideos([]);
            setError(null);
            setUpdatedAt(null);
            setVideoLimit(20);
            setSelectedVideo(null);
            return;
        }
        onBack();
    };

    useBackHandler(() => {
        handleBack();
        return true;
    }, true);

    const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (!selectedCategoryId || loading || refreshing || selectedVideo) return;
        if ((scrollRef.current?.scrollTop || 0) > 0) return;
        touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (!selectedCategoryId || touchStartY.current === null) return;
        const currentY = e.touches[0].clientY;
        const dy = currentY - touchStartY.current;
        if (dy > 0 && (scrollRef.current?.scrollTop || 0) <= 0) {
            setPullDistance(Math.min(dy, 90));
        } else {
            setPullDistance(0);
        }
    };

    const onTouchEnd = async () => {
        if (!selectedCategoryId) return;
        const shouldRefresh = pullDistance >= 64 && !refreshing && !loading;
        setPullDistance(0);
        touchStartY.current = null;
        if (shouldRefresh) await loadVideos(selectedCategoryId, true, videoLimit);
    };

    return (
        <div
            ref={scrollRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className={`h-full overflow-y-auto hide-scrollbar pb-28 transition-all duration-300 ${isDark ? 'bg-[#080b14] text-white' : 'bg-[#f4f7fe] text-slate-800'}`}
        >
            {selectedCategoryId && <PullSpinner isDark={isDark} pullDistance={pullDistance} refreshing={refreshing} />}

            <div className={`px-5 pt-5 pb-4 sticky top-0 backdrop-blur-xl z-20 border-b transition-all ${isDark ? 'bg-[#080b14]/90 border-white/5' : 'bg-white/90 border-slate-100'}`}>
                <div className="flex items-center justify-between">
                    <button onClick={handleBack} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-sm ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-white border border-slate-100 text-slate-600'}`}>
                        <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="text-center">
                        <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>
                            {selectedCategory ? selectedCategory.title : 'مكتبة الفيديو'}
                        </h1>
                        {!selectedCategory && (
                            <p className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 ${isDark ? 'text-white/30' : 'text-slate-400'}`}>
                                Fresh Islamic Videos
                            </p>
                        )}
                    </div>
                    <button
                        disabled={!selectedCategoryId || refreshing || loading}
                        onClick={() => selectedCategoryId && loadVideos(selectedCategoryId, true, videoLimit)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${selectedCategoryId ? (isDark ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30' : 'bg-gold-50 text-gold-700 border border-gold-200') : 'opacity-30 pointer-events-none'} ${refreshing ? 'animate-pulse' : ''}`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {!selectedCategory && (
                <div className="px-5 mt-6 grid grid-cols-2 gap-3">
                    {videoCategories.map((category: VideoCategory) => (
                        <button
                            key={category.id}
                            onClick={() => {
                                setVideoLimit(20);
                                setSelectedCategoryId(category.id);
                            }}
                            className={`rounded-3xl p-4 border text-right transition-all active:scale-[0.98] ${isDark ? 'bg-white/[0.03] border-white/10 hover:border-gold-500/25' : 'bg-white border-slate-100 hover:border-gold-300 shadow-sm'}`}
                            dir="rtl"
                        >
                            <div className="w-9 h-1 rounded-full bg-gold-500 mb-3" />
                            <h2 className={`text-[15px] font-amiri font-bold leading-6 ${isDark ? 'text-white' : 'text-slate-800'}`}>{category.title}</h2>
                            <p className={`text-[11px] mt-1 leading-5 ${isDark ? 'text-white/45' : 'text-slate-500'}`}>{category.subtitle}</p>
                            <div className="mt-3 flex items-center justify-between">
                                <span className={`text-[10px] ${isDark ? 'text-white/35' : 'text-slate-400'}`}>تصنيف احترافي</span>
                                <span className={`text-[10px] px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5 text-white/65' : 'bg-slate-100 text-slate-600'}`}>YouTube</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {selectedCategory && (
                <div className="px-5 mt-5 space-y-4">
                    {selectedVideo && currentVideo && viewMode === 'fullscreen' && (
                        <div className={`rounded-3xl overflow-hidden border ${isDark ? 'bg-[#050a14] border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="w-full aspect-video bg-black">
                                <iframe
                                    id="global-video-player-iframe"
                                    className="w-full h-full"
                                    src={iframeSrc}
                                    title={selectedVideo.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
                                />
                            </div>
                            <div className="p-4" dir="rtl">
                                <h2 className={`text-[18px] font-amiri font-bold leading-8 ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedVideo.title}</h2>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5 text-white/70' : 'bg-slate-100 text-slate-600'}`}>{selectedVideo.views}</span>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5 text-white/70' : 'bg-slate-100 text-slate-600'}`}>{selectedVideo.isReel ? 'ريل' : 'فيديو'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className={`rounded-3xl p-6 border text-center ${isDark ? 'bg-white/[0.03] border-white/10 text-white/70' : 'bg-white border-slate-100 text-slate-600'}`}>
                            جاري جلب أفضل الفيديوهات...
                        </div>
                    )}

                    {error && !loading && (
                        <div className={`rounded-3xl p-4 border text-center text-[13px] ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-100 text-red-600'}`}>
                            {error}
                        </div>
                    )}

                    {!loading && !selectedVideo && videos.map((video) => (
                        <button
                            key={video.id}
                            onClick={() => {
                                setSelectedVideo(video);
                                openVideo(video);
                            }}
                            className={`w-full rounded-3xl border text-right transition-all active:scale-[0.98] overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10 hover:border-gold-500/25' : 'bg-white border-slate-100 hover:border-gold-300 shadow-sm'}`}
                            dir="rtl"
                        >
                            <div className="relative h-[190px] w-full overflow-hidden">
                                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                <div className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow-lg"><PlayIcon className="w-5 h-5" /></div>
                                <div className="absolute bottom-3 right-3"><span className="text-[10px] px-2.5 py-1 rounded-full bg-black/60 text-white">{video.views}</span></div>
                                <div className="absolute top-3 left-3"><span className="text-[10px] px-2.5 py-1 rounded-full bg-black/60 text-white">{video.isReel ? 'ريل' : 'فيديو'}</span></div>
                            </div>
                            <div className="p-4">
                                <h3 className={`text-[16px] font-amiri font-bold leading-7 line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{video.title}</h3>
                                <div className="mt-2 flex items-center justify-between">
                                    <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{video.channel}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-white/5 text-white/70' : 'bg-slate-100 text-slate-600'}`}>{video.durationText}</span>
                                        <span className={`text-[10px] ${isDark ? 'text-gold-300/90' : 'text-gold-600'}`}>YouTube</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}

                    {!loading && !selectedVideo && videos.length >= videoLimit && (
                        <button
                            onClick={() => setVideoLimit(prev => prev + 20)}
                            className={`w-full py-3 rounded-2xl border text-[13px] font-amiri font-bold transition-all active:scale-[0.98] ${isDark ? 'bg-white/[0.03] border-white/10 text-white/85 hover:border-gold-500/30' : 'bg-white border-slate-200 text-slate-700 hover:border-gold-300'}`}
                        >
                            تحميل المزيد
                        </button>
                    )}
                </div>
            )}

            <div className="h-8" />
        </div>
    );
}
