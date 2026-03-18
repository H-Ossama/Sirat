import { useState, useEffect, Suspense, lazy, useRef } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { HomeIcon, PlayIcon, BeadsIcon, SettingsIcon, HadithIcon, BookIcon } from './components/Icons';
import { requestNotificationPermission, setupNotificationChannels, setupNotificationActions, listenToNotificationActions } from './services/notificationService';
import { completeDeed } from './services/rewardsStore';
import { App as CapApp } from '@capacitor/app';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { BackHandlerProvider } from './components/BackHandlerContext';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { PrayerTimesProvider } from './components/PrayerTimesContext';
import { AudioProvider } from './components/AudioContext';
import { VideoPlayerProvider } from './components/VideoPlayerContext';
import { MiniAudioPlayer } from './components/MiniAudioPlayer';
import { MiniVideoPlayer } from './components/MiniVideoPlayer';
import { logInteraction, logScreenSession } from './services/activityLogStore';
import { AppUpdateModal, type UpdateModalStage } from './components/AppUpdateModal';
import {
    canInstallAppPackages,
    checkForAppUpdateIfDue,
    clearDeferredUpdateReminder,
    isNativeAndroid,
    listenToNativeUpdateProgress,
    openInstallPermissionSettings,
    postponeUpdateToTomorrow,
    startAppUpdateDownload,
    type AppUpdateRelease,
} from './services/updateService';
import {
    subscribeToAthanPlayback,
    stopAthan,
    getAthanSettings,
    scheduleAthanNotifications,
    type AthanPlaybackState,
} from './services/athanService';
import { AthanScreen } from './components/AthanScreen';
import type { PluginListenerHandle } from '@capacitor/core';

const OnboardingScreen = lazy(() => import('./components/OnboardingScreen').then(m => ({ default: m.OnboardingScreen })));
const AdhkarScreen = lazy(() => import('./components/AdhkarScreen').then(m => ({ default: m.AdhkarScreen })));
const VideosScreen = lazy(() => import('./components/VideosScreen').then(m => ({ default: m.VideosScreen })));
const QuranScreenV2 = lazy(() => import('./components/QuranScreenV2').then(m => ({ default: m.QuranScreenV2 })));
const DuasScreen = lazy(() => import('./components/DuasScreen').then(m => ({ default: m.DuasScreen })));
const TasbihScreen = lazy(() => import('./components/TasbihScreen').then(m => ({ default: m.TasbihScreen })));
const CalendarScreen = lazy(() => import('./components/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const QiblaScreen = lazy(() => import('./components/QiblaScreen').then(m => ({ default: m.QiblaScreen })));
const GardenScreen = lazy(() => import('./components/GardenScreen').then(m => ({ default: m.GardenScreen })));
const DeedsScreen = lazy(() => import('./components/DeedsScreen').then(m => ({ default: m.DeedsScreen })));
const ZakatScreen = lazy(() => import('./components/ZakatScreen').then(m => ({ default: m.ZakatScreen })));
const KhatmaScreen = lazy(() => import('./components/KhatmaScreen').then(m => ({ default: m.KhatmaScreen })));
const LastTenScreen = lazy(() => import('./components/LastTenScreen').then(m => ({ default: m.LastTenScreen })));
const SettingsScreen = lazy(() => import('./components/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const HadithScreen = lazy(() => import('./components/HadithScreen').then(m => ({ default: m.HadithScreen })));
const BadgesScreen = lazy(() => import('./components/BadgesScreen').then(m => ({ default: m.BadgesScreen })));
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const WomenScreen = lazy(() => import('./components/WomenScreen').then(m => ({ default: m.WomenScreen })));
const BooksScreen = lazy(() => import('./components/BooksScreen').then(m => ({ default: m.BooksScreen })));

type Screen = 'home' | 'adhkar' | 'videos' | 'quran' | 'hadith' | 'duas' | 'tasbih' | 'calendar' | 'qibla' | 'settings' | 'garden' | 'deeds' | 'zakat' | 'khatma' | 'lastTen' | 'badges' | 'profile' | 'women' | 'books';

/* ─── Tab Bar ─── */
function TabBar({ activeTab, onTabChange }: { activeTab: Screen; onTabChange: (tab: Screen) => void }) {
    const { theme } = useTheme();

    // Side tabs (2 on each side of center home)
    const leftTabs: { id: Screen; label: string; icon: React.ReactNode }[] = [
        { id: 'tasbih', label: 'التسبيح', icon: <BeadsIcon className="w-[24px] h-[24px]" /> },
        { id: 'videos', label: 'الفيديوهات', icon: <PlayIcon className="w-[24px] h-[24px]" /> },
    ];
    const rightTabs: { id: Screen; label: string; icon: React.ReactNode }[] = [
        { id: 'books', label: 'المكتبة', icon: <BookIcon className="w-[24px] h-[24px]" /> },
        { id: 'settings', label: 'المزيد', icon: <SettingsIcon className="w-[24px] h-[24px]" /> },
    ];

    const renderTab = (tab: { id: Screen; label: string; icon: React.ReactNode }) => {
        const isActive = activeTab === tab.id;
        return (
            <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex-1 flex flex-col items-center gap-1.5 py-2 rounded-2xl transition-all duration-300 active:scale-90 ${isActive
                    ? theme === 'light'
                        ? 'text-gold-600'
                        : 'text-gold-400'
                    : theme === 'light'
                        ? 'text-slate-400'
                        : 'text-white/30'
                    }`}
            >
                {/* Active background pill */}
                {isActive && (
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${theme === 'light'
                        ? 'bg-gold-50 border border-gold-100'
                        : 'bg-gold-400/[0.08] border border-gold-400/[0.12]'
                        }`} />
                )}
                <div className={`relative transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
                    <div className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_6px_rgba(212,165,40,0.5)]' : ''}`}>
                        {tab.icon}
                    </div>
                </div>
                <span className={`relative text-[10px] font-bold transition-all duration-300 ${isActive
                    ? theme === 'light' ? 'text-gold-600' : 'text-gold-400'
                    : theme === 'light' ? 'text-slate-400' : 'text-white/30'
                    }`}>{tab.label}</span>
            </button>
        );
    };

    const isHomeActive = activeTab === 'home';

    return (
        <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 navbar-top-rounded ${theme === 'light'
            ? 'bg-white/95 border-t border-slate-100 shadow-[0_-12px_40px_rgba(0,0,0,0.08)]'
            : 'bg-[#070d1a]/97 border-t border-white/[0.06] shadow-[0_-12px_40px_rgba(0,0,0,0.7)]'
            }`}
            style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))' }}
        >
            <div className="flex items-end px-2 pt-2 pb-1">
                {/* Left tabs */}
                {leftTabs.map(renderTab)}

                {/* Center Home Button */}
                <div className="flex-1 flex flex-col items-center -mt-5">
                    <button
                        onClick={() => onTabChange('home')}
                        className={`relative w-[58px] h-[58px] rounded-[22px] flex items-center justify-center transition-all duration-300 active:scale-90 shadow-lg ${isHomeActive
                            ? 'bg-gradient-to-br from-gold-400 to-amber-500 shadow-gold-500/40 scale-110'
                            : theme === 'light'
                                ? 'bg-gradient-to-br from-gold-400 to-amber-500 shadow-gold-400/30'
                                : 'bg-gradient-to-br from-gold-500/80 to-amber-600/80 shadow-gold-500/20'
                            }`}
                    >
                        {/* Glow ring when active */}
                        {isHomeActive && (
                            <div className="absolute inset-0 rounded-[22px] ring-2 ring-gold-300/50 ring-offset-2 ring-offset-transparent animate-pulse" />
                        )}
                        <HomeIcon className="w-[24px] h-[24px] text-white drop-shadow-sm" />
                    </button>
                    <span className={`text-[10px] font-bold mt-1.5 transition-colors duration-300 ${isHomeActive
                        ? theme === 'light' ? 'text-gold-600' : 'text-gold-400'
                        : theme === 'light' ? 'text-slate-400' : 'text-white/30'
                        }`}>الرئيسية</span>
                </div>

                {/* Right tabs */}
                {rightTabs.map(renderTab)}
            </div>
        </div>
    );
}

function AppWrapper() {
    const { theme } = useTheme();
    return (
        <div className={`fixed inset-0 overflow-hidden ${theme === 'light' ? 'light-theme bg-[#f8fbff]' : 'dark-theme bg-[#08080e]'}`} dir="rtl">
            <div className="h-full flex flex-col pt-safe-top relative z-10">
                <div className="flex-1 relative overflow-hidden">
                    <AppContent />
                </div>
            </div>
        </div>
    );
}

/* ─── App Content ─── */
function AppContent() {
    const { theme } = useTheme();
    const [onboardingDone, setOnboardingDone] = useState(() => !!localStorage.getItem('onboarding_complete'));
    const [currentScreen, setCurrentScreen] = useState<Screen>('home');
    const [tabBarScreen, setTabBarScreen] = useState<Screen>('home');
    const [history, setHistory] = useState<Screen[]>(['home']);

    const [appBgSettings, setAppBgSettings] = useState(() => ({
        image: localStorage.getItem('app_bg_image') || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1080&auto=format&fit=crop',
        custom: localStorage.getItem('app_bg_custom') || '',
        blur: parseInt(localStorage.getItem('app_bg_blur') || '0')
    }));

    useEffect(() => {
        const handleBgChange = () => {
            setAppBgSettings({
                image: localStorage.getItem('app_bg_image') || 'none',
                custom: localStorage.getItem('app_bg_custom') || '',
                blur: parseInt(localStorage.getItem('app_bg_blur') || '0')
            });
        };
        window.addEventListener('app:bg-changed', handleBgChange);
        return () => window.removeEventListener('app:bg-changed', handleBgChange);
    }, []);

    const mainTabs: Screen[] = ['home', 'videos', 'tasbih', 'settings', 'books'];
    const [deedsHighlightId, setDeedsHighlightId] = useState<number | undefined>(undefined);
    const [quranAutoOpenSurah, setQuranAutoOpenSurah] = useState<number | null>(null);
    const [quranAutoOpenPage, setQuranAutoOpenPage] = useState<number | null>(null);
    const [quranAutoOpenVerse, setQuranAutoOpenVerse] = useState<number | null>(null);
    const [videosInCategory, setVideosInCategory] = useState(false);
    const [hadithInDetails, setHadithInDetails] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [updateModalStage, setUpdateModalStage] = useState<UpdateModalStage>('available');
    const [updateProgress, setUpdateProgress] = useState(0);
    const [updateMessage, setUpdateMessage] = useState('');
    const [availableUpdate, setAvailableUpdate] = useState<AppUpdateRelease | null>(null);
    const currentSessionScreenRef = useRef<Screen>('home');
    const currentSessionStartedAtRef = useRef<number>(Date.now());
    const availableUpdateRef = useRef<AppUpdateRelease | null>(null);
    const waitingInstallPermissionRef = useRef(false);

    // Athan playback state
    const [athanPlaybackState, setAthanPlaybackState] = useState<AthanPlaybackState | null>(null);

    useEffect(() => {
        return subscribeToAthanPlayback(state => setAthanPlaybackState(state));
    }, []);

    const screenLabelMap: Record<Screen, string> = {
        home: 'الرئيسية',
        adhkar: 'الأذكار',
        videos: 'الفيديوهات',
        quran: 'المصحف',
        hadith: 'الحديث',
        duas: 'الأدعية',
        tasbih: 'التسبيح',
        calendar: 'التقويم',
        qibla: 'القبلة',
        settings: 'الإعدادات',
        garden: 'الحديقة',
        deeds: 'الأعمال',
        zakat: 'الزكاة',
        khatma: 'الختمة',
        lastTen: 'العشر الأواخر',
        badges: 'الأوسمة',
        profile: 'الملف الشخصي',
        women: 'ركن المرأة',
        books: 'المكتبة',
    };

    const handleMiniPlayerClick = (surahId: number) => {
        setQuranAutoOpenSurah(surahId);
        setQuranAutoOpenPage(null);
        setQuranAutoOpenVerse(null);
        if (currentScreen !== 'quran') {
            navigateTo('quran');
        }
    };

    const navigateTo = (screen: Screen | string) => {
        // Handle deeds:id pattern
        if (typeof screen === 'string' && screen.startsWith('deeds:')) {
            const id = parseInt(screen.split(':')[1]);
            setDeedsHighlightId(isNaN(id) ? undefined : id);
            if ('deeds' === currentScreen) return;
            logInteraction({
                type: 'navigate',
                category: 'navigation',
                title: 'تنقّل داخل التطبيق',
                details: `انتقال إلى ${screenLabelMap.deeds}`,
                screen: 'deeds',
            });
            setCurrentScreen('deeds');
            setHistory(prev => [...prev, 'deeds']);
            return;
        }

        // Handle quran:surahId:page:verse pattern
        if (typeof screen === 'string' && screen.startsWith('quran:')) {
            const parts = screen.split(':');
            const surahId = parseInt(parts[1]);
            const page = parseInt(parts[2]);
            const verse = parts[3] ? parseInt(parts[3]) : null;
            if (!isNaN(surahId)) setQuranAutoOpenSurah(surahId);
            if (!isNaN(page)) setQuranAutoOpenPage(page);
            if (verse !== null && !isNaN(verse)) setQuranAutoOpenVerse(verse);
            if ('quran' === currentScreen) return;
            setCurrentScreen('quran');
            setHistory(prev => [...prev, 'quran']);
            return;
        }

        const s = screen as Screen;
        if (s === currentScreen) return;
        logInteraction({
            type: 'navigate',
            category: 'navigation',
            title: 'تنقّل داخل التطبيق',
            details: `انتقال إلى ${screenLabelMap[s] ?? s}`,
            screen: s,
        });
        setCurrentScreen(s);
        setHistory(prev => [...prev, s]);
        if (mainTabs.includes(s)) {
            setTabBarScreen(s);
        }
    };

    const goBack = () => {
        if (history.length > 1) {
            const newHistory = [...history];
            newHistory.pop(); // remove current
            const prev = newHistory[newHistory.length - 1];
            logInteraction({
                type: 'back_navigation',
                category: 'navigation',
                title: 'رجوع',
                details: `الرجوع إلى ${screenLabelMap[prev] ?? prev}`,
                screen: prev,
            });
            setCurrentScreen(prev);
            setHistory(newHistory);
            if (mainTabs.includes(prev)) {
                setTabBarScreen(prev);
            }
        } else {
            logInteraction({
                type: 'back_navigation',
                category: 'navigation',
                title: 'رجوع',
                details: `الرجوع إلى ${screenLabelMap.home}`,
                screen: 'home',
            });
            setCurrentScreen('home');
            setTabBarScreen('home');
            setHistory(['home']);
        }
    };

    const goHome = () => {
        logInteraction({
            type: 'home_navigation',
            category: 'navigation',
            title: 'عودة للرئيسية',
            details: `الانتقال إلى ${screenLabelMap.home}`,
            screen: 'home',
        });
        setCurrentScreen('home');
        setTabBarScreen('home');
        setHistory(['home']);
    };

    useEffect(() => {
        const now = Date.now();
        logScreenSession(currentSessionScreenRef.current, currentSessionStartedAtRef.current, now);
        currentSessionScreenRef.current = currentScreen;
        currentSessionStartedAtRef.current = now;
    }, [currentScreen]);

    useEffect(() => {
        return () => {
            const now = Date.now();
            logScreenSession(currentSessionScreenRef.current, currentSessionStartedAtRef.current, now);
        };
    }, []);

    useEffect(() => {
        if (currentScreen !== 'videos') setVideosInCategory(false);
        if (currentScreen !== 'hadith') setHadithInDetails(false);
    }, [currentScreen]);

    const showAvailableUpdate = (release: AppUpdateRelease) => {
        availableUpdateRef.current = release;
        setAvailableUpdate(release);
        setUpdateModalStage('available');
        setUpdateProgress(0);
        setUpdateMessage('');
        setUpdateModalOpen(true);
    };

    const runUpdateCheck = async (force = false) => {
        try {
            const release = await checkForAppUpdateIfDue(force);
            if (release) {
                showAvailableUpdate(release);
            }
        } catch (error) {
            console.warn('Failed to check app updates', error);
        }
    };

    const startUpdateDownloadFlow = async () => {
        const release = availableUpdateRef.current;
        if (!release) return;

        setUpdateModalOpen(true);
        setUpdateModalStage('progress');
        setUpdateProgress(0);
        setUpdateMessage('جاري تحضير التحديث...');

        try {
            const result = await startAppUpdateDownload(release);
            if (result.requiresInstallPermission) {
                waitingInstallPermissionRef.current = true;
                setUpdateModalStage('permission');
                setUpdateMessage('');
                return;
            }

            if (!result.started) {
                setUpdateModalStage('error');
                setUpdateMessage(result.message || 'تعذر بدء تنزيل التحديث.');
            }
        } catch (error: any) {
            setUpdateModalStage('error');
            setUpdateMessage(error?.message || 'حدث خطأ أثناء بدء التحديث.');
        }
    };

    const handleUpdateNow = async () => {
        const canInstall = await canInstallAppPackages();
        if (!canInstall) {
            waitingInstallPermissionRef.current = true;
            setUpdateModalStage('permission');
            return;
        }

        waitingInstallPermissionRef.current = false;
        await startUpdateDownloadFlow();
    };

    const handleUpdateLater = async () => {
        const release = availableUpdateRef.current;
        if (release) {
            await postponeUpdateToTomorrow(release);
        }
        setUpdateModalOpen(false);
    };

    const handleOpenPermission = async () => {
        try {
            waitingInstallPermissionRef.current = true;
            await openInstallPermissionSettings();
            setUpdateMessage('بعد منح الإذن، ارجع للتطبيق وسيبدأ التحديث تلقائيًا.');
        } catch (error: any) {
            setUpdateModalStage('error');
            setUpdateMessage(error?.message || 'تعذر فتح إعدادات الإذن.');
        }
    };

    useEffect(() => {
        if (!isNativeAndroid()) return;

        let progressHandle: PluginListenerHandle | null = null;
        let disposed = false;

        const setup = async () => {
            progressHandle = await listenToNativeUpdateProgress((event) => {
                if (disposed) return;

                if (event.phase === 'downloading') {
                    setUpdateModalOpen(true);
                    setUpdateModalStage('progress');
                    setUpdateProgress(event.progress >= 0 ? event.progress : 0);
                    setUpdateMessage('جاري تنزيل التحديث...');
                    return;
                }

                if (event.phase === 'installing') {
                    setUpdateModalOpen(true);
                    setUpdateModalStage('progress');
                    setUpdateProgress(100);
                    setUpdateMessage('اكتمل التنزيل، جاري فتح التثبيت...');
                    return;
                }

                if (event.phase === 'installer_opened') {
                    setUpdateModalOpen(true);
                    setUpdateModalStage('progress');
                    setUpdateProgress(100);
                    setUpdateMessage('تم فتح شاشة التثبيت. أكمل التثبيت من النظام.');
                    void clearDeferredUpdateReminder();
                    return;
                }

                if (event.phase === 'error') {
                    setUpdateModalOpen(true);
                    setUpdateModalStage('error');
                    setUpdateMessage(event.message || 'تعذر تنزيل أو تثبيت التحديث.');
                }
            });

            await runUpdateCheck(false);
        };

        setup();

        const resumeHandlePromise = CapApp.addListener('resume', async () => {
            if (waitingInstallPermissionRef.current && availableUpdateRef.current) {
                const allowed = await canInstallAppPackages();
                if (allowed) {
                    waitingInstallPermissionRef.current = false;
                    await startUpdateDownloadFlow();
                    return;
                }
            }

            await runUpdateCheck(false);
        });

        const onUpdateFound = (event: Event) => {
            const customEvent = event as CustomEvent<AppUpdateRelease>;
            if (customEvent.detail) {
                showAvailableUpdate(customEvent.detail);
            }
        };

        window.addEventListener('app:update-found', onUpdateFound as EventListener);

        return () => {
            disposed = true;
            if (progressHandle) {
                progressHandle.remove();
            }
            resumeHandlePromise.then(h => h.remove());
            window.removeEventListener('app:update-found', onUpdateFound as EventListener);
        };
    }, []);

    useEffect(() => {
        const init = async () => {
            await requestNotificationPermission();
            await setupNotificationChannels();
            await setupNotificationActions();
        };
        init();

        const unlisten = listenToNotificationActions((screen, actionId, extra) => {
            if (actionId === 'mute_athan') {
                stopAthan();
                return;
            }
            if (actionId === 'open_athan') {
                navigateTo('home');
                return;
            }
            if (actionId === 'mark_prayed') {
                const prayer = extra?.prayer;
                let deedId = 7;
                let xp = 15;
                if (prayer === 'Fajr') { deedId = 1; xp = 30; }
                else if (prayer === 'Isha') { deedId = 4; xp = 25; }
                completeDeed(deedId, xp);
                Haptics.notification({ type: NotificationType.Success });
                navigateTo('home');
            } else if (actionId === 'alhamdulillah') {
                completeDeed(52, 15);
                Haptics.notification({ type: NotificationType.Success });
                navigateTo('home');
            } else if (actionId === 'open_app' || actionId === 'open_adhkar') {
                navigateTo('adhkar');
            } else if (actionId === 'open_quran') {
                navigateTo('quran');
            } else if (actionId === 'open_tasbih') {
                navigateTo('tasbih');
            } else if (actionId === 'tap') {
                if (screen) {
                    if (extra?.surahId) setQuranAutoOpenSurah(extra.surahId);
                    if (extra?.page) setQuranAutoOpenPage(extra.page);
                    if (extra?.verseNum) setQuranAutoOpenVerse(extra.verseNum);
                    navigateTo(screen as Screen);
                } else {
                    navigateTo('home');
                }
            } else if (screen) {
                if (extra?.surahId) setQuranAutoOpenSurah(extra.surahId);
                if (extra?.page) setQuranAutoOpenPage(extra.page);
                if (extra?.verseNum) setQuranAutoOpenVerse(extra.verseNum);
                navigateTo(screen as Screen);
            }
        });

        const urlListener = CapApp.addListener('appUrlOpen', (data) => {
            if (data.url.includes('me3raj://app/')) {
                const url = new URL(data.url.replace('me3raj://app/', 'http://localhost/'));
                const path = url.pathname.slice(1);
                
                if (path === 'quran') {
                    const surah = url.searchParams.get('surah');
                    const page = url.searchParams.get('page');
                    const verse = url.searchParams.get('verse');
                    
                    if (surah) setQuranAutoOpenSurah(parseInt(surah));
                    if (page) setQuranAutoOpenPage(parseInt(page));
                    if (verse) setQuranAutoOpenVerse(parseInt(verse));
                    
                    navigateTo('quran');
                    return;
                }

                if (path && ['home', 'adhkar', 'videos', 'quran', 'hadith', 'duas', 'tasbih', 'calendar', 'qibla', 'settings', 'garden', 'deeds', 'zakat', 'khatma', 'lastTen', 'badges', 'profile', 'women', 'books'].includes(path)) {
                    navigateTo(path as Screen);
                }
            }
        });

        return () => {
            if (typeof unlisten === 'function') unlisten();
            urlListener.then(l => l.remove());
        };
    }, [currentScreen]); // Re-bind listener when currentScreen changes to have correct closure value

    useEffect(() => {
        const updateStatus = async () => {
            try {
                await StatusBar.show();
                await StatusBar.setOverlaysWebView({ overlay: true });
                await StatusBar.setStyle({
                    style: theme === 'light' ? Style.Dark : Style.Light
                });
            } catch (e) {
                console.warn('StatusBar error', e);
            }
        };
        // Small delay to ensure native layer is ready
        const timer = setTimeout(updateStatus, 100);
        return () => clearTimeout(timer);
    }, [theme]);

    const renderScreen = () => {
        switch (currentScreen) {
            case 'home': return <HomeScreen onNavigate={(s) => navigateTo(s as Screen)} />;
            case 'adhkar': return <AdhkarScreen onBack={goBack} />;
            case 'videos': return <VideosScreen onBack={goBack} onCategoryViewChange={setVideosInCategory} onNavigate={(s) => navigateTo(s as Screen)} />;
            case 'quran': return <QuranScreenV2 onBack={goBack} autoOpenSurahId={quranAutoOpenSurah} autoOpenPage={quranAutoOpenPage} autoOpenVerseId={quranAutoOpenVerse} onAutoOpenConsumed={() => { setQuranAutoOpenSurah(null); setQuranAutoOpenPage(null); setQuranAutoOpenVerse(null); }} />;
            case 'duas': return <DuasScreen onBack={goBack} />;
            case 'tasbih': return <TasbihScreen onBack={goBack} />;
            case 'calendar': return <CalendarScreen onBack={goBack} />;
            case 'qibla': return <QiblaScreen onBack={goBack} />;
            case 'settings': return <SettingsScreen onBack={goBack} onNavigate={(s) => navigateTo(s as Screen)} />;
            case 'garden': return <GardenScreen onBack={goBack} />;
            case 'deeds': return <DeedsScreen onBack={goBack} highlightDeedId={deedsHighlightId} onNavigate={(s) => navigateTo(s as Screen)} />;
            case 'zakat': return <ZakatScreen onBack={goBack} />;
            case 'khatma': return <KhatmaScreen onBack={goBack} onNavigate={(s, surahId, page) => { if (surahId) setQuranAutoOpenSurah(surahId); if (page) setQuranAutoOpenPage(page); navigateTo(s); }} />;
            case 'lastTen': return <LastTenScreen onBack={goBack} />;
            case 'hadith': return <HadithScreen onBack={goBack} onDetailViewChange={setHadithInDetails} />;
            case 'badges': return <BadgesScreen onBack={goBack} />;
            case 'profile': return <ProfileScreen onBack={goBack} onNavigate={(s) => navigateTo(s as Screen)} />;
            case 'women': return <WomenScreen onBack={goBack} />;
            case 'books': return <BooksScreen onBack={goBack} />;
            default: return <HomeScreen onNavigate={(s) => navigateTo(s as Screen)} />;
        }
    };

    if (!onboardingDone) {
        return (
            <Suspense fallback={null}>
                <OnboardingScreen onComplete={() => setOnboardingDone(true)} />
            </Suspense>
        );
    }

    const hideTabBar = currentScreen === 'quran'
        || (currentScreen === 'videos' && videosInCategory)
        || (currentScreen === 'hadith' && hadithInDetails);

    const showBg = ['home', 'hadith', 'videos'].includes(currentScreen) && appBgSettings.image !== 'none';
    const bgUrl = appBgSettings.image === 'custom' ? appBgSettings.custom : appBgSettings.image;

    return (
        <BackHandlerProvider onDefaultBack={() => {
            if (athanPlaybackState) {
                stopAthan();
                return;
            }
            if (currentScreen !== 'home') {
                goBack();
            } else {
                CapApp.exitApp();
            }
        }}>
            {showBg && bgUrl && (
                <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute inset-[-50px] bg-cover bg-center"
                        style={{
                            backgroundImage: `url('${bgUrl}')`,
                            filter: `blur(${appBgSettings.blur}px)`,
                            transform: 'scale(1.1)'
                        }}
                    />
                    <div className={`absolute inset-0 ${theme === 'light' ? 'bg-white/80' : 'bg-black/80'}`} />
                </div>
            )}
            <div className="relative z-10 h-full w-full">
                <Suspense fallback={<div className="h-full w-full" />}>
                    {renderScreen()}
                </Suspense>
                {currentScreen !== 'quran' && (
                    <MiniAudioPlayer hasTabBar={!hideTabBar} onNavigate={handleMiniPlayerClick} />
                )}
                <MiniVideoPlayer hasTabBar={!hideTabBar} />
                {!hideTabBar && !athanPlaybackState && (
                    <TabBar activeTab={tabBarScreen} onTabChange={navigateTo} />
                )}
                {/* Athan Full Screen Overlay */}
                {athanPlaybackState && getAthanSettings().fullScreenEnabled && (
                    <AthanScreen
                        state={athanPlaybackState}
                        onClose={() => setAthanPlaybackState(null)}
                    />
                )}
                <AppUpdateModal
                    open={updateModalOpen}
                    release={availableUpdate}
                    stage={updateModalStage}
                    progress={updateProgress}
                    message={updateMessage}
                    onUpdateNow={handleUpdateNow}
                    onLater={handleUpdateLater}
                    onOpenPermission={handleOpenPermission}
                    onRetry={handleUpdateNow}
                    onCloseError={() => setUpdateModalOpen(false)}
                />
            </div>
        </BackHandlerProvider>
    );
}

/* ─── Main App ─── */
export function App() {
    return (
        <ThemeProvider>
            <PrayerTimesProvider>
                <AudioProvider>
                    <VideoPlayerProvider>
                        <AppWrapper />
                    </VideoPlayerProvider>
                </AudioProvider>
            </PrayerTimesProvider>
        </ThemeProvider>
    );
}
