import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { fetchMushafPage, MushafVerse, injectPageFont, getMushafFontFamily, fetchSurahs, Surah, RECITERS, TAFSIR_SOURCES, downloadFullQuran, checkOfflineStatus, clearOfflineData } from '../services/quranService';
import { useTheme } from './ThemeContext';
import { logInteraction } from '../services/activityLogStore';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { Clipboard } from '@capacitor/clipboard';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { toPng } from 'html-to-image';

function toArabicNum(n: number | string): string {
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return n.toString().split('').map(char => {
    const digit = parseInt(char);
    return isNaN(digit) ? char : arabic[digit];
  }).join('');
}

// SVG Icons
const PlayIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M8 5v14l11-7z" /></svg>;
const PauseIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
const BookmarkIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>;
const CopyIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>;
const ShareIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" /></svg>;
const SettingsIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.73 8.87a.49.49 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .43-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.49-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" /></svg>;
const BookIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" /></svg>;
const TafsirIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);
const FlagIcon = ({ className }: { className?: string }) => <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" /></svg>;

const JUZ_START_PAGES = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

/** Reusable drag-to-close hook for bottom sheets */
function useDragToClose(onClose: () => void) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.targetTouches[0].clientY;
    setDragging(true);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const dy = e.targetTouches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 120) { onClose(); setDragY(0); }
    else { setDragY(0); }
    setDragging(false);
  };

  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
  };

  return { dragY, sheetStyle, onTouchStart, onTouchMove, onTouchEnd };
}

interface Props {
  onBack: () => void;
  autoOpenSurahId?: number | null;
  autoOpenPage?: number | null;
  autoOpenVerseId?: number | null;
  onAutoOpenConsumed?: () => void;
}

export function QuranScreenV2({ onBack, autoOpenSurahId, autoOpenPage, autoOpenVerseId, onAutoOpenConsumed }: Props) {
  const { theme } = useTheme();

  // State
  const [currentPage, setCurrentPage] = useState<number>(() => parseInt(localStorage.getItem('mushaf_last_page') || '1', 10));
  const [verses, setVerses] = useState<MushafVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [viewMode, setViewMode] = useState<'image' | 'text'>(() => (localStorage.getItem('mushaf_view_mode') as 'image' | 'text') || 'image');

  // Settings
  const [fontScale, setFontScale] = useState<number>(() => parseFloat(localStorage.getItem('mushaf_font_scale') || '1'));
  const [fontType, setFontType] = useState<string>(() => localStorage.getItem('mushaf_font_type') || 'uthmani');
  const [pageTheme, setPageTheme] = useState<string>(() => localStorage.getItem('mushaf_page_theme') || 'cream');
  const [showSettings, setShowSettings] = useState(false);
  const [showIndex, setShowIndex] = useState(false);
  const [indexTab, setIndexTab] = useState<'surah' | 'juz'>('surah');
  const [indexSearch, setIndexSearch] = useState('');

  // Tafsir & Actions
  const [selectedVerse, setSelectedVerse] = useState<MushafVerse | null>(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [activeTafsirId, setActiveTafsirId] = useState<number>(() => {
    const saved = localStorage.getItem('mushaf_tafsir_id');
    return saved ? parseInt(saved) : 14;
  });
  const [tafsirLoading, setTafsirLoading] = useState(false);

  // Fallback fetch for missing tafsir
  useEffect(() => {
    if (showTafsir && selectedVerse && !selectedVerse.tafsirs?.[activeTafsirId]) {
      const fetchMissing = async () => {
        setTafsirLoading(true);
        try {
          const res = await fetch(`https://api.quran.com/api/v4/tafsirs/${activeTafsirId}/by_ayah/${selectedVerse.verseKey}`);
          if (res.ok) {
            const data = await res.json();
            const text = data.tafsir?.text;
            if (text) {
              setVerses(prev => prev.map(v => 
                v.id === selectedVerse.id 
                  ? { ...v, tafsirs: { ...(v.tafsirs || {}), [activeTafsirId]: text } } 
                  : v
              ));
              setSelectedVerse(prev => prev?.id === selectedVerse.id 
                ? { ...prev, tafsirs: { ...(prev.tafsirs || {}), [activeTafsirId]: text } } 
                : prev
              );
            }
          }
        } catch (e) {
          console.error("Failed to fetch missing tafsir:", e);
        } finally {
          setTafsirLoading(false);
        }
      };
      fetchMissing();
    }
  }, [showTafsir, selectedVerse, activeTafsirId]);

  // Audio
  const [reciterId, setReciterId] = useState(() => localStorage.getItem('mushaf_reciter') || '7');
  const [playingVerseKey, setPlayingVerseKey] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingIndexRef = useRef<number>(-1);
  const [isJumpPending, setIsJumpPending] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Offline Download State
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineProgress, setOfflineProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => localStorage.getItem('mushaf_banner_dismissed') === 'true');
  const downloadController = useRef<AbortController | null>(null);
  const activeIndexRef = useRef<HTMLButtonElement | null>(null);

  // Scroll to active index item
  useEffect(() => {
    if (showIndex) {
      setTimeout(() => {
        activeIndexRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showIndex, indexTab]);

  useEffect(() => {
    checkOfflineStatus().then(p => {
      setOfflineProgress(p);
      setIsOffline(p === 100);
    });
  }, []);

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem('mushaf_banner_dismissed', 'true');
  };

  useEffect(() => {
    if (surahs.length > 0 && (autoOpenSurahId || autoOpenPage)) {
      let targetPage = currentPage;
      
      if (autoOpenPage) {
        targetPage = autoOpenPage;
      } else if (autoOpenSurahId) {
        const surah = surahs.find(s => s.number === autoOpenSurahId);
        if (surah && surah.pages[0]) {
          targetPage = surah.pages[0];
        }
      }

      setCurrentPage(targetPage);
    }
  }, [surahs, autoOpenSurahId, autoOpenPage]);

  // Handle auto-open verse selection and scrolling
  useEffect(() => {
    if (!loading && autoOpenVerseId && verses.length > 0) {
      const verse = verses.find(v => v.verseNumber === autoOpenVerseId);
      if (verse) {
        setSelectedVerse(verse);
        setTimeout(() => {
          const el = document.getElementById(`verse-${verse.verseKey.replace(':', '-')}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          // Cleanup props after use to avoid re-triggering on manual navigation
          onAutoOpenConsumed?.();
        }, 500);
      } else {
        // Verse not on this page? That shouldn't happen if page is correctly set.
        onAutoOpenConsumed?.();
      }
    } else if (!loading && !autoOpenVerseId && (autoOpenSurahId || autoOpenPage)) {
      // Just auto-opened a surah/page without a specific verse
      onAutoOpenConsumed?.();
    }
  }, [loading, verses, autoOpenVerseId]);

  useEffect(() => {
    setImageError(false);
  }, [currentPage]);

  const startDownload = async () => {
    const controller = new AbortController();
    downloadController.current = controller;
    setDownloadProgress(0);
    try {
      await downloadFullQuran(p => {
        setDownloadProgress(p);
        setOfflineProgress(p);
      }, controller.signal);
      setIsOffline(true);
      setDownloadProgress(null);
      Haptics.notification({ type: NotificationType.Success });
    } catch (e: any) {
      if (e.message !== 'Download cancelled') {
        alert("حدث خطأ أثناء التحميل. يرجى المحاولة مرة أخرى.");
      }
      setDownloadProgress(null);
      // Re-check actual progress
      checkOfflineStatus().then(setOfflineProgress);
    } finally {
      downloadController.current = null;
    }
  };

  const cancelDownload = () => {
    if (downloadController.current) {
      downloadController.current.abort();
      setDownloadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (confirm("هل تريد حذف كافة البيانات المحملة (القرآن والتفسير)؟")) {
      try {
        await clearOfflineData();
        setOfflineProgress(0);
        setIsOffline(false);
        setDownloadProgress(null);
        Haptics.notification({ type: NotificationType.Warning });
        // Optional: reload data to force online fallback
        setCurrentPage(p => p); 
      } catch (e) {
        console.error("Delete failed:", e);
        alert("فشل حذف البيانات. يرجى المحاولة مرة أخرى.");
      }
    }
  };

  // Flag/Last Read
  const [lastRead, setLastRead] = useState<{ surah: number, verse: number, page: number, surahName: string } | null>(() => {
    const s = localStorage.getItem('mushaf_last_read_pos');
    return s ? JSON.parse(s) : null;
  });
  const [flaggedVerse, setFlaggedVerse] = useState<{ surah: number, verse: number, page: number } | null>(() => {
    const saved = localStorage.getItem('mushaf_flagged_verse');
    return saved ? JSON.parse(saved) : null;
  });

  // Update local storage when tafsir source changes
  useEffect(() => {
    localStorage.setItem('mushaf_tafsir_id', activeTafsirId.toString());
  }, [activeTafsirId]);

  // Load basic data
  useEffect(() => {
    fetchSurahs().then(setSurahs).catch(console.error);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update Settings
  useEffect(() => {
    document.documentElement.style.setProperty('--mushaf-font-scale', fontScale.toString());
    localStorage.setItem('mushaf_font_scale', fontScale.toString());
  }, [fontScale]);

  useEffect(() => { localStorage.setItem('mushaf_font_type', fontType); }, [fontType]);
  useEffect(() => { localStorage.setItem('mushaf_page_theme', pageTheme); }, [pageTheme]);
  useEffect(() => { localStorage.setItem('mushaf_reciter', reciterId); }, [reciterId]);
  useEffect(() => { localStorage.setItem('mushaf_view_mode', viewMode); }, [viewMode]);

  // Load Page Data
  useEffect(() => {
    let active = true;
    setLoading(true);

    if (fontType === 'uthmani') {
      injectPageFont(currentPage);
    }

    fetchMushafPage(currentPage, reciterId)
      .then(data => {
        if (active) {
          setVerses(data);
          localStorage.setItem('mushaf_last_page', currentPage.toString());

          // Update last read (global position)
          if (data.length > 0) {
            const firstV = data[0];
            const sName = surahs.find(s => s.number === firstV.chapterId)?.name || '';
            const pos = { surah: firstV.chapterId, verse: firstV.verseNumber, page: currentPage, surahName: sName };
            setLastRead(pos);
            localStorage.setItem('mushaf_last_read_pos', JSON.stringify(pos));
          }

          // Handle pending flag jump selection
          if (isJumpPending && flaggedVerse) {
            const verseToSelect = data.find(v => v.chapterId === flaggedVerse.surah && v.verseNumber === flaggedVerse.verse);
            if (verseToSelect) {
              setSelectedVerse(verseToSelect);
            }
            setIsJumpPending(false);
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [currentPage, reciterId, fontType]);

  // Audio Playback
  const playVerse = async (verse: MushafVerse, index: number) => {
    if (!verse.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(verse.audioUrl);
    audioRef.current = audio;
    setPlayingVerseKey(verse.verseKey);
    playingIndexRef.current = index;
    setIsPlaying(true);

    audio.onended = () => {
      // Auto advance
      if (playingIndexRef.current < verses.length - 1) {
        const nextIdx = playingIndexRef.current + 1;
        playVerse(verses[nextIdx], nextIdx);
      } else if (currentPage < 604) {
        // Go to next page and continue
        setCurrentPage(p => p + 1);
        setIsPlaying(false);
        setPlayingVerseKey(null);
      } else {
        setIsPlaying(false);
        setPlayingVerseKey(null);
      }
    };

    try {
      await audio.play();
    } catch (e) {
      console.error('Audio play error:', e);
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      if (playingVerseKey) {
        audioRef.current?.play();
        setIsPlaying(true);
      } else if (verses.length > 0) {
        playVerse(verses[0], 0);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < 604) {
      setCurrentPage(p => p + 1);
      setSelectedVerse(null);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(p => p - 1);
      setSelectedVerse(null);
    }
  };

  // Swipe handling
  const touchStartX = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) {
      if (diff > 0) handlePrevPage();
      else handleNextPage();
    }
  };

  const handleCopy = async (verse: MushafVerse | null) => {
    if (!verse) return;
    try {
      await Clipboard.write({ string: `${verse.textUthmani} ﴿${verse.verseNumber}﴾` });
      Haptics.notification({ type: NotificationType.Success });
      setSelectedVerse(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async (verse: MushafVerse | null) => {
    if (!verse) return;
    setIsSharing(true);
    try {
      const cardElement = document.getElementById(`share-card-${verse.id}`);
      if (!cardElement) throw new Error('Card template not found');

      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        quality: 0.95,
        width: 1080,
        height: 1080,
        style: {
          opacity: '1',
          visibility: 'visible'
        }
      });
      const base64Data = dataUrl.split(',')[1];
      const fileName = `verse_${verse.verseKey.replace(':', '_')}.png`;

      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: `سورة ${surahs.find(s => s.number === verse.chapterId)?.name} - الآية ${verse.verseNumber}`,
        url: savedFile.uri,
        dialogTitle: 'مشاركة الآية'
      });
      setSelectedVerse(null);
    } catch (e) {
      console.error('Sharing failed:', e);
      // Fallback to text
      await Share.share({
        title: 'آية من القرآن',
        text: `${verse.textUthmani}\n[سورة ${surahs.find(s => s.number === verse.chapterId)?.name || ''} - الآية ${toArabicNum(verse.verseNumber)}]`,
        dialogTitle: 'مشاركة الآية'
      });
      setSelectedVerse(null);
    } finally {
      setIsSharing(false);
    }
  };

  const handleToggleFlag = (verse: MushafVerse) => {
    const isCurrentlyFlagged = flaggedVerse?.surah === verse.chapterId && flaggedVerse?.verse === verse.verseNumber;
    if (isCurrentlyFlagged) {
      setFlaggedVerse(null);
      localStorage.removeItem('mushaf_flagged_verse');
    } else {
      const newFlag = { surah: verse.chapterId, verse: verse.verseNumber, page: currentPage };
      setFlaggedVerse(newFlag);
      localStorage.setItem('mushaf_flagged_verse', JSON.stringify(newFlag));
      Haptics.impact({ style: ImpactStyle.Light });
    }
    setSelectedVerse(null);
  };

  const jumpToFlag = () => {
    if (flaggedVerse) {
      setIsJumpPending(true);
      if (currentPage === flaggedVerse.page) {
        // If already on page, select immediately
        const v = verses.find(v => v.chapterId === flaggedVerse.surah && v.verseNumber === flaggedVerse.verse);
        if (v) setSelectedVerse(v);
        setIsJumpPending(false);
      } else {
        setCurrentPage(flaggedVerse.page);
      }
      Haptics.impact({ style: ImpactStyle.Medium });
    }
  };

  // Render variables
  const isNight = theme === 'dark' || pageTheme === 'black';
  const themeClass = isNight ? 'mushaf-v2-night' : `mushaf-v2-theme-${pageTheme}`;

  // Group words into lines for Uthmani display
  const lines: { [key: number]: any[] } = {};
  verses.forEach(v => {
    v.words.forEach(w => {
      if (!lines[w.lineNumber]) lines[w.lineNumber] = [];
      lines[w.lineNumber].push({ ...w, verseKey: v.verseKey, isPlaying: v.verseKey === playingVerseKey, verseObj: v });
    });
  });

  // Calculate current Surah, Juz, and Hizb based on first verse
  const firstVerse = verses[0];
  const currentSurah = firstVerse?.chapterId || 1;
  const currentSurahName = surahs.find(s => s.number === currentSurah)?.name || '';
  const currentJuz = firstVerse?.juzNumber || 1;
  const currentHizb = firstVerse?.hizbNumber || 1;
  const currentRub = firstVerse?.rubElHizbNumber || 1;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${themeClass} font-naskh transition-colors duration-300`} dir="rtl">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/5 backdrop-blur-sm relative z-20">
        <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-black/5 active:scale-95 transition-all">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>

        <div className="flex flex-col items-center flex-1 gap-1">
          <span className="text-2xl font-amiri font-bold text-[var(--mushaf-accent)] leading-tight">سورة {currentSurahName}</span>
          <div className="flex gap-2 text-xs font-bold items-center">
            <span className="bg-black/5 px-3 py-1 rounded-full opacity-70">الجزء {currentJuz}</span>
            <span className="bg-black/5 px-3 py-1 rounded-full opacity-70">الحزب {currentHizb}</span>
          </div>
        </div>

        <div className="flex gap-1 -ml-2">
          {flaggedVerse && (
            <button onClick={jumpToFlag} className="p-2 rounded-full hover:bg-black/5 active:scale-95 transition-all text-gold-500 animate-pulse">
              <FlagIcon className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setShowIndex(true)} className="p-2 rounded-full hover:bg-black/5 active:scale-95 transition-all text-[var(--mushaf-accent)]">
            <BookIcon className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-black/5 active:scale-95 transition-all text-[var(--mushaf-accent)]">
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Online/Offline Status Banner */}
      {!isOffline && !loading && !bannerDismissed && (
        <div className="bg-amber-500/10 border-y border-amber-500/20 px-4 py-2 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 flex-1">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[11px] font-bold text-amber-800/90 leading-tight">تصفح القرآن عبر الإنترنت. يمكنك تحميل المصحف والتفسير للعمل بدون نت.</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="bg-amber-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm whitespace-nowrap"
            >
              تحميل الآن
            </button>
            <button 
              onClick={dismissBanner}
              className="p-1.5 hover:bg-black/5 rounded-md text-amber-900/40"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {isOffline && viewMode === 'image' && (
        <div className="bg-emerald-500/10 border-y border-emerald-500/20 px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-600/80">النص والتفسير متاحان بدون إنترنت. الصور والصوت يحتاجان اتصالاً بالشبكة.</span>
            <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      )}

      {/* Main Page Area */}
      <div className="flex-1 relative w-full h-full overflow-hidden flex flex-col"
        onClick={() => setSelectedVerse(null)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>



        {/* Main Mushaf Content */}
        {viewMode === 'image' ? (
          <div className={`mushaf-v2-page shadow-2xl mx-auto w-full max-w-2xl bg-[var(--mushaf-bg)] relative z-0 transition-transform duration-300 pb-0 px-0`}
            style={{ transform: fontScale !== 1 ? `scale(${fontScale})` : 'none', transformOrigin: 'top center' }}>

            <div className="absolute inset-0 z-0">
              {!imageError ? (
                <img
                  src={`https://files.quran.app/hafs/madani/width_1024/page${String(currentPage).padStart(3, '0')}.png`}
                  className="w-full h-full object-contain pointer-events-none"
                  alt={`Page ${currentPage}`}
                  style={{ filter: isNight || pageTheme === 'black' ? 'invert(1) hue-rotate(180deg) brightness(1.1) contrast(1.1)' : 'none' }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center gap-4 bg-black/[0.03]">
                   <svg className="w-16 h-16 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   <p className="text-sm font-bold opacity-40">صورة الصفحة تتطلب اتصالاً بالإنترنت.<br/>يمكنك الاستمرار في القراءة عبر "النص التفاعلي".</p>
                </div>
              )}
            </div>

            <div className="absolute inset-0 z-10 w-full h-full" style={{ paddingTop: '10.5%', paddingBottom: '9.5%', paddingLeft: '8%', paddingRight: '8%' }}>
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[var(--mushaf-accent)] border-t-transparent flex-shrink-0 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col justify-between" style={{ fontFamily: fontType === 'uthmani' ? getMushafFontFamily(currentPage) : undefined }}>
                  {Array.from({ length: 15 }).map((_, lineIdx) => {
                    const lineNum = lineIdx + 1;
                    const wordsInLine = lines[lineNum] || [];
                    return (
                      <div key={lineNum} className="flex-1 w-full flex justify-between" style={{ height: '6.666%' }}>
                        {wordsInLine.map((word: any, i) => {
                          const verseKeyId = word.verseKey.replace(':', '-');
                          // Only assign ID to the first word of this verse found on this page
                          const allWordsOnPage = Object.values(lines).flat();
                          const isFirstWordOfVerseOnPage = !allWordsOnPage.slice(0, allWordsOnPage.indexOf(word)).some((w: any) => w.verseKey === word.verseKey);
                          return (
                            <span
                              key={`${word.id}-${i}`}
                              id={isFirstWordOfVerseOnPage ? `verse-${verseKeyId}` : undefined}
                              onClick={(e) => { e.stopPropagation(); setSelectedVerse(word.verseObj); }}
                              className="mushaf-v2-word relative flex items-center justify-center cursor-pointer"
                            >
                              <div className={`absolute inset-y-0 -inset-x-1 rounded ${word.isPlaying || selectedVerse?.verseKey === word.verseKey ? 'bg-[var(--mushaf-highlight)]' : 'hover:bg-black/5'} transition-colors`} />
                              <span className="opacity-0">{word.codeV2 || word.text}</span>
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Text-Based Mode */
          <div className={`mushaf-v2-page shadow-2xl mx-auto w-full max-w-2xl bg-[var(--mushaf-bg)] relative z-0 flex flex-col h-full overflow-hidden ${fontType !== 'uthmani' ? `mushaf-v2-font-${fontType}` : ''}`} key={`page-${currentPage}-${viewMode}`}>
            {!isNight && <div className="mushaf-v2-frame" />}

            <div className="mushaf-v2-text-container hide-scrollbar relative z-10 flex-1 overflow-y-auto"
              style={fontType === 'uthmani' ? { fontFamily: getMushafFontFamily(currentPage) } : {}}>
              {loading ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-[var(--mushaf-accent)] border-t-transparent flex-shrink-0 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col w-full min-h-full">
                  {Object.keys(lines).sort((a, b) => Number(a) - Number(b)).map(lineNum => {
                    const words = lines[Number(lineNum)];
                    const surahStartWord = words.find(w => w.verseObj?.verseNumber === 1 && (w.position === 1 || w.id === w.verseObj?.words[0]?.id));
                    const surahObj = surahStartWord ? surahs.find(s => s.number === surahStartWord.verseObj.chapterId) : null;
                    const isCenter = words.length < 5 || currentPage === 1 || currentPage === 2;

                    return (
                      <div key={lineNum} className="flex flex-col w-full">
                        {surahObj && (
                          <div className="flex flex-col w-full items-center mb-6 relative z-10">
                            <div className="mushaf-v2-text-surah-header animate-fade-in w-full">
                              <span>سورة {surahObj.name}</span>
                            </div>
                            {surahObj.number !== 9 && surahObj.number !== 1 && (
                              <div className="mushaf-v2-text-bismillah animate-fade-in">
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`mushaf-v2-text-line ${isCenter ? 'center' : ''}`}>
                          {words.map((word: any, i) => {
                            const verseKeyId = word.verseKey.replace(':', '-');
                            // Only assign ID to the first word of this verse found on this page
                            const isFirstWordOfVerseOnPage = !verses.slice(0, verses.indexOf(word.verseObj)).some(v => v.verseKey === word.verseKey) || i === 0;
                            // Wait, 'verses' is the flat list of MushafVerse for the page.
                            // We can check if this is the first word of the verse in the whole page set.
                            const isFirstOccurenceOnPage = words.indexOf(word) === 0 && !Object.values(lines).flat().slice(0, Object.values(lines).flat().indexOf(word)).some((w: any) => w.verseKey === word.verseKey);

                            return (
                              <span
                                key={`${word.id}-${i}`}
                                id={isFirstOccurenceOnPage ? `verse-${verseKeyId}` : undefined}
                                onClick={(e) => { e.stopPropagation(); setSelectedVerse(word.verseObj); }}
                                className={`mushaf-v2-text-word ${word.isPlaying ? 'playing' : ''} ${selectedVerse?.verseKey === word.verseKey ? 'selected' : ''} ${flaggedVerse?.surah === word.chapterId && flaggedVerse?.verse === word.verseNumber ? 'flagged-highlight' : ''}`}
                              >
                                {fontType === 'uthmani' ? (word.codeV2 || word.text) : (
                                  word.charTypeName === 'end' ? (
                                    <span className="mushaf-v2-ayah-end">{word.verseNumber}</span>
                                  ) : (word.textUthmani)
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mushaf-v2-footer" dir="ltr">
              <button onClick={(e) => { e.stopPropagation(); handleNextPage(); }} className="p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all text-[var(--mushaf-accent)]" disabled={currentPage === 604} title="التالي">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="mushaf-v2-footer-page-num" dir="rtl">صفحة {currentPage}</span>
              <button onClick={(e) => { e.stopPropagation(); handlePrevPage(); }} className="p-2 rounded-full hover:bg-black/5 active:scale-90 transition-all text-[var(--mushaf-accent)]" disabled={currentPage === 1} title="السابق">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlays */}
      {selectedVerse && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 verse-action-menu-overlay animation-slide-up flex gap-3 p-3 bg-[var(--mushaf-bg)] rounded-3xl shadow-2xl border border-[var(--mushaf-frame)]/30 backdrop-blur-md" onClick={e => e.stopPropagation()}>
          <button onClick={() => { if (selectedVerse) playVerse(selectedVerse, verses.findIndex(v => v.verseKey === selectedVerse.verseKey)); }} title="تشغيل" className="p-3 rounded-full bg-[var(--mushaf-highlight)] text-[var(--mushaf-accent)] active:scale-95 transition-all"><PlayIcon className="w-5 h-5" /></button>
          <button onClick={() => { if (selectedVerse) { setShowTafsir(true); } }} title="تفسير" className="p-3 rounded-full bg-[var(--mushaf-highlight)] text-[var(--mushaf-accent)] active:scale-95 transition-all"><TafsirIcon className="w-5 h-5" /></button>
          <button onClick={() => { if (selectedVerse) handleToggleFlag(selectedVerse); }} title="تحديد" className={`p-3 rounded-full bg-[var(--mushaf-highlight)] active:scale-95 transition-all ${flaggedVerse?.surah === selectedVerse?.chapterId && flaggedVerse?.verse === selectedVerse?.verseNumber ? 'text-gold-600' : 'text-[var(--mushaf-accent)]'}`}><FlagIcon className="w-5 h-5" /></button>
          <button onClick={() => handleCopy(selectedVerse)} title="نسخ" className="p-3 rounded-full bg-[var(--mushaf-highlight)] text-[var(--mushaf-accent)] active:scale-95 transition-all"><CopyIcon className="w-5 h-5" /></button>
          <button onClick={() => handleShare(selectedVerse)} disabled={isSharing} title="مشاركة" className="p-3 rounded-full bg-[var(--mushaf-highlight)] text-[var(--mushaf-accent)] active:scale-95 transition-all min-w-[44px]">
            {isSharing ? (
              <div className="w-5 h-5 border-2 border-[var(--mushaf-accent)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShareIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      )}

      {(isPlaying || playingVerseKey) && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-40">
          <div className="bg-[var(--mushaf-bg)] border border-[var(--mushaf-frame)]/20 p-3 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-[var(--mushaf-accent)] text-white flex items-center justify-center active:scale-95 transition-transform shadow-md shadow-[var(--mushaf-accent)]/30">
                {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6 ml-1" />}
              </button>
              <div>
                <p className="text-sm font-bold opacity-80 mb-0.5">{surahs.find(s => s.number === verses.find(v => v.verseKey === playingVerseKey)?.chapterId)?.name} — {playingVerseKey?.split(':')[1]}</p>
                <p className="text-xs opacity-50">{RECITERS.find(r => r.id === reciterId)?.arabicName}</p>
              </div>
            </div>
            <button onClick={() => { audioRef.current?.pause(); setIsPlaying(false); setPlayingVerseKey(null); }} className="p-2 opacity-50 hover:opacity-100"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
      )}

      {/* Index (Surah/Juz) */}
      {showIndex && (
        <BottomSheet onClose={() => setShowIndex(false)}>
          <div className="flex flex-col h-full">
            <div className="px-1 mb-4">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${isNight ? 'bg-white/5 border border-white/10' : 'bg-black/5 border border-black/5'}`}>
                <svg className="w-4 h-4 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="ابحث عن سورة..." value={indexSearch} onChange={e => setIndexSearch(e.target.value)} className="flex-1 bg-transparent border-none outline-none text-sm py-1 font-amiri" dir="rtl" />
              </div>
            </div>

            <div className="flex px-1 mb-4">
              <button onClick={() => { setIndexTab('surah'); setIndexSearch(''); }} className={`flex-1 py-3 font-bold text-center border-b-2 transition-all ${indexTab === 'surah' ? 'border-[var(--mushaf-accent)] text-[var(--mushaf-accent)]' : 'border-transparent opacity-50'}`}>السور</button>
              <button onClick={() => { setIndexTab('juz'); setIndexSearch(''); }} className={`flex-1 py-3 font-bold text-center border-b-2 transition-all ${indexTab === 'juz' ? 'border-[var(--mushaf-accent)] text-[var(--mushaf-accent)]' : 'border-transparent opacity-50'}`}>الأجزاء</button>
            </div>

            {lastRead && !indexSearch && (
              <div className="px-1 mb-4">
                <button onClick={() => { setCurrentPage(lastRead.page); setShowIndex(false); }} className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 animate-pulse ${isNight ? 'bg-gold-500/10 border-gold-500/20 text-gold-400' : 'bg-gold-50 border-gold-200 text-gold-700'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-500 text-black flex items-center justify-center"><BookmarkIcon className="w-5 h-5" /></div>
                    <div className="text-right">
                      <p className="text-[13px] font-bold">مواصلة القراءة</p>
                      <p className="text-[11px] opacity-70">سورة {lastRead.surahName} • صفحة {lastRead.page}</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}

              <div className="flex-1 overflow-y-auto px-1 hide-scrollbar">
                {indexTab === 'surah' ? (
                  surahs.filter(s => s.name.includes(indexSearch) || s.englishName.toLowerCase().includes(indexSearch.toLowerCase())).map(surah => {
                    const isActive = surah.number === currentSurah;
                    return (
                      <button 
                        key={surah.number} 
                        ref={isActive ? activeIndexRef : null}
                        onClick={() => { setCurrentPage(surah.pages[0]); setShowIndex(false); setIndexSearch(''); }} 
                        className={`w-full text-right p-4 border-b border-black/5 flex items-center justify-between active:bg-black/5 transition-colors ${isActive ? 'bg-[var(--mushaf-highlight)] border-r-4 border-r-[var(--mushaf-accent)]' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-amiri ${isActive ? 'bg-[var(--mushaf-accent)] text-white' : 'bg-[var(--mushaf-highlight)] text-[var(--mushaf-accent)]'}`}>{surah.number}</div>
                          <div>
                            <span className="font-bold text-lg font-amiri block text-[var(--mushaf-text)] w-max">سورة {surah.name}</span>
                            <span className="text-xs opacity-50">{surah.revelationType} • {surah.versesCount} آية</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold opacity-30 px-3 py-1 bg-black/5 rounded-lg">{surah.pages[0]}</span>
                      </button>
                    );
                  })
                ) : (
                  Array.from({ length: 30 }).map((_, i) => {
                    const juzNum = i + 1;
                    const isActive = juzNum === currentJuz;
                    return (
                      <button 
                        key={i} 
                        ref={isActive ? activeIndexRef : null}
                        onClick={() => { setCurrentPage(JUZ_START_PAGES[i]); setShowIndex(false); }} 
                        className={`w-full text-right p-4 border-b border-black/5 flex items-center justify-between active:bg-black/5 transition-colors ${isActive ? 'bg-[var(--mushaf-highlight)] border-r-4 border-r-[var(--mushaf-accent)]' : ''}`}
                      >
                        <span className={`font-bold text-lg font-amiri ${isActive ? 'text-[var(--mushaf-accent)]' : 'text-[var(--mushaf-text)]'}`}>الجزء {juzNum}</span>
                        <span className="text-sm font-bold opacity-30 px-3 py-1 bg-black/5 rounded-lg">{JUZ_START_PAGES[i]}</span>
                      </button>
                    );
                  })
                )}
              </div>
          </div>
        </BottomSheet>
      )}

      {/* Settings */}
      {showSettings && (
        <BottomSheet onClose={() => setShowSettings(false)}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl font-amiri text-[var(--mushaf-text)]">إعدادات القراءة</h3>
            <button onClick={() => setShowSettings(false)} className="p-2 opacity-30 active:bg-black/5 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="space-y-8 pb-4">
            <div>
              <p className="text-sm font-bold mb-4 opacity-60">نمط القراءة</p>
              <div className="flex bg-black/5 p-1 rounded-2xl">
                <button onClick={() => setViewMode('image')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${viewMode === 'image' ? 'bg-[var(--mushaf-bg)] shadow-md text-[var(--mushaf-accent)]' : 'opacity-40'}`}>صفحة المصحف</button>
                <button onClick={() => setViewMode('text')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${viewMode === 'text' ? 'bg-[var(--mushaf-bg)] shadow-md text-[var(--mushaf-accent)]' : 'opacity-40'}`}>نص تفاعلي</button>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold mb-4 opacity-60">حجم الخط</p>
              <div className="flex items-center gap-6 px-2">
                <span className="text-2xl opacity-40 font-amiri">A+</span>
                <input type="range" min="0.8" max="1.6" step="0.1" value={fontScale} onChange={e => setFontScale(parseFloat(e.target.value))} className="flex-1 accent-[var(--mushaf-accent)] h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer" />
                <span className="text-lg opacity-40 font-amiri">A-</span>
              </div>
            </div>
            {viewMode === 'text' && (
              <div>
                <p className="text-sm font-bold mb-4 opacity-60">نوع الخط</p>
                <div className="grid grid-cols-2 gap-4">
                  {['uthmani', 'naskh'].map(f => (
                    <button key={f} onClick={() => setFontType(f)} className={`py-4 rounded-2xl border-2 transition-all ${fontType === f || (f === 'naskh' && fontType === 'amiri') ? 'border-[var(--mushaf-accent)] bg-[var(--mushaf-highlight)] text-[var(--mushaf-accent)] font-bold' : 'border-black/5 opacity-60'}`}>{f === 'uthmani' ? 'عثماني' : 'خط عادي'}</button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-bold mb-4 opacity-60">لون الصفحة</p>
              <div className="flex gap-5">
                <button onClick={() => setPageTheme('cream')} className={`w-14 h-14 rounded-full bg-[#FFF8E7] border-4 transition-all shadow-lg ${pageTheme === 'cream' ? 'border-[#B8891A] scale-110' : 'border-black/5'}`} />
                <button onClick={() => setPageTheme('black')} className={`w-14 h-14 rounded-full bg-[#050505] border-4 transition-all shadow-lg ${pageTheme === 'black' ? 'border-[#DAA520] scale-110' : 'border-black/5'}`} />
                <button onClick={() => setPageTheme('green')} className={`w-14 h-14 rounded-full bg-[#E8F0E4] border-4 transition-all shadow-lg ${pageTheme === 'green' ? 'border-[#2D4A2D] scale-110' : 'border-black/5'}`} />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold mb-4 opacity-60">صوت القارئ</p>
              <select value={reciterId} onChange={e => setReciterId(e.target.value)} className="w-full p-4 rounded-2xl bg-black/5 border border-black/5 text-[var(--mushaf-text)] outline-none focus:border-[var(--mushaf-accent)] font-bold appearance-none">
                {RECITERS.map(r => (<option key={r.islamicNetworkId} value={r.id}>{r.arabicName}</option>))}
              </select>
            </div>

            <div className="pt-4 border-t border-black/5">
              <p className="text-sm font-bold mb-4 opacity-60">تصفح بدون إنترنت</p>
              {downloadProgress !== null ? (
                <div className="bg-black/5 p-6 rounded-2xl flex flex-col items-center gap-4">
                  <div className="w-full bg-black/10 h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--mushaf-accent)] h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                  </div>
                  <div className="flex justify-between w-full items-center">
                    <span className="text-sm font-bold text-[var(--mushaf-accent)]">جاري التحميل... {downloadProgress}%</span>
                    <button onClick={cancelDownload} className="text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg active:scale-95 transition-all">إلغاء</button>
                  </div>
                </div>
              ) : offlineProgress > 0 ? (
                <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${offlineProgress === 100 ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'} flex items-center justify-center font-bold`}>
                       {offlineProgress === 100 ? '✓' : '!'}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[var(--mushaf-text)]">
                        {offlineProgress === 100 ? 'القرآن والتفسير متاحان' : 'بيانات محملة جزئياً'}
                      </p>
                      <p className="text-[10px] opacity-60">تم تحميل {offlineProgress}% من صفحات المصحف</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {offlineProgress < 100 && (
                       <button onClick={startDownload} className="text-xs font-bold bg-[var(--mushaf-accent)] text-white px-3 py-2 rounded-xl active:scale-95 shadow-sm transition-all">إكمال</button>
                    )}
                    <button onClick={handleDelete} className="text-xs font-bold text-red-500 bg-red-500/5 px-3 py-2 rounded-xl active:scale-95 transition-all">حذف</button>
                  </div>
                </div>
              ) : (
                <button onClick={startDownload} className="w-full py-4 rounded-2xl bg-[var(--mushaf-accent)] text-white font-bold shadow-lg shadow-[var(--mushaf-accent)]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  تحميل القرآن والتفسير (١٠٠ ميجابايت)
                </button>
              )}
              <p className="text-[10px] opacity-40 mt-3 leading-relaxed text-center px-4">سيتم تحميل النص الكامل للقرآن الكريم مع تفسير ابن كثير ليعمل التطبيق بدون اتصال بالإنترنت. يرجى العلم أن الصور وجودة الصوت تتطلب اتصالاً دائماً.</p>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Tafsir */}
      {showTafsir && selectedVerse && (
        <BottomSheet onClose={() => setShowTafsir(false)} height="70vh">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-[var(--mushaf-text)] font-amiri">تفسير الآية {toArabicNum(selectedVerse.verseNumber)}</h3>
            <button onClick={() => setShowTafsir(false)} className="p-2 opacity-30 active:bg-black/5 rounded-full"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex flex-col h-full overflow-hidden">
            <p className="text-2xl font-amiri text-[var(--mushaf-accent)] mb-6 text-center leading-relaxed px-4 animate-fade-in">{selectedVerse.textUthmani}</p>

            <div className="flex overflow-x-auto gap-3 mb-6 pb-2 no-scrollbar" dir="rtl">
              {TAFSIR_SOURCES.map(source => (
                <button key={source.id} onClick={() => setActiveTafsirId(source.id)} className={`whitespace-nowrap px-5 py-2.5 rounded-2xl border-2 transition-all text-xs font-bold ${activeTafsirId === source.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'border-black/5 opacity-50 text-[var(--mushaf-text)] hover:opacity-100 hover:border-black/10'}`}>
                  {source.name}
                </button>
              ))}
            </div>

            <div className={`p-6 rounded-[2.5rem] border flex-1 overflow-y-auto hide-scrollbar ${isNight ? 'bg-white/5 border-white/5' : 'bg-black/[0.02] border-black/10'}`}>
              <div className="text-lg font-amiri leading-loose opacity-90 text-[var(--mushaf-text)] text-right whitespace-pre-wrap select-text">
                {tafsirLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-[var(--mushaf-accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="opacity-50 text-sm">جاري تحميل التفسير...</p>
                  </div>
                ) : selectedVerse.tafsirs?.[activeTafsirId] ? (
                   <div dangerouslySetInnerHTML={{ __html: selectedVerse.tafsirs[activeTafsirId] }} />
                ) : (
                  <p className="text-center py-10 opacity-50 italic">لم يتم العثور على تفسير لهذه الآية في {TAFSIR_SOURCES.find(s => s.id === activeTafsirId)?.name}.</p>
                )}
              </div>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Sharing Card Workspace */}
      {selectedVerse && (
        <div className="fixed overflow-hidden h-0 w-0 pointer-events-none opacity-0" style={{ left: -3000 }}>
          <div id={`share-card-${selectedVerse.id}`} className="w-[1080px] h-[1080px] bg-gradient-to-br from-[#0b1929] to-[#0a1525] flex flex-col items-center justify-center p-20 text-center relative" dir="rtl">
            <div className="absolute inset-0 border-[25px] border-gold-500/10 m-10 rounded-[60px]" />
            <div className="absolute inset-0 border-2 border-gold-500/20 m-16 rounded-[45px]" />
            <div className="w-32 h-32 rounded-[2.5rem] bg-gold-400/10 border border-gold-400/20 flex items-center justify-center mb-12 shadow-2xl overflow-hidden p-6">
              <img src="/assets/icons/icon-512.webp" alt="Sirat" className="w-full h-full object-contain" />
            </div>
            <p className="text-[64px] font-amiri text-white leading-[1.6] mb-16 px-16 drop-shadow-lg">﴿ {selectedVerse.textUthmani} ﴾</p>
            <div className="flex flex-col items-center gap-4">
              <p className="text-[36px] font-amiri text-gold-400 font-bold">سورة {surahs.find(s => s.number === selectedVerse.chapterId)?.name} - الآية {toArabicNum(selectedVerse.verseNumber)}</p>
              <div className="w-48 h-1.5 bg-gold-500/20 rounded-full my-6" />
              <p className="text-[26px] font-amiri text-white/50">تمت المشاركة عبر تطبيق Sirat 🌙</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Bottom Sheet with drag-handle and touch-to-dismiss */
function BottomSheet({ children, onClose, height = '85vh' }: { children: React.ReactNode; onClose: () => void; height?: string }) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.targetTouches[0].clientY;
    setDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentY = e.targetTouches[0].clientY;
    const dy = currentY - startY.current;
    if (dy > 0) setDragY(dy);
  };

  const onTouchEnd = () => {
    setDragging(false);
    if (dragY > 150) {
      onClose();
    }
    setDragY(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end animation-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--mushaf-bg)] w-full rounded-t-[3rem] shadow-2xl flex flex-col overflow-hidden transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ 
          height, 
          transform: `translateY(${dragY}px)`,
          transition: dragging ? 'none' : undefined 
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle Container — Specific target for dragging */}
        <div 
          className="w-full py-5 flex flex-col items-center cursor-grab active:cursor-grabbing touch-none select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-14 h-1.5 bg-black/10 dark:bg-white/20 rounded-full mb-1" />
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-10 hide-scrollbar relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}

