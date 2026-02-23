import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Reciter, Surah } from '../services/quranService';

interface AudioContextType {
    isPlaying: boolean;
    isPaused: boolean;
    currentSurah: Surah | null;
    currentReciter: Reciter | null;
    playSurah: (surah: Surah, reciter: Reciter) => void;
    pauseAudio: () => void;
    resumeAudio: () => void;
    stopAudio: () => void;
    progress: number; // 0 to 1
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentSurah, setCurrentSurah] = useState<Surah | null>(null);
    const [currentReciter, setCurrentReciter] = useState<Reciter | null>(null);
    const [progress, setProgress] = useState(0);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.addEventListener('timeupdate', () => {
                if (audioRef.current && audioRef.current.duration) {
                    setProgress(audioRef.current.currentTime / audioRef.current.duration);
                }
            });
            audioRef.current.addEventListener('ended', () => {
                setIsPlaying(false);
                setIsPaused(false);
                setProgress(0);
            });
            audioRef.current.addEventListener('pause', () => {
                setIsPaused(true);
            });
            audioRef.current.addEventListener('play', () => {
                setIsPaused(false);
                setIsPlaying(true);
            });
        }
        
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    const updateMediaSession = (surah: Surah, reciter: Reciter) => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `سورة ${surah.name}`,
                artist: reciter.arabicName,
                album: 'القرآن الكريم',
                artwork: [
                    { src: '/assets/icon/icon.png', sizes: '512x512', type: 'image/png' }
                ]
            });

            navigator.mediaSession.setActionHandler('play', () => resumeAudio());
            navigator.mediaSession.setActionHandler('pause', () => pauseAudio());
            navigator.mediaSession.setActionHandler('stop', () => stopAudio());
        }
    };

    const playSurah = (surah: Surah, reciter: Reciter) => {
        if (audioRef.current) {
            const url = `https://cdn.islamic.network/quran/audio-surah/128/${reciter.islamicNetworkId}/${surah.number}.mp3`;
            
            if (currentSurah?.number === surah.number && currentReciter?.islamicNetworkId === reciter.islamicNetworkId) {
                // Same surah, just resume if paused
                if (isPaused) {
                    audioRef.current.play().catch(console.error);
                } else {
                    // Restart
                    audioRef.current.currentTime = 0;
                    audioRef.current.play().catch(console.error);
                }
            } else {
                // New surah
                audioRef.current.src = url;
                audioRef.current.play().catch(console.error);
                setCurrentSurah(surah);
                setCurrentReciter(reciter);
                updateMediaSession(surah, reciter);
            }
        }
    };

    const pauseAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    const resumeAudio = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(console.error);
        }
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentSurah(null);
            setProgress(0);
        }
    };

    return (
        <AudioContext.Provider value={{ isPlaying, isPaused, currentSurah, currentReciter, playSurah, pauseAudio, resumeAudio, stopAudio, progress }}>
            {children}
        </AudioContext.Provider>
    );
}

export function useAudio() {
    const context = useContext(AudioContext);
    if (context === undefined) {
        throw new Error('useAudio must be used within an AudioProvider');
    }
    return context;
}
