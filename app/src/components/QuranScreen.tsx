import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchSurahs, Surah, Verse, fetchVerses, RECITERS, Reciter } from '../services/quranService';
import { ChevronLeftIcon, BookIcon } from './Icons';
import { useBackHandler } from './BackHandlerContext';
import { useTheme } from './ThemeContext';
import { useAudio } from './AudioContext';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toPng } from 'html-to-image';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { logInteraction } from '../services/activityLogStore';

interface QuranScreenProps {
    onBack: () => void;
    autoOpenSurahId?: number | null;
    autoOpenPage?: number | null;
    onAutoOpenConsumed?: () => void;
}

function toArabicNum(n: number): string {
    return n.toString();
}

// ─── Icons ──────────────────────────────────────────────────────────────────
const TafsirIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const RestartIcon = ({ className }: { className?: string }) => (
    <svg className={className || "w-5 h-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
);

// ─── Verse Action Sheet ──────────────────────────────────────────────────────
function VerseActionSheet({ verse, isDark, onClose, onPlay, onRestart, isPlaying, isPaused, onOpenTafsir }: { verse: Verse; isDark: boolean; onClose: () => void; onPlay: () => void; onRestart: () => void; isPlaying: boolean; isPaused: boolean; onOpenTafsir?: (verse: Verse, source: 'ibn_kathir' | 'qurtubi') => void; }) {
    const [showTafsir, setShowTafsir] = useState(false);
    const [tafsirSource, setTafsirSource] = useState<'ibn_kathir' | 'qurtubi'>('ibn_kathir');
    const [dragY, setDragY] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startY.current = e.targetTouches[0].clientY;
        setIsDragging(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentY = e.targetTouches[0].clientY;
        const delta = currentY - startY.current;
        if (delta > 0) setDragY(delta);
    };

    const handleTouchEnd = () => {
        if (dragY > 150) {
            onClose();
        } else {
            setDragY(0);
        }
        setIsDragging(false);
    };

    const currentTafsirRaw = tafsirSource === 'ibn_kathir' ? verse.tafsirs?.ibn_kathir : verse.tafsirs?.qurtubi;
    const currentTafsir = currentTafsirRaw ? currentTafsirRaw.replace(/<[^>]+>/g, '') : '';
    const tafsirTitle = tafsirSource === 'ibn_kathir' ? 'تفسير ابن كثير' : 'تفسير القرطبي';

    return (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" style={{ opacity: Math.max(0, 1 - dragY / 400) }} />
            <div
                className={`relative rounded-t-[40px] p-6 pb-10 max-h-[85vh] overflow-y-auto shadow-2xl transition-transform ${isDark ? 'bg-[#0f1f38] border-t border-white/10' : 'bg-white border-t border-slate-200'} ${!isDragging ? 'duration-300' : ''}`}
                onClick={e => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ transform: `translateY(${dragY}px)` }}
            >
                <div className={`w-12 h-1.5 rounded-full mx-auto mb-6 ${isDark ? 'bg-white/20' : 'bg-slate-200'}`} />
                <div className="flex items-center justify-between mb-6" dir="rtl">
                    <div className={`px-4 py-1.5 rounded-full text-[12px] font-bold ${isDark ? 'bg-gold-500/20 text-gold-300 border border-gold-400/30' : 'bg-gold-50 text-gold-700 border border-gold-200'}`}>
                        {verse.surahName} • آية {verse.numberInSurah}
                    </div>
                    <button onClick={onClose} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <p className={`text-[28px] font-scheherazade leading-[1.8] text-right mb-8 selection:bg-gold-500/30 ${isDark ? 'text-white' : 'text-slate-800'}`} dir="rtl">{verse.text}</p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <button onClick={onPlay} className={`flex flex-col items-center gap-2 py-3.5 rounded-2xl border-2 transition-all ${isPlaying && !isPaused ? 'bg-gold-500 border-gold-500 text-black' : isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <div className="w-6 h-6 flex items-center justify-center">
                            {isPlaying && !isPaused ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 14.5V1.5h3v13h-3zm6 0V1.5h3v13h-3z" transform="translate(4.5, 4.5)" /></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                        </div>
                        <span className="text-[10px] font-bold">{isPlaying && !isPaused ? 'إيقاف' : 'استماع'}</span>
                    </button>
                    <button onClick={onRestart} className={`flex flex-col items-center gap-2 py-3.5 rounded-2xl border-2 transition-all ${isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <RestartIcon className="w-5 h-5" />
                        <span className="text-[10px] font-bold">إعادة</span>
                    </button>
                    <button onClick={() => setShowTafsir(v => !v)} className={`flex flex-col items-center gap-2 py-3.5 rounded-2xl border-2 transition-all ${showTafsir ? 'bg-emerald-500 border-emerald-500 text-white' : isDark ? 'bg-white/5 border-white/10 text-white/70' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                        <TafsirIcon />
                        <span className="text-[10px] font-bold">تفسير</span>
                    </button>
                </div>
                <div className="space-y-4">
                    {showTafsir && (
                        <div className={`p-5 rounded-3xl border animate-fade-in ${isDark ? 'bg-emerald-900/20 border-emerald-500/20 text-white/90' : 'bg-emerald-50 border-emerald-100 text-emerald-900'}`} dir="rtl">
                            <div className="flex items-center justify-between mb-4 border-b border-emerald-500/10 pb-3">
                                <span className="text-[12px] font-bold text-emerald-500">{tafsirTitle}</span>
                                <div className="flex bg-emerald-500/10 rounded-lg p-0.5">
                                    <button
                                        onClick={() => setTafsirSource('ibn_kathir')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${tafsirSource === 'ibn_kathir' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-500/60'}`}
                                    >ابن كثير</button>
                                    <button
                                        onClick={() => setTafsirSource('qurtubi')}
                                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${tafsirSource === 'qurtubi' ? 'bg-emerald-500 text-white shadow-sm' : 'text-emerald-500/60'}`}
                                    >القرطبي</button>
                                </div>
                            </div>
                            <p className="text-[17px] font-amiri leading-relaxed text-right">
                                {currentTafsir ? (
                                    currentTafsir.length > 200 ? (
                                        <>
                                            {currentTafsir.substring(0, 200)}...
                                            <button 
                                                onClick={() => onOpenTafsir?.(verse, tafsirSource)}
                                                className="text-emerald-500 font-bold mr-2 hover:underline"
                                            >
                                                اقرأ المزيد
                                            </button>
                                        </>
                                    ) : currentTafsir
                                ) : 'جاري التحميل...'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main QuranScreen ────────────────────────────────────────────────────────
export function QuranScreen({ onBack, autoOpenSurahId, autoOpenPage, onAutoOpenConsumed }: QuranScreenProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';
    const { isPlaying: globalIsPlaying, isPaused: globalIsPaused, currentSurah: globalCurrentSurah, currentReciter: globalCurrentReciter, playSurah: globalPlaySurah, pauseAudio: globalPauseAudio, resumeAudio: globalResumeAudio, stopAudio: globalStopAudio } = useAudio();
    const [surahs, setSurahs] = useState<Surah[]>([]);
    const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
    const [verses, setVerses] = useState<Verse[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingVerses, setLoadingVerses] = useState(false);
    const [search, setSearch] = useState('');

    // Audio States
    const [playingVerse, setPlayingVerse] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isAutoNext, setIsAutoNext] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [currentReciter, setCurrentReciter] = useState<Reciter>(() => {
        const saved = localStorage.getItem('quran_saved_reciter');
        if (saved) {
            const found = RECITERS.find(r => r.islamicNetworkId === saved);
            if (found) return found;
        }
        return RECITERS[0];
    });
    const [showReciterMenu, setShowReciterMenu] = useState(false);
    const [showAllReciters, setShowAllReciters] = useState(false);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    const [fullScreenTafsir, setFullScreenTafsir] = useState<{ verse: Verse, source: 'ibn_kathir' | 'qurtubi' } | null>(null);
    const [highlightedVerse, setHighlightedVerse] = useState<number | null>(null);

    const handleCloseFullScreenTafsir = () => {
        if (fullScreenTafsir) {
            const verseNum = fullScreenTafsir.verse.numberInSurah;
            setHighlightedVerse(verseNum);
            setTimeout(() => {
                setHighlightedVerse(null);
            }, 2000);
            
            // Scroll to the verse
            setTimeout(() => {
                const el = document.getElementById(`verse-${verseNum}`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
        setFullScreenTafsir(null);
    };

    const pages = useMemo(() => {
        if (verses.length === 0) return [];
        const p: Record<number, Verse[]> = {};
        verses.forEach(v => {
            if (!p[v.page]) p[v.page] = [];
            p[v.page].push(v);
        });
        return Object.keys(p).sort((a, b) => Number(a) - Number(b)).map(k => p[Number(k)]);
    }, [verses]);

    const [savedSurah, setSavedSurah] = useState<number | null>(() => {
        const s = localStorage.getItem('quran_saved_surah');
        return s ? Number(s) : null;
    });
    const [savedVerse, setSavedVerse] = useState<number | null>(() => {
        const v = localStorage.getItem('quran_saved_verse');
        return v ? Number(v) : null;
    });

    const toggleSaveVerse = (verse: Verse) => {
        if (savedSurah === selectedSurah?.number && savedVerse === verse.numberInSurah) {
            localStorage.removeItem('quran_saved_surah');
            localStorage.removeItem('quran_saved_verse');
            setSavedSurah(null);
            setSavedVerse(null);
            logInteraction({
                type: 'quran_unsave_verse',
                category: 'quran',
                title: 'إزالة علامة آية',
                details: `سورة ${selectedSurah?.name || ''} - آية ${verse.numberInSurah}`,
                meta: { surahNumber: selectedSurah?.number || 0, verseNumber: verse.numberInSurah },
            });
        } else {
            if (selectedSurah) {
                localStorage.setItem('quran_saved_surah', selectedSurah.number.toString());
                localStorage.setItem('quran_saved_verse', verse.numberInSurah.toString());
                setSavedSurah(selectedSurah.number);
                setSavedVerse(verse.numberInSurah);
                logInteraction({
                    type: 'quran_save_verse',
                    category: 'quran',
                    title: 'حفظ آية',
                    details: `سورة ${selectedSurah.name} - آية ${verse.numberInSurah}`,
                    meta: { surahNumber: selectedSurah.number, verseNumber: verse.numberInSurah },
                });
            }
        }
    };

    useBackHandler(() => {
        if (selectedSurah) { if (audioRef.current) audioRef.current.pause(); setSelectedSurah(null); setVerses([]); return true; }
        return false;
    }, !!selectedSurah);

    useEffect(() => {
        fetchSurahs().then(data => {
            setSurahs(data);
            const lastSurahNum = localStorage.getItem('last_surah');
            const lastPageNum = localStorage.getItem('last_page');
            if (lastSurahNum && lastPageNum) {
                const s = data.find(surah => surah.number === Number(lastSurahNum));
                if (s) {
                    setSelectedSurah(s);
                    loadVerses(s.number, currentReciter.islamicNetworkId, Number(lastPageNum));
                }
            }
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (autoOpenSurahId && surahs.length > 0) {
            const s = surahs.find(surah => surah.number === autoOpenSurahId);
            if (s) {
                setSelectedSurah(s);
                const lastSurahNum = localStorage.getItem('last_surah');
                const lastPageNum = localStorage.getItem('last_page');
                const targetPage = autoOpenPage ? autoOpenPage : ((lastSurahNum && Number(lastSurahNum) === s.number && lastPageNum) ? Number(lastPageNum) : undefined);
                loadVerses(s.number, currentReciter.islamicNetworkId, targetPage);
                if (onAutoOpenConsumed) onAutoOpenConsumed();
            }
        }
    }, [autoOpenSurahId, autoOpenPage, surahs, currentReciter]);

    useEffect(() => {
        if (selectedSurah && pages.length > 0 && pages[currentPageIndex]) {
            const pageNum = pages[currentPageIndex][0].page;
            localStorage.setItem('last_surah', selectedSurah.number.toString());
            localStorage.setItem('last_page', pageNum.toString());
        }
    }, [selectedSurah, currentPageIndex, pages]);

    const loadVerses = async (surahNum: number, islamicNetworkId: string, targetPage?: number) => {
        setLoadingVerses(true);
        try {
            const data = await fetchVerses(surahNum, islamicNetworkId);
            if (targetPage) {
                const uniquePages = Array.from(new Set(data.map(v => v.page))).sort((a, b) => a - b);
                const pageIdx = uniquePages.indexOf(targetPage);
                setCurrentPageIndex(pageIdx >= 0 ? pageIdx : 0);
            } else {
                setCurrentPageIndex(0);
            }
            setVerses(data);
        } catch (err) { console.error(err); } finally { setLoadingVerses(false); }
    };

    const handleSurahClick = async (surah: Surah) => {
        setSelectedSurah(surah);
        logInteraction({
            type: 'quran_open_surah',
            category: 'quran',
            title: 'فتح سورة',
            details: `سورة ${surah.name}`,
            meta: { surahNumber: surah.number },
        });
        await loadVerses(surah.number, currentReciter.islamicNetworkId);
    };

    const handleReciterChange = async (reciter: Reciter) => {
        setCurrentReciter(reciter);
        localStorage.setItem('quran_saved_reciter', reciter.islamicNetworkId);
        logInteraction({
            type: 'quran_change_reciter',
            category: 'quran',
            title: 'تغيير القارئ',
            details: reciter.arabicName,
            meta: { reciterId: reciter.islamicNetworkId },
        });
        setShowReciterMenu(false);
        if (selectedSurah) {
            if (audioRef.current) { audioRef.current.pause(); setPlayingVerse(null); setIsPlaying(false); setIsPaused(false); }
            const currentPageNum = pages.length > 0 && pages[currentPageIndex] ? pages[currentPageIndex][0].page : undefined;
            await loadVerses(selectedSurah.number, reciter.islamicNetworkId, currentPageNum);
        }
    };

    const handleNextPage = () => {
        if (currentPageIndex < pages.length - 1) {
            setCurrentPageIndex(currentPageIndex + 1);
            logInteraction({
                type: 'quran_next_page',
                category: 'quran',
                title: 'الانتقال للصفحة التالية',
                details: `سورة ${selectedSurah?.name || ''}`,
                meta: { currentPageIndex, nextPageIndex: currentPageIndex + 1 },
            });
        } else if (selectedSurah && selectedSurah.number < 114) {
            const nextSurah = surahs.find(s => s.number === selectedSurah.number + 1);
            if (nextSurah) {
                setSelectedSurah(nextSurah);
                logInteraction({
                    type: 'quran_auto_next_surah',
                    category: 'quran',
                    title: 'الانتقال للسورة التالية',
                    details: `سورة ${nextSurah.name}`,
                    meta: { surahNumber: nextSurah.number },
                });
                loadVerses(nextSurah.number, currentReciter.islamicNetworkId);
            }
        }
    };

    const handlePrevPage = () => {
        if (currentPageIndex > 0) {
            setCurrentPageIndex(currentPageIndex - 1);
            logInteraction({
                type: 'quran_prev_page',
                category: 'quran',
                title: 'الانتقال للصفحة السابقة',
                details: `سورة ${selectedSurah?.name || ''}`,
                meta: { currentPageIndex, prevPageIndex: currentPageIndex - 1 },
            });
        } else if (selectedSurah && selectedSurah.number > 1) {
            const prevSurah = surahs.find(s => s.number === selectedSurah.number - 1);
            if (prevSurah) {
                setSelectedSurah(prevSurah);
                logInteraction({
                    type: 'quran_prev_surah',
                    category: 'quran',
                    title: 'الانتقال للسورة السابقة',
                    details: `سورة ${prevSurah.name}`,
                    meta: { surahNumber: prevSurah.number },
                });
                setLoadingVerses(true);
                fetchVerses(prevSurah.number, currentReciter.islamicNetworkId).then(data => {
                    setVerses(data);
                    const pagesData: Record<number, Verse[]> = {};
                    data.forEach(v => {
                        if (!pagesData[v.page]) pagesData[v.page] = [];
                        pagesData[v.page].push(v);
                    });
                    const uniquePageKeys = Object.keys(pagesData).sort((a, b) => Number(a) - Number(b));
                    setCurrentPageIndex(uniquePageKeys.length - 1);
                }).finally(() => setLoadingVerses(false));
            }
        }
    };

    const playVerse = (verse: Verse, autoNext: boolean) => {
        if (playingVerse === verse.number && audioRef.current) {
            if (isPaused) { audioRef.current.play(); setIsPaused(false); }
            else { audioRef.current.pause(); setIsPaused(true); }
            return;
        }

        if (audioRef.current) audioRef.current.pause();
        setPlayingVerse(verse.number); setIsPlaying(true); setIsPaused(false); setIsAutoNext(autoNext);

        const a = new Audio(`https://cdn.islamic.network/quran/audio/128/${currentReciter.islamicNetworkId}/${verse.number}.mp3`);
        audioRef.current = a; a.play().catch(e => console.error(e));
        logInteraction({
            type: 'quran_play_verse',
            category: 'quran',
            title: 'تشغيل آية',
            details: `سورة ${verse.surahName} - آية ${verse.numberInSurah}`,
            meta: { verseGlobalNumber: verse.number, verseNumberInSurah: verse.numberInSurah, autoNext },
        });
        a.onended = () => {
            if (autoNext) {
                const currentIndex = verses.findIndex(v => v.number === verse.number);
                if (currentIndex < verses.length - 1) {
                    const nextV = verses[currentIndex + 1];
                    if (nextV.page !== verse.page) {
                        const uniquePages = Array.from(new Set(verses.map(v => v.page))).sort((a, b) => a - b);
                        const nextPageIdx = uniquePages.indexOf(nextV.page);
                        if (nextPageIdx !== -1) setCurrentPageIndex(nextPageIdx);
                    }
                    playVerse(nextV, true);
                } else { setPlayingVerse(null); setIsPlaying(false); setIsAutoNext(false); }
            } else { setPlayingVerse(null); setIsPlaying(false); }
        };
    };

    const restartCurrentAudio = () => {
        if (globalCurrentSurah?.number === selectedSurah?.number && selectedSurah) {
            globalPlaySurah(selectedSurah, currentReciter);
        } else if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
            setIsPaused(false);
        }
    };

    const toggleSurahPlay = () => {
        if (!selectedSurah) return;
        
        if (globalCurrentSurah?.number === selectedSurah.number) {
            if (globalIsPlaying && !globalIsPaused) {
                globalPauseAudio();
                logInteraction({
                    type: 'quran_pause_surah',
                    category: 'quran',
                    title: 'إيقاف تلاوة السورة',
                    details: `سورة ${selectedSurah.name}`,
                    meta: { surahNumber: selectedSurah.number },
                });
            } else {
                globalResumeAudio();
                logInteraction({
                    type: 'quran_resume_surah',
                    category: 'quran',
                    title: 'استئناف تلاوة السورة',
                    details: `سورة ${selectedSurah.name}`,
                    meta: { surahNumber: selectedSurah.number },
                });
            }
        } else {
            // Stop local verse audio if playing
            if (audioRef.current) {
                audioRef.current.pause();
                setPlayingVerse(null);
                setIsPlaying(false);
            }
            globalPlaySurah(selectedSurah, currentReciter);
            logInteraction({
                type: 'quran_play_surah',
                category: 'quran',
                title: 'تشغيل تلاوة السورة',
                details: `سورة ${selectedSurah.name} — ${currentReciter.arabicName}`,
                meta: { surahNumber: selectedSurah.number, reciterId: currentReciter.islamicNetworkId },
            });
        }
    };

    useEffect(() => { return () => { if (audioRef.current) audioRef.current.pause(); }; }, []);

    const filteredSurahs = surahs.filter(s => s.name.includes(search) || s.englishName.toLowerCase().includes(search.toLowerCase()));

    if (selectedSurah) {
        if (loadingVerses) {
            return (
                <div className={`h-full flex flex-col ${isDark ? 'bg-[#0a0a14] text-white' : 'bg-[#f8fbff] text-slate-800'}`}>
                    <div className="flex-1 flex flex-col items-center justify-center opacity-60">
                        <div className="w-10 h-10 border-4 border-gold-400/20 border-t-gold-400 rounded-full animate-spin mb-4" />
                        <p className="text-[14px] font-amiri">جاري التحميل...</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={`h-full flex flex-col min-h-0 ${isDark ? 'bg-[#0a0a14] text-white' : 'bg-[#f8fbff] text-slate-800'}`}>
                <div className={`px-5 pt-4 pb-3 border-b sticky top-0 z-20 backdrop-blur-xl shrink-0 ${isDark ? 'bg-[#0b1929]/95 border-white/[0.08]' : 'bg-white/80 border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                        <button onClick={() => { if (audioRef.current) audioRef.current.pause(); setSelectedSurah(null); }} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}><ChevronLeftIcon className="rotate-180" /></button>
                        <div className="text-center flex-1 min-w-0">
                            <h1 className="text-lg font-amiri font-bold truncate">{selectedSurah.name}</h1>
                            <div className="flex items-center justify-center gap-2">
                                <button onClick={() => setShowReciterMenu(!showReciterMenu)} className={`text-[9px] font-bold px-3 py-0.5 rounded-full border border-gold-500/20 ${isDark ? 'text-gold-400 bg-gold-400/10' : 'text-gold-700 bg-gold-50'}`}>{currentReciter.arabicName} ▾</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={restartCurrentAudio} title="إعادة التشغيل" className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white/50' : 'bg-slate-100 text-slate-500'}`}><RestartIcon className="w-4 h-4" /></button>
                            <button onClick={toggleSurahPlay} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${globalCurrentSurah?.number === selectedSurah.number && globalIsPlaying && !globalIsPaused ? 'bg-gold-500 text-black shadow-lg' : 'bg-slate-100 dark:bg-white/10'}`}>
                                {globalCurrentSurah?.number === selectedSurah.number && globalIsPlaying && !globalIsPaused ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 14.5V1.5h3v13h-3zm6 0V1.5h3v13h-3z" transform="translate(4.5, 4.5)" /></svg> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                            </button>
                        </div>
                    </div>
                    {showReciterMenu && (
                        <div className="absolute top-full left-5 right-5 mt-2 rounded-2xl border-2 z-50 animate-slide-down bg-[#15243d] border-white/10 shadow-2xl dark max-h-[60vh] overflow-y-auto hide-scrollbar" dir="rtl">
                            {(showAllReciters ? RECITERS : RECITERS.slice(0, 5)).map(r => (
                                <button key={r.islamicNetworkId} onClick={() => { handleReciterChange(r); setShowReciterMenu(false); }} className={`w-full text-right px-5 py-3.5 transition-colors border-b last:border-0 border-white/5 ${currentReciter.islamicNetworkId === r.islamicNetworkId ? 'text-gold-400 bg-white/5' : 'text-white/60 hover:bg-white/[0.03]'}`}>
                                    <p className="text-[13px] font-amiri font-bold">{r.arabicName}</p>
                                </button>
                            ))}
                            {!showAllReciters && RECITERS.length > 5 && (
                                <button onClick={() => setShowAllReciters(true)} className="w-full text-center px-5 py-3.5 transition-colors text-gold-400 hover:bg-white/[0.03]">
                                    <p className="text-[13px] font-amiri font-bold">عرض المزيد</p>
                                </button>
                            )}
                            {showAllReciters && RECITERS.length > 5 && (
                                <button onClick={() => setShowAllReciters(false)} className="w-full text-center px-5 py-3.5 transition-colors text-gold-400 hover:bg-white/[0.03]">
                                    <p className="text-[13px] font-amiri font-bold">عرض أقل</p>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-6 pb-20 mt-safe-bottom">
                    {verses.map(v => (
                        <VerseCardItem 
                            key={v.number} 
                            verse={v} 
                            isDark={isDark} 
                            isPlaying={playingVerse === v.number} 
                            isPaused={isPaused} 
                            onPlay={() => playVerse(v, false)} 
                            isSaved={savedSurah === selectedSurah?.number && savedVerse === v.numberInSurah}
                            onToggleSave={() => toggleSaveVerse(v)}
                            isHighlighted={highlightedVerse === v.numberInSurah}
                            onOpenTafsir={(verse, source) => {
                                logInteraction({
                                    type: 'quran_open_tafsir',
                                    category: 'quran',
                                    title: 'فتح تفسير آية',
                                    details: `سورة ${verse.surahName} - آية ${verse.numberInSurah}`,
                                    meta: { source, verseNumberInSurah: verse.numberInSurah },
                                });
                                setFullScreenTafsir({ verse, source });
                            }}
                        />
                    ))}
                </div>

                {/* Full Screen Tafsir Modal */}
                {fullScreenTafsir && (
                    <div className={`fixed inset-0 z-50 flex flex-col ${isDark ? 'bg-[#0a0a14] text-white' : 'bg-[#f8fbff] text-slate-800'}`}>
                        <div className={`px-5 pt-4 pb-3 border-b sticky top-0 z-20 backdrop-blur-xl shrink-0 flex items-center justify-between ${isDark ? 'bg-[#0b1929]/95 border-white/[0.08]' : 'bg-white/80 border-slate-200'}`}>
                            <button onClick={handleCloseFullScreenTafsir} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/[0.08]' : 'bg-slate-100'}`}>
                                <ChevronLeftIcon className="rotate-180" />
                            </button>
                            <h2 className="text-lg font-amiri font-bold">
                                {fullScreenTafsir.source === 'ibn_kathir' ? 'تفسير ابن كثير' : 'تفسير القرطبي'}
                            </h2>
                            <div className="w-10" /> {/* Spacer for centering */}
                        </div>
                        <div className="flex-1 overflow-y-auto p-6" dir="rtl">
                            <div className={`p-6 rounded-2xl mb-6 text-center ${isDark ? 'bg-white/5' : 'bg-white shadow-sm'}`}>
                                <p className="text-2xl font-amiri leading-loose text-gold-500 mb-4">
                                    {fullScreenTafsir.verse.text}
                                </p>
                                <span className="text-sm opacity-60 font-amiri">
                                    {selectedSurah.name} - آية {toArabicNum(fullScreenTafsir.verse.numberInSurah)}
                                </span>
                            </div>
                            
                            <div className="flex justify-center mb-8">
                                <div className={`flex rounded-xl p-1 ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                                    <button
                                        onClick={() => setFullScreenTafsir({ ...fullScreenTafsir, source: 'ibn_kathir' })}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${fullScreenTafsir.source === 'ibn_kathir' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-500/60 hover:text-emerald-500'}`}
                                    >
                                        ابن كثير
                                    </button>
                                    <button
                                        onClick={() => setFullScreenTafsir({ ...fullScreenTafsir, source: 'qurtubi' })}
                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${fullScreenTafsir.source === 'qurtubi' ? 'bg-emerald-500 text-white shadow-md' : 'text-emerald-500/60 hover:text-emerald-500'}`}
                                    >
                                        القرطبي
                                    </button>
                                </div>
                            </div>

                            <div 
                                className="prose prose-lg max-w-none dark:prose-invert font-amiri leading-loose text-lg"
                                dangerouslySetInnerHTML={{ 
                                    __html: fullScreenTafsir.source === 'ibn_kathir' 
                                        ? fullScreenTafsir.verse.tafsirs?.ibn_kathir || ''
                                        : fullScreenTafsir.verse.tafsirs?.qurtubi || ''
                                }}
                            />
                        </div>
                    </div>
                )}

            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${isDark ? 'bg-gradient-to-b from-[#0b1929] to-[#0a1525]' : 'bg-[#f8fbff]'}`}>
            <div className={`p-5 sticky top-0 z-20 shadow-lg ${isDark ? 'bg-[#0b1929]/90' : 'bg-white/95'}`}>
                <div className="flex items-center justify-between mb-5">
                    <button onClick={onBack} className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}><ChevronLeftIcon className="rotate-180" /></button>
                    <h1 className="text-2xl font-amiri font-bold">القرآن الكريم</h1>
                    <div className="w-11" />
                </div>
                {savedSurah && (
                    <button onClick={async () => {
                        const s = surahs.find(x => x.number === savedSurah);
                        if (s) { 
                            logInteraction({
                                type: 'quran_resume_saved_position',
                                category: 'quran',
                                title: 'مواصلة القراءة',
                                details: `سورة ${s.name} - آية ${savedVerse ?? 0}`,
                                meta: { surahNumber: s.number, verseNumber: savedVerse ?? 0 },
                            });
                            setSelectedSurah(s); 
                            await loadVerses(s.number, currentReciter.islamicNetworkId); 
                            setTimeout(() => {
                                const el = document.getElementById(`verse-${savedVerse}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 500);
                        }
                    }} className={`w-full mb-4 p-4 rounded-[24px] border-2 flex items-center gap-4 animate-pulse ${isDark ? 'bg-gold-500/5 border-gold-500/20 text-gold-400' : 'bg-gold-50 border-gold-200 text-gold-700'}`} dir="rtl">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        <span className="font-amiri font-bold text-[15px]">مواصلة القراءة من سورة {surahs.find(x => x.number === savedSurah)?.name}، آية {toArabicNum(savedVerse ?? 0)}</span>
                    </button>
                )}
                <input type="text" placeholder="ابحث عن سورة مباركة..." value={search} onChange={(e) => setSearch(e.target.value)} className={`w-full border-2 rounded-[22px] px-6 py-4 text-right outline-none ${isDark ? 'bg-black/30 border-white/10 text-white focus:border-gold-500' : 'bg-white focus:border-gold-500 shadow-sm border-slate-100'}`} dir="rtl" />
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-6 pb-20 mt-safe-bottom">
                {loading ? <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-gold-400/20 border-t-gold-400 rounded-full animate-spin" /></div> : (
                    <div className="grid gap-3">
                        {filteredSurahs.map(s => {
                            const isLastRead = localStorage.getItem('last_surah') === s.number.toString();
                            return (
                                <button
                                    key={s.number}
                                    onClick={() => handleSurahClick(s)}
                                    className={`flex items-center justify-between p-4 rounded-[24px] border-2 transition-all text-right group relative overflow-hidden ${isLastRead ? (isDark ? 'bg-gold-500/10 border-gold-500/30' : 'bg-gold-50/50 border-gold-200 shadow-md') : (isDark ? 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.06]' : 'bg-white border-transparent hover:bg-gold-50/50 shadow-sm')}`}
                                >
                                    <div className="flex items-center gap-4 flex-row-reverse text-right">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-amiri font-bold ${isLastRead ? 'bg-gold-500 text-black' : isDark ? 'bg-gold-500/10 text-gold-400' : 'bg-gold-50 text-gold-600'}`}>{toArabicNum(s.number)}</div>
                                        <div className="text-right">
                                            <p className={`text-[17px] font-amiri font-bold ${isDark ? (isLastRead ? 'text-gold-200' : 'text-white') : (isLastRead ? 'text-gold-900' : 'text-slate-800')}`}>{s.name}</p>
                                            <p className={`text-right text-[10px] opacity-40 uppercase font-bold`}>{s.revelationType} • {s.versesCount} آية</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {isLastRead && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-gold-500/20 text-gold-400' : 'bg-gold-500 text-black'}`}>آخر قراءة</span>}
                                        <BookIcon className={`w-5 h-5 ${isLastRead ? 'text-gold-500' : 'text-slate-300 group-hover:text-gold-500'}`} />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function VerseCardItem({ verse, isDark, isPlaying, isPaused, onPlay, isSaved, onToggleSave, onOpenTafsir, isHighlighted }: { verse: Verse; isDark: boolean; isPlaying: boolean; isPaused: boolean; onPlay: () => void; isSaved: boolean; onToggleSave: () => void; onOpenTafsir: (verse: Verse, source: 'ibn_kathir' | 'qurtubi') => void; isHighlighted?: boolean; }) {
    const [showTafsir, setShowTafsir] = useState(false);
    const [tafsirSource, setTafsirSource] = useState<'ibn_kathir' | 'qurtubi'>('ibn_kathir');
    const [isSharing, setIsSharing] = useState(false);

    const currentTafsirRaw = tafsirSource === 'ibn_kathir' ? verse.tafsirs?.ibn_kathir : verse.tafsirs?.qurtubi;
    const currentTafsir = currentTafsirRaw ? currentTafsirRaw.replace(/<[^>]+>/g, '') : '';
    const tafsirTitle = tafsirSource === 'ibn_kathir' ? 'تفسير ابن كثير' : 'تفسير القرطبي';

    const handleCopy = async () => {
        const text = `﴿ ${verse.text} ﴾\n\n[سورة ${verse.surahName} - آية ${verse.numberInSurah}]\n\n(تم النسخ من تطبيق Sirat 🌙)`;
        await Clipboard.write({ string: text });
        Haptics.notification({ type: NotificationType.Success });
        logInteraction({
            type: 'quran_copy_verse',
            category: 'quran',
            title: 'نسخ آية',
            details: `سورة ${verse.surahName} - آية ${verse.numberInSurah}`,
            meta: { verseNumberInSurah: verse.numberInSurah },
        });
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const cardElement = document.getElementById(`share-card-${verse.number}`);
            if (!cardElement) return;
            
            const dataUrl = await toPng(cardElement, { cacheBust: true, quality: 0.95 });
            const base64Data = dataUrl.split(',')[1];
            const fileName = `ayah_${verse.number}.png`;
            
            const savedFile = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache
            });
            
            await Share.share({
                title: `سورة ${verse.surahName} - آية ${verse.numberInSurah}`,
                url: savedFile.uri,
                dialogTitle: 'مشاركة الآية'
            });
        } catch (error) {
            console.error('Error sharing:', error);
            // Fallback to text share
            const text = `﴿ ${verse.text} ﴾\n\n[سورة ${verse.surahName} - آية ${verse.numberInSurah}]\n\n(تمت المشاركة عبر تطبيق Sirat 🌙)`;
            await Share.share({
                title: `سورة ${verse.surahName} - آية ${verse.numberInSurah}`,
                text: text,
                dialogTitle: 'مشاركة الآية'
            });
        } finally {
            setIsSharing(false);
        }
        logInteraction({
            type: 'quran_share_verse',
            category: 'quran',
            title: 'مشاركة آية',
            details: `سورة ${verse.surahName} - آية ${verse.numberInSurah}`,
            meta: { verseNumberInSurah: verse.numberInSurah },
        });
    };

    return (
        <div id={`verse-${verse.numberInSurah}`} className={`p-5 rounded-[28px] border-2 mb-6 transition-all duration-500 ${isHighlighted ? (isDark ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/20' : 'bg-emerald-50 border-emerald-400 shadow-lg shadow-emerald-500/20') : isDark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white border-slate-100 shadow-sm hover:shadow-md'} ${isSaved && !isHighlighted ? (isDark ? 'border-gold-500/50 shadow-gold-500/10' : 'border-gold-400 shadow-gold-500/20') : ''}`}>
            {/* Hidden Share Card */}
            <div className="overflow-hidden h-0 w-0 absolute pointer-events-none">
                <div id={`share-card-${verse.number}`} className="w-[1080px] h-[1080px] bg-gradient-to-b from-[#0b1929] to-[#0a1525] flex flex-col items-center justify-center p-16 text-center relative" dir="rtl">
                    <div className="absolute inset-0 border-[20px] border-gold-500/20 m-8 rounded-[40px]" />
                    <div className="absolute inset-0 border-2 border-gold-500/40 m-12 rounded-[30px]" />
                    
                    <svg className="w-24 h-24 text-gold-500 mb-12 opacity-80" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                    
                    <p className="text-[60px] font-scheherazade text-white leading-relaxed mb-16 px-12" style={{ fontFamily: "'Scheherazade New', serif" }}>
                        ﴿ {verse.text} ﴾
                    </p>
                    
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-[32px] font-amiri text-gold-400" style={{ fontFamily: "'Amiri', serif" }}>سورة {verse.surahName} - آية {verse.numberInSurah}</p>
                        <div className="w-32 h-1 bg-gold-500/30 rounded-full my-4" />
                        <p className="text-[24px] font-amiri text-white/60" style={{ fontFamily: "'Amiri', serif" }}>تمت المشاركة عبر تطبيق Sirat 🌙</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-start gap-4" dir="rtl">
                    <div className={`w-9 h-9 shrink-0 border-2 rounded-full flex items-center justify-center font-bold text-gold-400 mt-2 ${isDark ? 'border-gold-400/10' : 'border-gold-100'}`}>{toArabicNum(verse.numberInSurah)}</div>
                    <p className={`flex-1 text-[24px] md:text-[26px] font-scheherazade leading-relaxed text-right ${isDark ? 'text-white' : 'text-slate-800'}`}>{verse.text}</p>
                </div>
                
                <div className="flex items-center justify-between mt-3 pt-4 border-t transition-colors" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} dir="rtl">
                    <div className="flex items-center gap-2">
                        <button onClick={onPlay} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isPlaying && !isPaused ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/30' : isDark ? 'bg-white/10 text-gold-400' : 'bg-slate-50 text-gold-600 border'}`}>
                            {isPlaying && !isPaused ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 14.5V1.5h3v13h-3zm6 0V1.5h3v13h-3z" transform="translate(4.5, 4.5)" /></svg> : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                        </button>
                        <button onClick={onToggleSave} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSaved ? 'bg-gold-500 text-black shadow-lg shadow-gold-500/30' : isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-50 text-slate-400 border'}`}>
                            <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopy} title="نسخ" className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${isDark ? 'border-white/5 text-slate-400 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                        <button onClick={handleShare} disabled={isSharing} title="مشاركة" className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${isDark ? 'border-white/5 text-slate-400 hover:bg-white/10' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} ${isSharing ? 'opacity-50' : ''}`}>
                            {isSharing ? (
                                <div className="w-4 h-4 border-2 border-slate-400/20 border-t-slate-400 rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            )}
                        </button>
                        <button onClick={() => setShowTafsir(!showTafsir)} title="التفسير" className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${showTafsir ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 dark:border-white/5 text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10'}`}>
                            <TafsirIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                {showTafsir && (
                    <div className={`mt-2 p-5 rounded-2xl border-2 text-right animate-slide-down ${isDark ? 'bg-emerald-500/5 border-emerald-500/10 text-white/80' : 'bg-emerald-50/50 border-emerald-100 text-emerald-900'}`} dir="rtl">
                            <div className="flex items-center justify-between mb-4 border-b border-emerald-500/10 pb-3">
                                <span className="text-[11px] font-bold text-emerald-600">{tafsirTitle}</span>
                                <div className="flex bg-emerald-500/5 rounded-lg p-0.5">
                                    <button
                                        onClick={() => setTafsirSource('ibn_kathir')}
                                        className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${tafsirSource === 'ibn_kathir' ? 'bg-emerald-500 text-white' : 'text-emerald-500/60'}`}
                                    >ابن كثير</button>
                                    <button
                                        onClick={() => setTafsirSource('qurtubi')}
                                        className={`px-3 py-1 rounded-md text-[9px] font-bold transition-all ${tafsirSource === 'qurtubi' ? 'bg-emerald-500 text-white' : 'text-emerald-500/60'}`}
                                    >القرطبي</button>
                                </div>
                            </div>
                            <p className="text-[17px] font-amiri leading-relaxed">
                                {currentTafsir ? (
                                    currentTafsir.length > 200 ? (
                                        <>
                                            {currentTafsir.substring(0, 200)}...
                                            <button onClick={() => onOpenTafsir(verse, tafsirSource)} className="text-emerald-500 font-bold mr-2 text-[14px] hover:underline">
                                                اقرأ المزيد
                                            </button>
                                        </>
                                    ) : (
                                        currentTafsir
                                    )
                                ) : 'جاري التحميل...'}
                            </p>
                        </div>
                    )}
            </div>
        </div>
    );
}
