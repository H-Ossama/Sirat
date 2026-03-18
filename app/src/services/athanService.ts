/**
 * Athan Service v2
 * – Per-prayer muezzin selection
 * – Offline download via Capacitor Filesystem (Android) / Cache API (browser)
 * – Preview playback with stop/resume
 * – Background athan via Capacitor LocalNotifications
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// ─── Muezzin Definitions ─────────────────────────────────────────────────────

export interface Muezzin {
    id: string;
    nameAr: string;
    nameEn: string;
    description: string;
    /** Local file name once downloaded */
    audioFile: string;
    /** Primary CDN URL for download & preview */
    cdnUrl: string;
    /** Fallback CDN URL if primary fails */
    cdnUrlFallback?: string;
    /** Approximate file size for display */
    sizeMB?: string;
}

/**
 * Muezzin catalog.
 * Primary source: islamcan.com (small files ~300–700 KB, permissive CORS)
 */
export const MUEZZINS: Muezzin[] = [
    {
        id: 'makkah_classic',
        nameAr: 'أذان مكة المكرمة',
        nameEn: 'Makkah Classic',
        description: 'الأذان الرسمي للحرم المكي الشريف',
        audioFile: 'athan_makkah.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
        sizeMB: '0.6 MB',
    },
    {
        id: 'mishari_afasi',
        nameAr: 'مشاري راشد العفاسي',
        nameEn: 'Mishari Al-Afasi',
        description: 'صوت المقرئ مشاري بن راشد العفاسي',
        audioFile: 'athan_afasi.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
        sizeMB: '0.5 MB',
    },
    {
        id: 'sudais',
        nameAr: 'عبد الرحمن السديس',
        nameEn: 'Abdul Rahman Al-Sudais',
        description: 'إمام الحرم المكي الشريف',
        audioFile: 'athan_sudais.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
        sizeMB: '0.6 MB',
    },
    {
        id: 'egypt_classic',
        nameAr: 'الأذان المصري الكلاسيكي',
        nameEn: 'Egyptian Classic',
        description: 'الأذان التقليدي على الطراز المصري',
        audioFile: 'athan_egypt.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
        sizeMB: '0.5 MB',
    },
    {
        id: 'fajr_special',
        nameAr: 'أذان الفجر (الصلاة خير من النوم)',
        nameEn: 'Fajr Special',
        description: 'أذان الفجر مع التثويب — الصلاة خير من النوم',
        audioFile: 'athan_fajr.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan5.mp3',
        sizeMB: '0.5 MB',
    },
    {
        id: 'al_madinah',
        nameAr: 'أذان المدينة المنورة',
        nameEn: 'Madinah Call',
        description: 'أذان المسجد النبوي الشريف',
        audioFile: 'athan_madinah.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan6.mp3',
        sizeMB: '0.7 MB',
    },
    {
        id: 'ali_mulla',
        nameAr: 'علي أحمد ملا',
        nameEn: 'Ali Ahmed Mulla',
        description: 'المؤذن البحريني المشهور',
        audioFile: 'athan_ali_mulla.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan7.mp3',
        sizeMB: '0.5 MB',
    },
    {
        id: 'turkey_diyanet',
        nameAr: 'أذان تركي — ديانت',
        nameEn: 'Turkish Diyanet',
        description: 'الأذان الرسمي لرئاسة الشؤون الدينية التركية',
        audioFile: 'athan_turkey.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan8.mp3',
        sizeMB: '0.6 MB',
    },
    {
        id: 'short_athan',
        nameAr: 'أذان قصير',
        nameEn: 'Short Athan',
        description: 'نسخة مختصرة من الأذان',
        audioFile: 'athan_short.mp3',
        cdnUrl: 'https://www.islamcan.com/audio/adhan/azan9.mp3',
        sizeMB: '0.3 MB',
    },
    {
        id: 'beep',
        nameAr: 'تنبيه صوتي فقط',
        nameEn: 'Beep Only',
        description: 'إشعار صوتي بسيط بدون أذان',
        audioFile: 'athan_beep.mp3',
        cdnUrl: '',   // no download
        sizeMB: '',
    },
];

// ─── Per-Prayer Athan Settings ────────────────────────────────────────────────

export const PRAYERS_WITH_ATHAN = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerWithAthan = typeof PRAYERS_WITH_ATHAN[number];

export interface PrayerAthanConfig {
    enabled: boolean;
    muezzinId: string;
    // Reminder before athan (minutes, 0 = disabled)
    reminderMinutes: number;
    // Reminder ringtone
    reminderSound: string;
}

export interface AthanSettings {
    prayerConfigs: Record<PrayerWithAthan, PrayerAthanConfig>;
    // Global volume 0–1
    volume: number;
    // Override device silent mode
    overrideSilentMode: boolean;
    // Quick mute gesture: 'volume_long' | 'volume_double' | 'screen_long' | 'none'
    quickMuteGesture: string;
    // Full screen athan display
    fullScreenEnabled: boolean;
    // Which style screen to use: 'mosque' | 'dawn' | 'geometry'
    screenStyle: 'mosque' | 'dawn' | 'geometry';
    // Custom image for geometry style
    customImage?: string;
    // Currently muted (user toggled off)
    globalMuted: boolean;
}

const DEFAULT_PRAYER_CONFIG: PrayerAthanConfig = {
    enabled: true,
    muezzinId: 'makkah_classic',
    reminderMinutes: 0,
    reminderSound: 'default',
};

const DEFAULT_FAJR_CONFIG: PrayerAthanConfig = {
    enabled: true,
    muezzinId: 'fajr_special',
    reminderMinutes: 15,
    reminderSound: 'default',
};

export const DEFAULT_ATHAN_SETTINGS: AthanSettings = {
    prayerConfigs: {
        Fajr: DEFAULT_FAJR_CONFIG,
        Dhuhr: DEFAULT_PRAYER_CONFIG,
        Asr: DEFAULT_PRAYER_CONFIG,
        Maghrib: { ...DEFAULT_PRAYER_CONFIG, muezzinId: 'makkah_classic' },
        Isha: DEFAULT_PRAYER_CONFIG,
    },
    volume: 0.85,
    overrideSilentMode: true,
    quickMuteGesture: 'volume_long',
    fullScreenEnabled: true,
    screenStyle: 'mosque',
    globalMuted: false,
};

const ATHAN_SETTINGS_KEY = 'athan_settings_v2';

export function getAthanSettings(): AthanSettings {
    const saved = localStorage.getItem(ATHAN_SETTINGS_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved) as Partial<AthanSettings>;
            // Merge with defaults to handle new fields
            return {
                ...DEFAULT_ATHAN_SETTINGS,
                ...parsed,
                prayerConfigs: {
                    ...DEFAULT_ATHAN_SETTINGS.prayerConfigs,
                    ...(parsed.prayerConfigs || {}),
                },
            };
        } catch {
            return DEFAULT_ATHAN_SETTINGS;
        }
    }
    return DEFAULT_ATHAN_SETTINGS;
}

export function saveAthanSettings(settings: AthanSettings): void {
    localStorage.setItem(ATHAN_SETTINGS_KEY, JSON.stringify(settings));
}

export function updatePrayerAthanConfig(
    prayer: PrayerWithAthan,
    config: Partial<PrayerAthanConfig>
): AthanSettings {
    const settings = getAthanSettings();
    settings.prayerConfigs[prayer] = { ...settings.prayerConfigs[prayer], ...config };
    saveAthanSettings(settings);
    return settings;
}

export function getMuezzinById(id: string): Muezzin {
    return MUEZZINS.find(m => m.id === id) ?? MUEZZINS[0];
}

// ─── Download Manager ─────────────────────────────────────────────────────────
//
// Android (native): Capacitor Filesystem → Directory.Data/athan/<file>
// Browser:          Cache API (caches.open)  → keyed by CDN URL
//
// Download state persisted in localStorage: 'athan_dl_<id>' = 'downloaded' | 'error'

const ATHAN_CACHE_NAME = 'athan-v1';
const ATHAN_FS_DIR = 'athan';
const DL_KEY = (id: string) => `athan_dl_${id}`;

export type DownloadStatus = 'none' | 'downloading' | 'downloaded' | 'error';

export function getDownloadStatus(muezzinId: string): DownloadStatus {
    return (localStorage.getItem(DL_KEY(muezzinId)) as DownloadStatus) ?? 'none';
}

function persistDlStatus(muezzinId: string, status: DownloadStatus) {
    if (status === 'none') localStorage.removeItem(DL_KEY(muezzinId));
    else localStorage.setItem(DL_KEY(muezzinId), status);
}

type DlProgressCb = (muezzinId: string, progress: number, status: DownloadStatus) => void;
const _dlListeners = new Set<DlProgressCb>();

export function subscribeToDlProgress(cb: DlProgressCb): () => void {
    _dlListeners.add(cb);
    return () => _dlListeners.delete(cb);
}

function notifyDl(id: string, pct: number, status: DownloadStatus) {
    _dlListeners.forEach(cb => cb(id, pct, status));
}

/** Download a muezzin athan and store it for offline playback */
export async function downloadMuezzin(
    muezzin: Muezzin,
    onProgress?: (pct: number) => void
): Promise<void> {
    if (!muezzin.cdnUrl) return; // 'beep' has no file
    const { id } = muezzin;
    if (getDownloadStatus(id) === 'downloading') return;

    persistDlStatus(id, 'downloading');
    notifyDl(id, 0, 'downloading');

    try {
        const urls = [muezzin.cdnUrl, muezzin.cdnUrlFallback].filter(Boolean) as string[];
        let blob: Blob | null = null;
        let lastErr: unknown;

        for (const url of urls) {
            try {
                blob = await _fetchWithProgress(url, pct => {
                    notifyDl(id, pct, 'downloading');
                    onProgress?.(pct);
                });
                if (blob) break;
            } catch (e) { lastErr = e; }
        }
        if (!blob) throw lastErr ?? new Error('فشل التنزيل');

        if (Capacitor.isNativePlatform()) {
            await _saveToFilesystem(muezzin.audioFile, blob);
        } else {
            await _saveToCacheApi(muezzin.cdnUrl, blob);
        }

        persistDlStatus(id, 'downloaded');
        notifyDl(id, 100, 'downloaded');
    } catch (err) {
        console.warn('Athan download failed:', err);
        persistDlStatus(id, 'error');
        notifyDl(id, 0, 'error');
    }
}

async function _fetchWithProgress(url: string, onPct: (p: number) => void): Promise<Blob> {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const total = parseInt(resp.headers.get('content-length') ?? '0', 10);
    if (!total || !resp.body) {
        onPct(50);
        const b = await resp.blob();
        onPct(100);
        return b;
    }
    const reader = resp.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        onPct(Math.min(99, Math.round((received / total) * 100)));
    }
    const buf = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) { buf.set(c, off); off += c.length; }
    return new Blob([buf], { type: 'audio/mpeg' });
}

async function _saveToFilesystem(fileName: string, blob: Blob) {
    const b64 = await _blobToBase64(blob);
    await Filesystem.writeFile({
        path: `${ATHAN_FS_DIR}/${fileName}`,
        data: b64,
        directory: Directory.Data,
        recursive: true,
    });
}

async function _saveToCacheApi(cdnUrl: string, blob: Blob) {
    if (!('caches' in window)) return;
    const cache = await caches.open(ATHAN_CACHE_NAME);
    await cache.put(cdnUrl, new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
}

function _blobToBase64(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res((r.result as string).split(',')[1]);
        r.onerror = () => rej(r.error);
        r.readAsDataURL(blob);
    });
}

/** Remove the cached file and reset download state */
export async function deleteMuezzinCache(muezzin: Muezzin): Promise<void> {
    try {
        if (Capacitor.isNativePlatform()) {
            await Filesystem.deleteFile({ path: `${ATHAN_FS_DIR}/${muezzin.audioFile}`, directory: Directory.Data });
        } else if ('caches' in window) {
            const cache = await caches.open(ATHAN_CACHE_NAME);
            await cache.delete(muezzin.cdnUrl);
        }
    } catch { /* ok */ }
    persistDlStatus(muezzin.id, 'none');
    notifyDl(muezzin.id, 0, 'none');
}

/**
 * Returns best available playback URL:
 *   downloaded (native) → capacitor:// URI
 *   downloaded (browser) → blob:
 *   not downloaded       → CDN URL
 */
export async function getOfflineAudioUrl(muezzin: Muezzin): Promise<string> {
    if (getDownloadStatus(muezzin.id) !== 'downloaded') return muezzin.cdnUrl;
    try {
        if (Capacitor.isNativePlatform()) {
            const { uri } = await Filesystem.getUri({
                path: `${ATHAN_FS_DIR}/${muezzin.audioFile}`,
                directory: Directory.Data,
            });
            return Capacitor.convertFileSrc(uri);
        }
        if ('caches' in window) {
            const cache = await caches.open(ATHAN_CACHE_NAME);
            const resp = await cache.match(muezzin.cdnUrl);
            if (resp) return URL.createObjectURL(await resp.blob());
        }
    } catch { /* fallthrough */ }
    return muezzin.cdnUrl;
}

// ─── Preview Playback ─────────────────────────────────────────────────────────

let _previewAudio: HTMLAudioElement | null = null;
let _previewingId: string | null = null;
type PreviewCb = (muezzinId: string | null) => void;
const _previewListeners = new Set<PreviewCb>();

export function subscribeToPreview(cb: PreviewCb): () => void {
    _previewListeners.add(cb);
    return () => _previewListeners.delete(cb);
}
export function getPreviewingId(): string | null { return _previewingId; }

function _notifyPreview(id: string | null) { _previewListeners.forEach(cb => cb(id)); }

/** Toggle preview of a muezzin. Calling with the same id stops it. */
export async function previewMuezzin(muezzin: Muezzin): Promise<void> {
    if (_previewingId === muezzin.id) { stopPreview(); return; }
    stopPreview();
    const url = await getOfflineAudioUrl(muezzin);
    if (!url) return;
    _previewAudio = new Audio(url);
    _previewAudio.volume = Math.min(1, getAthanSettings().volume * 1.1);
    _previewingId = muezzin.id;
    _notifyPreview(muezzin.id);
    _previewAudio.addEventListener('ended', () => { _previewingId = null; _previewAudio = null; _notifyPreview(null); });
    try { await _previewAudio.play(); }
    catch { _previewingId = null; _previewAudio = null; _notifyPreview(null); }
}

export function stopPreview(): void {
    _previewAudio?.pause();
    _previewAudio = null;
    _previewingId = null;
    _notifyPreview(null);
}

// ─── In-App Athan Playback ────────────────────────────────────────────────────

let athanAudio: HTMLAudioElement | null = null;
let athanTimeoutId: ReturnType<typeof setTimeout> | null = null;

export interface AthanPlaybackState {
    isPlaying: boolean;
    isMuted: boolean;
    prayerName: string;
    prayerNameAr: string;
    muezzin: Muezzin;
    screenStyle: 'mosque' | 'dawn' | 'geometry';
}

let _playbackListeners: ((state: AthanPlaybackState | null) => void)[] = [];

export function subscribeToAthanPlayback(
    listener: (state: AthanPlaybackState | null) => void
): () => void {
    _playbackListeners.push(listener);
    return () => {
        _playbackListeners = _playbackListeners.filter(l => l !== listener);
    };
}

function notifyListeners(state: AthanPlaybackState | null) {
    _playbackListeners.forEach(l => l(state));
}

export async function playAthan(
    prayerName: string,
    prayerNameAr: string,
    overrideMuezzinId?: string
): Promise<void> {
    const settings = getAthanSettings();

    if (settings.globalMuted) {
        notifyListeners(null);
        return;
    }

    const config = settings.prayerConfigs[prayerName as PrayerWithAthan];
    if (!config || !config.enabled) {
        notifyListeners(null);
        return;
    }

    const muezzinId = overrideMuezzinId || config.muezzinId;
    const muezzin = getMuezzinById(muezzinId);

    stopPreview();
    stopAthan();

    // prefer offline file, fall back to CDN
    const audioUrl = await getOfflineAudioUrl(muezzin);

    athanAudio = new Audio(audioUrl);
    athanAudio.volume = settings.volume;

    try {
        await athanAudio.play();
    } catch {
        if (muezzin.cdnUrl && audioUrl !== muezzin.cdnUrl) {
            athanAudio = new Audio(muezzin.cdnUrl);
            athanAudio.volume = settings.volume;
            await athanAudio.play().catch(console.warn);
        }
    }

    const playbackState: AthanPlaybackState = {
        isPlaying: true,
        isMuted: false,
        prayerName,
        prayerNameAr,
        muezzin,
        screenStyle: settings.screenStyle,
    };

    notifyListeners(playbackState);

    athanAudio.addEventListener('ended', () => {
        notifyListeners(null);
        athanAudio = null;
    });

    // Auto-stop after 10 minutes as safety fallback
    athanTimeoutId = setTimeout(() => stopAthan(), 10 * 60 * 1000);

    // Media Session for lock screen / notification controls
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: `أذان ${prayerNameAr}`,
            artist: muezzin.nameAr,
            album: 'أوقات الصلاة',
            artwork: [
                { src: '/assets/icons/icon-512.webp', sizes: '512x512', type: 'image/webp' },
            ],
        });
        navigator.mediaSession.setActionHandler('pause', () => { muteAthan(); });
        navigator.mediaSession.setActionHandler('stop', () => { stopAthan(); });
    }
}

export function stopAthan(): void {
    if (athanTimeoutId) {
        clearTimeout(athanTimeoutId);
        athanTimeoutId = null;
    }
    if (athanAudio) {
        athanAudio.pause();
        athanAudio.currentTime = 0;
        athanAudio = null;
    }
    notifyListeners(null);
}

export function muteAthan(): void {
    if (athanAudio) {
        athanAudio.muted = true;
    }
    // Notify with muted state but keep screen visible briefly
    const settings = getAthanSettings();
    // Toggle global mute temporarily for this session
    setTimeout(() => notifyListeners(null), 1500);
}

export function setAthanVolume(volume: number): void {
    if (athanAudio) {
        athanAudio.volume = Math.max(0, Math.min(1, volume));
    }
    const settings = getAthanSettings();
    settings.volume = volume;
    saveAthanSettings(settings);
}

export function toggleGlobalMute(): boolean {
    const settings = getAthanSettings();
    settings.globalMuted = !settings.globalMuted;
    saveAthanSettings(settings);
    if (settings.globalMuted) {
        stopAthan();
    }
    return settings.globalMuted;
}

// ─── Background Notification Scheduling ──────────────────────────────────────
// We use Capacitor LocalNotifications with custom athan sound files.
// The athan WAV/MP3 must be placed in android/app/src/main/res/raw/
// Named according to each muezzin (e.g., athan_makkah.wav)

export async function setupAthanNotificationChannel(): Promise<void> {
    try {
        await LocalNotifications.createChannel({
            id: 'athan',
            name: 'الأذان',
            description: 'أذان الصلاة — يُشغَّل تلقائياً عند دخول وقت الصلاة',
            importance: 5, // IMPORTANCE_HIGH (makes heads-up popup)
            visibility: 1,
            vibration: true,
            sound: 'athan_makkah', // default athan sound (without extension)
        });

        await LocalNotifications.createChannel({
            id: 'athan_reminder',
            name: 'تذكير قبل الأذان',
            description: 'تنبيه قبيل وقت الصلاة',
            importance: 4,
            visibility: 1,
            vibration: true,
            sound: 'notification_reminder',
        });
    } catch {
        // Browser mode
    }
}

export interface ScheduleAthanNotificationsParams {
    location?: string;
    methodId?: string;
    school?: number;
    offsets?: Record<string, number>;
    settings: AthanSettings;
}

/**
 * Schedules Athan notifications for the next 7 days.
 * Precise scheduling (no daily repeat) ensures accuracy as prayer times shift.
 */
export async function scheduleAthanNotifications({
    location,
    methodId,
    school,
    offsets,
    settings,
}: ScheduleAthanNotificationsParams): Promise<void> {
    const { scheduleAllNotifications, getNotificationSettings } = await import('./notificationService');
    const nSettings = getNotificationSettings();
    await scheduleAllNotifications(
        [], // dummy
        nSettings,
        false, // handled inside master via settings check
        settings,
        location,
        methodId,
        school,
        offsets
    );
}


const PRAYERS_WITH_ATHAN_AR: Record<string, string> = {
    Fajr: 'الفجر',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء',
};

export async function registerAthanNotificationActions(): Promise<void> {
    try {
        await LocalNotifications.registerActionTypes({
            types: [
                {
                    id: 'ATHAN_ACTION',
                    actions: [
                        { id: 'mute_athan', title: '🔕 كتم الأذان' },
                        { id: 'open_athan', title: '🕌 فتح شاشة الأذان' },
                    ],
                },
            ],
        });
    } catch {
        // Browser mode
    }
}

// ─── Reminder Sound Options ───────────────────────────────────────────────────

export const REMINDER_SOUNDS = [
    { id: 'default', label: 'الافتراضي' },
    { id: 'soft_bell', label: 'جرس ناعم' },
    { id: 'quran_verse', label: 'آية قرآنية' },
    { id: 'tasbih', label: 'تسبيح' },
    { id: 'none', label: 'صامت' },
];

// ─── Quick Mute Gestures ──────────────────────────────────────────────────────

export const QUICK_MUTE_GESTURES = [
    { id: 'volume_long', label: 'الضغط المطوّل على زر الصوت' },
    { id: 'volume_double', label: 'الضغط المزدوج على زر الصوت' },
    { id: 'screen_long', label: 'الضغط المطوّل على الشاشة' },
    { id: 'shake', label: 'هزّ الهاتف' },
    { id: 'none', label: 'بدون إيماءة سريعة' },
];
