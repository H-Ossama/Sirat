import { useEffect, useMemo, useRef, useState, type TouchEvent } from 'react';
import { ChevronLeftIcon, PlayIcon } from './Icons';
import { useTheme } from './ThemeContext';
import { useBackHandler } from './BackHandlerContext';
import { useVideoPlayer } from './VideoPlayerContext';
import { videoCategories, type VideoCategory } from '../data/videoContent';
import {
    getVideosByCategory,
    getYouTubeApiIssueMessage,
    isYouTubeApiConfigured,
    isYouTubeApiTemporarilyBlocked,
    type FetchedVideoItem,
} from '../services/youtubeContentService';
import {
    getVideoInteractions,
    toggleVideoSave,
    type LocalVideoInteractions,
    type VideoMeta,
} from '../services/videoInteractionsStore';

type MainTab = 'videos' | 'reels';

interface VideosScreenProps {
    onBack: () => void;
    onCategoryViewChange?: (inCategory: boolean) => void;
    onNavigate?: (screen: string) => void;
}

function formatUpdatedAt(updatedAt: number | null): string {
    if (!updatedAt) return '';
    const date = new Date(updatedAt);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function PullSpinner({ isDark, pullDistance, refreshing }: { isDark: boolean; pullDistance: number; refreshing: boolean }) {
    const progress = Math.min(pullDistance / 64, 1);
    if (!refreshing && pullDistance <= 0) return null;
    const translateY = refreshing ? 34 : (-28 + progress * 62);
    const opacity = refreshing ? 1 : Math.max(0, (pullDistance - 10) / 40);
    const scale = refreshing ? 1 : 0.7 + progress * 0.3;
    const rotate = refreshing ? 0 : progress * 180;
    return (
        <div className="pointer-events-none sticky top-0 z-40 h-0 overflow-visible flex justify-center">
            <div className={`flex items-center justify-center w-11 h-11 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-transform duration-75 ease-out border backdrop-blur-xl ${isDark ? 'bg-[#121826]/95 border-white/15 shadow-black/60' : 'bg-white/98 border-slate-200/60 shadow-slate-200/40'}`}
                style={{ transform: `translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`, opacity }}>
                <div className="relative w-6 h-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`absolute left-1/2 top-0 w-[2.2px] h-[6px] rounded-full origin-[1.1px_12px] ${refreshing ? 'animate-ios-spinner' : ''} ${isDark ? 'bg-gold-400' : 'bg-gold-500'}`}
                            style={{ transform: `translateX(-50%) rotate(${i * 45}deg)`, opacity: refreshing ? 1 : Math.max(0.1, ((i + 1) / 8) * progress), animationDelay: refreshing ? `${i * 0.125}s` : '0s' }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function VolumeControl({ isMuted, volume, onToggleMute, onVolumeChange }: {
    isMuted: boolean; volume: number; onToggleMute: () => void; onVolumeChange: (v: number) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!expanded) return;
        const handler = (e: MouseEvent | globalThis.TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setExpanded(false);
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
    }, [expanded]);
    return (
        <div ref={ref} className="flex flex-col items-center gap-1.5">
            <button onClick={() => { if (expanded) onToggleMute(); else setExpanded(true); }}
                className="w-10 h-10 rounded-full bg-black/55 border border-white/20 backdrop-blur-md flex items-center justify-center">
                {isMuted
                    ? <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                    : <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                }
            </button>
            {expanded && (
                <div className="flex flex-col items-center gap-1 bg-black/60 border border-white/20 backdrop-blur-xl rounded-2xl px-2 py-2.5">
                    <input type="range" min={0} max={100} value={isMuted ? 0 : volume}
                        style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 4, height: 72, cursor: 'pointer' }}
                        className="accent-gold-500"
                        onChange={e => { const n = Number(e.target.value); onVolumeChange(n); if (n === 0 && !isMuted) onToggleMute(); else if (n > 0 && isMuted) onToggleMute(); }} />
                    <span className="text-[9px] text-white/70 font-bold">{isMuted ? '0' : volume}%</span>
                </div>
            )}
        </div>
    );
}



export function VideosScreen({ onBack, onCategoryViewChange, onNavigate }: VideosScreenProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';

    // ── Main tabs ──────────────────────────────────────────────────────────────
    const [mainTab, setMainTab] = useState<MainTab>('videos');

    // ── Videos tab state ───────────────────────────────────────────────────────
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

    // ── Reels tab state ────────────────────────────────────────────────────────
    const [reelsLoaded, setReelsLoaded] = useState(false);
    const [reelsVideos, setReelsVideos] = useState<FetchedVideoItem[]>([]);
    const [reelsLoading, setReelsLoading] = useState(false);
    const [reelsError, setReelsError] = useState<string | null>(null);
    const [activeReelIndex, setActiveReelIndex] = useState(0);
    const [interactions, setInteractions] = useState<Record<string, LocalVideoInteractions>>({});
    const [volume, setVolume] = useState<number>(() => {
        const raw = Number(localStorage.getItem('reels_volume_v1') || '80');
        return Number.isNaN(raw) ? 80 : Math.max(0, Math.min(100, raw));
    });
    // Default unmuted — audio plays by default, only muted if user explicitly muted last time
    const [isMuted, setIsMuted] = useState<boolean>(() => localStorage.getItem('reels_muted_v1') === 'true');

    const youtubeConfigured = isYouTubeApiConfigured();
    const { currentVideo, iframeSrc, viewMode, openVideo, minimizeVideo, isPlaying, togglePlayPause } = useVideoPlayer();

    const [reelPaused, setReelPaused] = useState(false);
    const isMutedRef = useRef(isMuted);
    const volumeRef = useRef(volume);
    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { volumeRef.current = volume; }, [volume]);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const reelsRef = useRef<HTMLDivElement | null>(null);
    const touchStartY = useRef<number | null>(null);
    const reelsTouchStartY = useRef<number | null>(null);

    const selectedCategory = useMemo(() => videoCategories.find(c => c.id === selectedCategoryId) ?? null, [selectedCategoryId]);

    // Hide navbar when in reels view or inside a video category
    useEffect(() => { onCategoryViewChange?.(mainTab === 'reels' || !!selectedCategoryId); }, [mainTab, selectedCategoryId, onCategoryViewChange]);

    // ── Persist volume / mute ──────────────────────────────────────────────────
    useEffect(() => { localStorage.setItem('reels_volume_v1', String(volume)); }, [volume]);
    useEffect(() => { localStorage.setItem('reels_muted_v1', String(isMuted)); }, [isMuted]);

    // ── Load videos tab ────────────────────────────────────────────────────────
    const loadVideos = async (categoryId: string, forceRefresh = false, limit = videoLimit) => {
        setError(null);
        if (forceRefresh) setRefreshing(true); else setLoading(true);
        try {
            const result = await getVideosByCategory(categoryId, { forceRefresh, limit, reelsOnly: false });
            setVideos(result.items);
            setUpdatedAt(result.updatedAt);
            setFromCache(result.fromCache);
            setSelectedVideo(null);
            setInteractions(prev => ({ ...prev, ...Object.fromEntries(result.items.map(v => [v.videoId, getVideoInteractions(v.videoId)])) }));
            if (result.items.length === 0) {
                const apiIssue = getYouTubeApiIssueMessage();
                setError(apiIssue || (youtubeConfigured ? 'تعذر جلب الفيديوهات حالياً، جرّب التحديث بعد قليل.' : 'مفتاح YouTube API غير مضاف. أضف VITE_YOUTUBE_API_KEY لتفعيل الجلب التلقائي.'));
            }
        } catch { setError('حدث خطأ أثناء جلب المحتوى.'); }
        finally { setLoading(false); setRefreshing(false); }
    };

    useEffect(() => { if (selectedCategoryId) loadVideos(selectedCategoryId, false, videoLimit); }, [selectedCategoryId, videoLimit]);

    // ── Load reels from ALL categories, shuffled ───────────────────────────────
    const loadReels = async (forceRefresh = false) => {
        setReelsError(null);
        setReelsLoading(true);
        try {
            const all: FetchedVideoItem[] = [];
            for (const category of videoCategories) {
                const result = await getVideosByCategory(category.id, { forceRefresh, limit: 15, reelsOnly: true });
                all.push(...result.items);
                if (isYouTubeApiTemporarilyBlocked()) break;
            }
            // Fisher-Yates shuffle
            for (let i = all.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [all[i], all[j]] = [all[j], all[i]];
            }
            // Deduplicate by videoId
            const seen = new Set<string>();
            const unique = all.filter(v => { if (seen.has(v.videoId)) return false; seen.add(v.videoId); return true; });
            setReelsVideos(unique);
            setActiveReelIndex(0);
            setInteractions(Object.fromEntries(unique.map(item => [item.videoId, getVideoInteractions(item.videoId)])));
            if (unique.length === 0) {
                const apiIssue = getYouTubeApiIssueMessage();
                setReelsError(apiIssue || 'لا توجد ريلز متاحة حالياً. جرّب التحديث.');
            }
            setReelsLoaded(true);
        } catch { setReelsError('حدث خطأ أثناء جلب الريلز.'); }
        finally { setReelsLoading(false); }
    };

    // Auto-load reels first time the tab is opened; pause any playing video when entering reels
    useEffect(() => {
        if (mainTab === 'reels') {
            setReelPaused(false);
            if (currentVideo && isPlaying) togglePlayPause();
            if (currentVideo && viewMode === 'fullscreen') minimizeVideo();
            if (!reelsLoaded && !reelsLoading) loadReels();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mainTab]);

    // ── Volume postMessage to active reel ──────────────────────────────────────
    useEffect(() => {
        if (mainTab !== 'reels' || !reelsVideos.length) return;
        const timer = setTimeout(() => {
            for (const [index, video] of reelsVideos.entries()) {
                const iframe = document.getElementById(`reel-iframe-${video.videoId}`) as HTMLIFrameElement | null;
                if (!iframe?.contentWindow) continue;
                const cmd = (func: string, args: unknown[] = []) => JSON.stringify({ event: 'command', func, args });
                if (index === activeReelIndex) {
                    iframe.contentWindow.postMessage(cmd(isMuted ? 'mute' : 'unMute'), '*');
                    iframe.contentWindow.postMessage(cmd('setVolume', [isMuted ? 0 : volume]), '*');
                    iframe.contentWindow.postMessage(cmd('playVideo'), '*');
                } else {
                    iframe.contentWindow.postMessage(cmd('pauseVideo'), '*');
                }
            }
        }, 220);
        return () => clearTimeout(timer);
    }, [activeReelIndex, reelsVideos, volume, isMuted, mainTab]);

    // ── Back handler ───────────────────────────────────────────────────────────
    const handleBack = () => {
        if (mainTab === 'reels') { setMainTab('videos'); return; }
        if (mainTab === 'videos' && selectedVideo && currentVideo && viewMode === 'fullscreen') { minimizeVideo(); setSelectedVideo(null); return; }
        if (mainTab === 'videos' && selectedCategoryId) { setSelectedCategoryId(null); setVideos([]); setError(null); setUpdatedAt(null); setVideoLimit(20); return; }
        onBack();
    };

    useBackHandler(() => { handleBack(); return true; }, true);

    // ── Pull-to-refresh touch handlers (videos tab list only) ─────────────────
    const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        if (mainTab !== 'videos' || !selectedCategoryId || loading || refreshing || selectedVideo) return;
        if ((scrollRef.current?.scrollTop || 0) > 0) return;
        touchStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
        if (mainTab !== 'videos' || touchStartY.current === null) return;
        const dy = e.touches[0].clientY - touchStartY.current;
        if (dy > 0 && (scrollRef.current?.scrollTop || 0) <= 0) setPullDistance(Math.min(dy, 90));
        else setPullDistance(0);
    };
    const onTouchEnd = async () => {
        if (mainTab !== 'videos') return;
        const should = pullDistance >= 64 && !refreshing && !loading;
        setPullDistance(0);
        touchStartY.current = null;
        if (should && selectedCategoryId) await loadVideos(selectedCategoryId, true, videoLimit);
    };

    // ── Reels scroll / swipe ───────────────────────────────────────────────────
    const handleReelsScroll = () => {
        const el = reelsRef.current;
        if (!el) return;
        const h = el.clientHeight;
        if (h <= 0) return;
        const idx = Math.round(el.scrollTop / h);
        const clamped = Math.max(0, Math.min(reelsVideos.length - 1, idx));
        if (clamped !== activeReelIndex) { setActiveReelIndex(clamped); setReelPaused(false); }
    };
    const scrollToReelIndex = (index: number) => {
        const el = reelsRef.current;
        if (!el) return;
        const clamped = Math.max(0, Math.min(reelsVideos.length - 1, index));
        el.scrollTo({ top: clamped * el.clientHeight, behavior: 'smooth' });
        setActiveReelIndex(clamped);
        setReelPaused(false);
    };
    const onReelsTouchStart = (e: TouchEvent<HTMLDivElement>) => { reelsTouchStartY.current = e.touches[0].clientY; };
    const onReelsTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
        if (reelsTouchStartY.current === null) return;
        const delta = e.changedTouches[0].clientY - reelsTouchStartY.current;
        reelsTouchStartY.current = null;
        if (Math.abs(delta) < 40) return;
        scrollToReelIndex(delta < 0 ? activeReelIndex + 1 : activeReelIndex - 1);
    };

    // ── Interaction helpers ────────────────────────────────────────────────────
    const toggleSave = (videoId: string, meta?: VideoMeta) => {
        const next = toggleVideoSave(videoId, meta);
        setInteractions(prev => ({ ...prev, [videoId]: next }));
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const buildReelEmbed = (videoId: string) => {
        const origin = encodeURIComponent(window.location.origin);
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&enablejsapi=1&controls=0&rel=0&modestbranding=1&mute=1&origin=${origin}`;
    };

    // ── Go to reels (pause mini player first) ───────────────────────────────────
    const goToReels = () => {
        if (currentVideo && isPlaying) togglePlayPause();
        if (currentVideo && viewMode === 'fullscreen') minimizeVideo();
        setReelPaused(false);
        setMainTab('reels');
    };

    // ── Tab pill helper ────────────────────────────────────────────────────────
    const TabPill = ({ id, label }: { id: MainTab; label: string }) => (
        <button onClick={() => id === 'reels' ? goToReels() : setMainTab(id)}
            className={`flex-1 py-2 rounded-2xl text-[13px] font-amiri font-bold transition-all ${mainTab === id ? (isDark ? 'bg-gold-500/20 text-gold-300 border border-gold-500/35' : 'bg-gold-50 text-gold-700 border border-gold-300') : (isDark ? 'text-white/55 border border-transparent' : 'text-slate-500 border border-transparent')}`}>
            {label}
        </button>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // REELS VIEW — full screen, immersive, no navbar
    // ══════════════════════════════════════════════════════════════════════════
    if (mainTab === 'reels') {
        return (
            <div className="fixed inset-0 z-[5] bg-black flex flex-col">
                {/* Minimal overlay: just back + refresh */}
                <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 pt-12 pb-3">
                    <button onClick={() => setMainTab('videos')}
                        className="w-10 h-10 rounded-full bg-black/55 border border-white/20 backdrop-blur-md flex items-center justify-center">
                        <ChevronLeftIcon className="w-5 h-5 text-white rotate-180" />
                    </button>
                    <span className="text-white/70 text-[13px] font-amiri font-bold">ريلز إسلامية</span>
                    <button onClick={() => onNavigate?.('profile')}
                        className="w-10 h-10 rounded-full bg-black/55 border border-white/20 backdrop-blur-md flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                </div>

                {/* Loading / error */}
                {reelsLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="rounded-3xl px-6 py-4 text-center bg-black/80 text-white/80 font-amiri">جاري جلب الريلز الإسلامية...</div>
                    </div>
                )}
                {reelsError && !reelsLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 px-6 flex-col gap-4">
                        <div className="rounded-3xl px-5 py-4 text-center text-[13px] bg-red-500/20 border border-red-400/30 text-red-300">{reelsError}</div>
                        <button onClick={() => loadReels(true)} className="px-5 py-2.5 rounded-2xl bg-gold-500 text-black text-[13px] font-amiri font-bold">إعادة المحاولة</button>
                    </div>
                )}

                {/* Reels scroll container */}
                {!reelsLoading && reelsVideos.length > 0 && (
                    <div ref={reelsRef} onScroll={handleReelsScroll} onTouchStart={onReelsTouchStart} onTouchEnd={onReelsTouchEnd}
                        className="w-full h-full overflow-y-auto snap-y snap-mandatory hide-scrollbar">
                        {reelsVideos.map((video, index) => {
                            const itemInteractions = interactions[video.videoId] || getVideoInteractions(video.videoId);
                            const showIframe = Math.abs(index - activeReelIndex) <= 1;
                            const meta: VideoMeta = { videoId: video.videoId, title: video.title, channel: video.channel, thumbnail: video.thumbnail, durationText: video.durationText, views: video.views };

                            return (
                                <section key={video.id} className="relative w-full snap-start overflow-hidden bg-black" style={{ height: '100dvh' }}>
                                    {showIframe ? (
                                        <iframe id={`reel-iframe-${video.videoId}`}
                                            className="absolute inset-0 w-full h-full pointer-events-none"
                                            src={buildReelEmbed(video.videoId)}
                                            title={video.title}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            referrerPolicy="strict-origin-when-cross-origin"
                                            allowFullScreen
                                            onLoad={() => {
                                                if (index !== activeReelIndex) return;
                                                setTimeout(() => {
                                                    const el = document.getElementById(`reel-iframe-${video.videoId}`) as HTMLIFrameElement;
                                                    if (!el?.contentWindow) return;
                                                    const cmd = (func: string, args: unknown[] = []) => JSON.stringify({ event: 'command', func, args });
                                                    el.contentWindow.postMessage(cmd(isMutedRef.current ? 'mute' : 'unMute'), '*');
                                                    el.contentWindow.postMessage(cmd('setVolume', [isMutedRef.current ? 0 : volumeRef.current]), '*');
                                                    el.contentWindow.postMessage(cmd('playVideo'), '*');
                                                }, 600);
                                            }} />
                                    ) : (
                                        <img src={video.thumbnail} alt={video.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                    )}

                                    {/* Tap to play/pause */}
                                    <div className="absolute inset-0 z-[2]" onClick={() => {
                                        const el = document.getElementById(`reel-iframe-${video.videoId}`) as HTMLIFrameElement;
                                        if (!el?.contentWindow) return;
                                        const cmd = (func: string, args: unknown[] = []) => JSON.stringify({ event: 'command', func, args });
                                        const nowPaused = !reelPaused;
                                        el.contentWindow.postMessage(cmd(nowPaused ? 'pauseVideo' : 'playVideo'), '*');
                                        setReelPaused(nowPaused);
                                    }} />

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/40 pointer-events-none z-[3]" />

                                    {/* Volume control — top left */}
                                    <div className="absolute left-4 top-28 z-[10]">
                                        <VolumeControl isMuted={isMuted} volume={volume}
                                            onToggleMute={() => setIsMuted(m => !m)}
                                            onVolumeChange={v => { setVolume(v); if (v === 0 && !isMuted) setIsMuted(true); else if (v > 0 && isMuted) setIsMuted(false); }} />
                                    </div>

                                    {/* Bottom overlay: title + actions */}
                                    <div className="absolute bottom-0 inset-x-0 px-4 pb-8 flex items-end justify-between gap-3 z-[10]" dir="rtl">
                                        <div className="max-w-[74%] mb-1">
                                            <h3 className="text-white text-[17px] font-amiri font-bold leading-7 line-clamp-3">{video.title}</h3>
                                            <p className="text-white/70 text-[11px] mt-1 line-clamp-1">{video.channel}</p>
                                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/55 text-white">{video.durationText}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/55 text-white">{video.views}</span>
                                            </div>
                                        </div>

                                        {/* Save button only */}
                                        <div className="flex flex-col gap-3 items-center shrink-0 mb-2">
                                            <button onClick={(e) => { e.stopPropagation(); toggleSave(video.videoId, meta); }}
                                                className={`w-12 h-12 rounded-full border-2 backdrop-blur-md flex items-center justify-center ${itemInteractions.saved ? 'bg-gold-500 border-gold-400 text-black' : 'bg-black/50 border-white/25 text-white'}`}>
                                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill={itemInteractions.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                            </button>
                                            <span className="text-[9px] text-white/80 -mt-1.5">{itemInteractions.saved ? 'محفوظ' : 'حفظ'}</span>
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIDEOS TAB
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div ref={scrollRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
            className={`h-full overflow-y-auto hide-scrollbar pb-28 ${isDark ? 'bg-[#080b14] text-white' : 'bg-[#f4f7fe] text-slate-800'}`}>

            {selectedCategoryId && <PullSpinner isDark={isDark} pullDistance={pullDistance} refreshing={refreshing} />}

            {/* Header */}
            <div className={`px-5 pt-5 pb-3 sticky top-0 backdrop-blur-xl z-20 border-b ${isDark ? 'bg-[#080b14]/90 border-white/5' : 'bg-white/90 border-slate-100'}`}>
                <div className="flex items-center justify-between mb-3">
                    <button onClick={handleBack} className={`w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 ${isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-white border border-slate-100 text-slate-600'}`}>
                        <ChevronLeftIcon className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="text-center">
                        <h1 className={`text-xl font-amiri font-bold ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>
                            {selectedCategory ? selectedCategory.title : 'مكتبة الفيديو'}
                        </h1>
                    </div>
                    {/* Profile icon — navigates to profile where saved/liked are shown */}
                    <button onClick={() => onNavigate?.('profile')}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isDark ? 'bg-white/5 border border-white/10 text-white/80' : 'bg-white border border-slate-100 text-slate-600'}`}>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </button>
                </div>

                {/* Tab pills (only on category selection screen, no saved tab) */}
                {!selectedCategoryId && (
                    <div className="flex gap-1.5" dir="rtl">
                        <TabPill id="videos" label="فيديوهات" />
                        <TabPill id="reels" label="ريلز" />
                    </div>
                )}

                {selectedCategoryId && (
                    <div className={`text-[10px] mt-1 ${isDark ? 'text-white/35' : 'text-slate-400'}`} dir="rtl">
                        {formatUpdatedAt(updatedAt)}{fromCache ? ' • مخزن محلياً' : ''}
                    </div>
                )}
            </div>

            {/* Category grid */}
            {!selectedCategoryId && (
                <div className="px-5 mt-6 grid grid-cols-2 gap-3" dir="rtl">
                    {videoCategories.map((category: VideoCategory) => (
                        <button key={category.id}
                            onClick={() => { setVideoLimit(20); setSelectedCategoryId(category.id); }}
                            className={`rounded-3xl p-4 border text-right transition-all active:scale-[0.98] ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-100 shadow-sm'}`} dir="rtl">
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

            {/* Video list */}
            {selectedCategoryId && (
                <div className="px-5 mt-5 space-y-4">
                    {selectedVideo && currentVideo && viewMode === 'fullscreen' && (
                        <div className={`rounded-3xl overflow-hidden border ${isDark ? 'bg-[#050a14] border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="w-full aspect-video bg-black">
                                <iframe id="global-video-player-iframe" className="w-full h-full" src={iframeSrc}
                                    title={selectedVideo.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
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

                    {loading && <div className={`rounded-3xl p-6 border text-center ${isDark ? 'bg-white/[0.03] border-white/10 text-white/70' : 'bg-white border-slate-100 text-slate-600'}`}>جاري جلب أفضل الفيديوهات...</div>}
                    {error && !loading && <div className={`rounded-3xl p-4 border text-center text-[13px] ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-red-50 border-red-100 text-red-600'}`}>{error}</div>}

                    {!loading && !selectedVideo && videos.map((video) => {
                        const videoMeta: VideoMeta = { videoId: video.videoId, title: video.title, channel: video.channel, thumbnail: video.thumbnail, durationText: video.durationText, views: video.views };
                        const videoInteraction = interactions[video.videoId] || getVideoInteractions(video.videoId);
                        return (
                            <div key={video.id} className={`w-full rounded-3xl border text-right overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-100 shadow-sm'}`} dir="rtl">
                                <button className="w-full text-right active:scale-[0.98] transition-all" onClick={() => { setSelectedVideo(video); openVideo(video); }}>
                                    <div className="relative h-[190px] w-full overflow-hidden">
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                        <div className="absolute bottom-3 left-3 w-10 h-10 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow-lg"><PlayIcon className="w-5 h-5" /></div>
                                        <div className="absolute bottom-3 right-3"><span className="text-[10px] px-2.5 py-1 rounded-full bg-black/60 text-white">{video.views}</span></div>
                                    </div>
                                    <div className="p-4 pb-2">
                                        <h3 className={`text-[16px] font-amiri font-bold leading-7 line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>{video.title}</h3>
                                        <p className={`text-[11px] mt-1 ${isDark ? 'text-white/50' : 'text-slate-500'}`}>{video.channel}</p>
                                    </div>
                                </button>
                                <div className="px-4 pb-4 flex items-center justify-between">
                                    <span className={`text-[10px] px-2 py-1 rounded-full ${isDark ? 'bg-white/5 text-white/70' : 'bg-slate-100 text-slate-600'}`}>{video.durationText}</span>
                                    <button
                                        onClick={() => toggleSave(video.videoId, videoMeta)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all active:scale-95 ${
                                            videoInteraction.saved
                                                ? (isDark ? 'bg-gold-500/20 border-gold-500/40 text-gold-300' : 'bg-gold-50 border-gold-300 text-gold-700')
                                                : (isDark ? 'bg-white/5 border-white/10 text-white/60' : 'bg-white border-slate-200 text-slate-500')
                                        }`}>
                                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={videoInteraction.saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                        {videoInteraction.saved ? 'محفوظ' : 'حفظ'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {!loading && !selectedVideo && videos.length >= videoLimit && (
                        <button onClick={() => setVideoLimit(prev => prev + 20)}
                            className={`w-full py-3 rounded-2xl border text-[13px] font-amiri font-bold active:scale-[0.98] ${isDark ? 'bg-white/[0.03] border-white/10 text-white/85' : 'bg-white border-slate-200 text-slate-700'}`}>
                            تحميل المزيد
                        </button>
                    )}
                </div>
            )}

            <div className="h-8" />
        </div>
    );
}
