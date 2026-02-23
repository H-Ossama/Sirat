import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { FetchedVideoItem } from '../services/youtubeContentService';

interface VideoPlayerContextType {
    currentVideo: FetchedVideoItem | null;
    iframeSrc: string;
    isPlaying: boolean;
    viewMode: 'fullscreen' | 'mini';
    openVideo: (video: FetchedVideoItem) => void;
    minimizeVideo: () => void;
    closeVideo: () => void;
    togglePlayPause: () => void;
    seekBy: (seconds: number) => void;
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined);
const VIDEO_MINI_PLAYER_KEY = 'video_mini_player_enabled';

function getEmbedUrl(videoId: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://localhost';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(origin)}`;
}

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
    const [currentVideo, setCurrentVideo] = useState<FetchedVideoItem | null>(null);
    const [iframeSrc, setIframeSrc] = useState('');
    const [isPlaying, setIsPlaying] = useState(true);
    const [currentSeconds, setCurrentSeconds] = useState(0);
    const [viewMode, setViewMode] = useState<'fullscreen' | 'mini'>('fullscreen');
    const currentSecondsRef = React.useRef(0);
    const currentVideoRef = React.useRef<FetchedVideoItem | null>(null);

    // Listen to YouTube iframe postMessages for accurate current-time tracking
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            try {
                const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                if (data?.event === 'infoDelivery' && typeof data?.info?.currentTime === 'number') {
                    const t = Math.floor(data.info.currentTime);
                    setCurrentSeconds(t);
                    currentSecondsRef.current = t;
                }
            } catch { /* ignore */ }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    const isMiniEnabled = () => {
        const value = localStorage.getItem(VIDEO_MINI_PLAYER_KEY);
        return value === null ? true : value === 'true';
    };

    // Fallback interval tracker (used when YouTube infoDelivery postMessages don't fire)
    useEffect(() => {
        if (!currentVideo || !isPlaying) return;
        const timer = setInterval(() => {
            setCurrentSeconds(prev => {
                const next = prev + 1;
                currentSecondsRef.current = next;
                return next;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [currentVideo, isPlaying]);

    const sendCommand = (func: string, args: unknown[] = []) => {
        const iframe = document.getElementById('global-video-player-iframe') as HTMLIFrameElement | null;
        iframe?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func, args }),
            '*'
        );
    };

    const openVideo = (video: FetchedVideoItem) => {
        setCurrentVideo(video);
        currentVideoRef.current = video;
        setIframeSrc(getEmbedUrl(video.videoId));
        setIsPlaying(true);
        setCurrentSeconds(0);
        currentSecondsRef.current = 0;
        setViewMode('fullscreen');
    };

    const minimizeVideo = () => {
        if (!currentVideo) return;
        if (!isMiniEnabled()) {
            closeVideo();
            return;
        }
        // Encode current position so the mini-player iframe resumes from where the user left off
        const startSec = Math.max(0, currentSecondsRef.current - 1);
        if (startSec > 2) {
            setIframeSrc(getEmbedUrl(currentVideo.videoId) + `&start=${startSec}`);
        }
        setViewMode('mini');
    };

    const closeVideo = () => {
        sendCommand('stopVideo');
        setCurrentVideo(null);
        currentVideoRef.current = null;
        setIframeSrc('');
        setIsPlaying(false);
        setCurrentSeconds(0);
        currentSecondsRef.current = 0;
        setViewMode('fullscreen');
    };

    const togglePlayPause = () => {
        if (!currentVideo) return;
        if (isPlaying) {
            sendCommand('pauseVideo');
            setIsPlaying(false);
        } else {
            sendCommand('playVideo');
            setIsPlaying(true);
        }
    };

    const seekBy = (seconds: number) => {
        if (!currentVideo) return;
        const target = Math.max(0, currentSeconds + seconds);
        sendCommand('seekTo', [target, true]);
        setCurrentSeconds(target);
    };

    const value = useMemo<VideoPlayerContextType>(() => ({
        currentVideo,
        iframeSrc,
        isPlaying,
        viewMode,
        openVideo,
        minimizeVideo,
        closeVideo,
        togglePlayPause,
        seekBy,
    }), [currentVideo, iframeSrc, isPlaying, viewMode]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.visibilityState === 'hidden' && currentVideo && viewMode === 'fullscreen') {
                if (isMiniEnabled()) {
                    setViewMode('mini');
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [currentVideo, viewMode]);

    return <VideoPlayerContext.Provider value={value}>{children}</VideoPlayerContext.Provider>;
}

export function useVideoPlayer() {
    const context = useContext(VideoPlayerContext);
    if (!context) throw new Error('useVideoPlayer must be used within VideoPlayerProvider');
    return context;
}
