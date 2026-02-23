import { videoCategories } from '../data/videoContent';

export interface FetchedVideoItem {
    id: string;
    videoId: string;
    title: string;
    description: string;
    channel: string;
    views: string;
    thumbnail: string;
    url: string;
    embedUrl: string;
    durationSeconds: number;
    durationText: string;
    isReel: boolean;
}

interface CacheEntry {
    dayKey: string;
    updatedAt: number;
    items: FetchedVideoItem[];
}

type CacheStore = Record<string, CacheEntry>;

const CACHE_KEY = 'yt_content_cache_v3';
const API_ISSUE_KEY = 'yt_api_issue_v1';
const API_BUDGET_KEY = 'yt_api_budget_v1';
const DAILY_KEY = () => new Date().toISOString().slice(0, 10);
const DEFAULT_LIMIT = 18;
const YOUTUBE_API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined)?.trim() || '';
const YOUTUBE_API_COOLDOWN_MS = 5 * 60 * 1000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const FORCE_REFRESH_MIN_INTERVAL_MS = 1000 * 60 * 60 * 6;
const CLIENT_DAILY_REQUEST_BUDGET = Number((import.meta.env.VITE_YOUTUBE_CLIENT_DAILY_BUDGET as string | undefined) || '90');

let youtubeApiBlockedUntil = 0;
let youtubeApiIssueMessage: string | null = null;

interface YouTubeApiIssueState {
    message: string;
    blockedUntil: number;
}

interface YouTubeApiBudgetState {
    dayKey: string;
    count: number;
}

const hasArabic = (text: string) => /[\u0600-\u06FF]/.test(text || '');

const BLOCKED_TERMS = [
    'اغنية', 'أغنية', 'موسيقى', 'رقص', 'dance', 'music', 'dj', 'trap', 'party', 'remix',
    'dating', 'flirt', 'prank', 'tiktok challenge', 'funny challenge',
    'bikini', 'beach', 'مكياج', 'makeup tutorial', 'vlog day',
    'gta', 'pubg', 'fortnite', 'reaction', 'ترند', 'viral'
];

const ISLAMIC_SIGNALS = [
    'الاسلام', 'إسلام', 'القران', 'القرآن', 'تفسير', 'حديث', 'السنة', 'سنه', 'السيرة', 'الاذكار', 'أذكار',
    'دعاء', 'دعاء', 'فقه', 'فتوى', 'الشيخ', 'quran', 'islam', 'hadith', 'tafsir', 'dua', 'dhikr', 'fiqh', 'seerah'
];

const toYouTubeUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
const toThumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
const toEmbedUrl = (videoId: string, isReel: boolean) => `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1${isReel ? `&loop=1&playlist=${videoId}` : ''}`;

function normalize(text: string): string {
    return (text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u064B-\u0652]/g, '');
}

function hasAnySignal(text: string, signals: string[]): boolean {
    const normalized = normalize(text);
    return signals.some(signal => normalized.includes(normalize(signal)));
}

function isLikelyIslamicContent(title: string, description: string, channel: string): boolean {
    const fullText = `${title} ${description} ${channel}`;
    if (hasAnySignal(fullText, BLOCKED_TERMS)) return false;
    return hasAnySignal(fullText, ISLAMIC_SIGNALS);
}

function formatViews(value: number | null | undefined): string {
    if (!value || value <= 0) return 'مشاهدات غير متاحة';
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B مشاهدة`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M مشاهدة`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K مشاهدة`;
    return `${value} مشاهدة`;
}

function parseIsoDurationToSeconds(isoDuration: string | undefined): number {
    if (!isoDuration) return 0;
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(isoDuration);
    if (!match) return 0;
    const hours = Number(match[1] || 0);
    const minutes = Number(match[2] || 0);
    const seconds = Number(match[3] || 0);
    return (hours * 3600) + (minutes * 60) + seconds;
}

function formatDuration(secondsTotal: number): string {
    if (!secondsTotal) return '--:--';
    const hours = Math.floor(secondsTotal / 3600);
    const minutes = Math.floor((secondsTotal % 3600) / 60);
    const seconds = secondsTotal % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function seededShuffle<T>(items: T[], seed: string): T[] {
    const arr = [...items];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }

    for (let i = arr.length - 1; i > 0; i--) {
        hash = (hash * 1664525 + 1013904223) | 0;
        const rand = Math.abs(hash) / 2147483648;
        const j = Math.floor(rand * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function seededPickIndex(seed: string, length: number): number {
    if (length <= 0) return 0;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % length;
}

function readCache(): CacheStore {
    try {
        return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
    } catch {
        return {};
    }
}

function writeCache(data: CacheStore) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function readApiIssueState(): YouTubeApiIssueState | null {
    try {
        const raw = localStorage.getItem(API_ISSUE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<YouTubeApiIssueState>;
        if (!parsed?.message || typeof parsed.blockedUntil !== 'number') return null;
        return {
            message: parsed.message,
            blockedUntil: parsed.blockedUntil,
        };
    } catch {
        return null;
    }
}

function writeApiIssueState(state: YouTubeApiIssueState | null) {
    if (!state) {
        localStorage.removeItem(API_ISSUE_KEY);
        return;
    }
    localStorage.setItem(API_ISSUE_KEY, JSON.stringify(state));
}

function readApiBudgetState(): YouTubeApiBudgetState {
    try {
        const raw = localStorage.getItem(API_BUDGET_KEY);
        const parsed = raw ? JSON.parse(raw) as Partial<YouTubeApiBudgetState> : null;
        const today = DAILY_KEY();
        if (!parsed || parsed.dayKey !== today || typeof parsed.count !== 'number' || parsed.count < 0) {
            return { dayKey: today, count: 0 };
        }
        return { dayKey: today, count: parsed.count };
    } catch {
        return { dayKey: DAILY_KEY(), count: 0 };
    }
}

function writeApiBudgetState(state: YouTubeApiBudgetState) {
    localStorage.setItem(API_BUDGET_KEY, JSON.stringify(state));
}

function getNextDayStartMs(): number {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next.getTime();
}

function reserveApiBudget(units: number): boolean {
    const safeUnits = Math.max(1, units || 1);
    const state = readApiBudgetState();
    const budgetCap = Number.isFinite(CLIENT_DAILY_REQUEST_BUDGET) && CLIENT_DAILY_REQUEST_BUDGET > 0
        ? CLIENT_DAILY_REQUEST_BUDGET
        : 90;

    if ((state.count + safeUnits) > budgetCap) {
        youtubeApiIssueMessage = 'تم إيقاف الجلب مؤقتاً للحفاظ على حصة YouTube اليومية. سيتم استئناف الجلب غداً تلقائياً.';
        youtubeApiBlockedUntil = Math.max(youtubeApiBlockedUntil, getNextDayStartMs());
        writeApiIssueState({
            message: youtubeApiIssueMessage,
            blockedUntil: youtubeApiBlockedUntil,
        });
        return false;
    }

    writeApiBudgetState({ dayKey: state.dayKey, count: state.count + safeUnits });
    return true;
}

class FetchHttpError extends Error {
    status: number;
    payload: any;

    constructor(status: number, payload: any, message?: string) {
        super(message || `HTTP ${status}`);
        this.name = 'FetchHttpError';
        this.status = status;
        this.payload = payload;
    }
}

function mapYouTubeApiIssue(status: number, payload: any): string {
    const reason = String(payload?.error?.errors?.[0]?.reason || '').toLowerCase();

    if (reason === 'quotaexceeded' || reason === 'dailylimitexceeded' || reason === 'dailylimitexceededunreg') {
        return 'تم تجاوز حصة YouTube API اليوم. سيتم استئناف الجلب تلقائياً بعد إعادة تعيين الحصة.';
    }

    if (reason === 'keyinvalid' || reason === 'badrequest') {
        return 'مفتاح YouTube API غير صالح. تحقّق من VITE_YOUTUBE_API_KEY.';
    }

    if (reason === 'iprefererblocked' || reason === 'accessnotconfigured' || status === 403) {
        return 'مفتاح YouTube API مقيّد ولا يسمح بالطلبات من هذا التطبيق. عدّل قيود المفتاح في Google Cloud.';
    }

    return 'تعذر الوصول إلى YouTube API حالياً. جرّب مرة أخرى لاحقاً.';
}

function setYouTubeApiIssue(error: unknown) {
    if (!(error instanceof FetchHttpError)) return;
    if (error.status !== 400 && error.status !== 403 && error.status !== 429) return;

    const reason = String(error.payload?.error?.errors?.[0]?.reason || '').toLowerCase();
    const quotaExceeded = reason === 'quotaexceeded' || reason === 'dailylimitexceeded' || reason === 'dailylimitexceededunreg';
    const longBlock = quotaExceeded || reason === 'iprefererblocked' || reason === 'accessnotconfigured' || reason === 'keyinvalid';
    youtubeApiIssueMessage = mapYouTubeApiIssue(error.status, error.payload);
    youtubeApiBlockedUntil = quotaExceeded
        ? Math.max(Date.now() + (12 * 60 * 60 * 1000), getNextDayStartMs())
        : Date.now() + (longBlock ? 24 * 60 * 60 * 1000 : YOUTUBE_API_COOLDOWN_MS);
    writeApiIssueState({
        message: youtubeApiIssueMessage,
        blockedUntil: youtubeApiBlockedUntil,
    });
}

function clearYouTubeApiIssue() {
    youtubeApiIssueMessage = null;
    youtubeApiBlockedUntil = 0;
    writeApiIssueState(null);
}

const persistedApiIssue = readApiIssueState();
if (persistedApiIssue && persistedApiIssue.blockedUntil > Date.now()) {
    youtubeApiIssueMessage = persistedApiIssue.message;
    youtubeApiBlockedUntil = persistedApiIssue.blockedUntil;
} else if (persistedApiIssue) {
    writeApiIssueState(null);
}

async function fetchJson(url: string, timeout = 9000): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
            let payload: any = null;
            try {
                payload = await res.json();
            } catch {
                payload = null;
            }
            throw new FetchHttpError(res.status, payload);
        }
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function searchByYouTubeApi(query: string, maxResults = 8, reelsMode = false): Promise<FetchedVideoItem[]> {
    if (!YOUTUBE_API_KEY) return [];
    if (Date.now() < youtubeApiBlockedUntil) return [];
    if (!reserveApiBudget(reelsMode ? 1 : 2)) return [];

    try {
        const durationParam = reelsMode ? '&videoDuration=short' : '';
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&regionCode=SA&relevanceLanguage=ar${durationParam}&safeSearch=strict&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
        const searchData = await fetchJson(searchUrl);
        const items = Array.isArray(searchData?.items) ? searchData.items : [];
        const ids = items.map((it: any) => it?.id?.videoId).filter(Boolean);
        if (!ids.length) return [];

        const statsMap = new Map<string, any>();
        if (!reelsMode) {
            const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids.join(',')}&key=${YOUTUBE_API_KEY}`;
            const statsData = await fetchJson(statsUrl);
            for (const stat of statsData?.items || []) {
                statsMap.set(stat.id, {
                    statistics: stat.statistics || {},
                    contentDetails: stat.contentDetails || {},
                });
            }
        }

        clearYouTubeApiIssue();

        return items
            .map((it: any) => {
                const videoId = it?.id?.videoId as string;
                const snippet = it?.snippet || {};
                const stat = statsMap.get(videoId);
                const views = stat?.statistics?.viewCount ? Number(stat.statistics.viewCount) : null;
                const durationSeconds = reelsMode ? 0 : parseIsoDurationToSeconds(stat?.contentDetails?.duration);
                const isReel = reelsMode || (durationSeconds > 0 && durationSeconds <= 180);
                return {
                    id: `${videoId}-yt`,
                    videoId,
                    title: snippet.title || 'فيديو إسلامي',
                    description: snippet.description || '',
                    channel: snippet.channelTitle || 'YouTube',
                    views: formatViews(views),
                    thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.medium?.url || toThumbnail(videoId),
                    url: toYouTubeUrl(videoId),
                    embedUrl: toEmbedUrl(videoId, isReel),
                    durationSeconds,
                    durationText: formatDuration(durationSeconds),
                    isReel,
                } as FetchedVideoItem;
            })
            .filter((v: FetchedVideoItem) => {
                if (!v.videoId || !v.title) return false;
                if (reelsMode) {
                    const blocked = BLOCKED_TERMS.some(t => normalize(`${v.title} ${v.channel}`).includes(normalize(t)));
                    return !blocked;
                }
                const isArabicContext = hasArabic(v.title) || hasArabic(v.description) || hasArabic(v.channel);
                return isArabicContext && isLikelyIslamicContent(v.title, v.description, v.channel);
            });
    } catch (error) {
        setYouTubeApiIssue(error);
        return [];
    }
}

function uniqueByVideoId(items: FetchedVideoItem[]): FetchedVideoItem[] {
    const map = new Map<string, FetchedVideoItem>();
    for (const item of items) {
        if (!map.has(item.videoId)) map.set(item.videoId, item);
    }
    return Array.from(map.values());
}

async function fetchCategoryFresh(categoryId: string, options?: { limit?: number; reelsOnly?: boolean }): Promise<FetchedVideoItem[]> {
    const category = videoCategories.find(c => c.id === categoryId);
    if (!category || !YOUTUBE_API_KEY) return [];

    const limit = options?.limit ?? DEFAULT_LIMIT;
    const reelsOnly = !!options?.reelsOnly;

    const merged: FetchedVideoItem[] = [];
    if (reelsOnly) {
        // Use the single dedicated reels query — saves API quota (1 call vs 4+)
        const reelsQuery = category.reelsQuery || category.searchQueries[0];
        const yt = await searchByYouTubeApi(reelsQuery, 15, true);
        merged.push(...yt);
    } else {
        // Quota saver: try one deterministic query first, then one fallback only if needed
        const queries = category.searchQueries.filter(Boolean);
        if (queries.length > 0) {
            const primaryIndex = seededPickIndex(`${categoryId}-${DAILY_KEY()}`, queries.length);
            const primaryQuery = queries[primaryIndex];
            const primary = await searchByYouTubeApi(primaryQuery, Math.max(8, Math.ceil(limit / 2)), false);
            merged.push(...primary);

            if (merged.length < Math.max(8, Math.ceil(limit / 2)) && queries.length > 1) {
                const fallbackIndex = (primaryIndex + 1) % queries.length;
                const fallback = await searchByYouTubeApi(queries[fallbackIndex], 6, false);
                merged.push(...fallback);
            }
        }
    }

    const filtered = reelsOnly
        ? merged
        : merged;

    const unique = uniqueByVideoId(filtered).slice(0, limit);
    return seededShuffle(unique, `${categoryId}-${DAILY_KEY()}`);
}

export async function getVideosByCategory(categoryId: string, options?: { forceRefresh?: boolean; limit?: number; reelsOnly?: boolean }): Promise<{ items: FetchedVideoItem[]; updatedAt: number | null; fromCache: boolean }> {
    const forceRefresh = !!options?.forceRefresh;
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const reelsOnly = !!options?.reelsOnly;
    const dayKey = DAILY_KEY();
    const cacheId = reelsOnly ? `${categoryId}:reels` : categoryId;

    const cache = readCache();
    const entry = cache[cacheId];
    const cacheIsFresh = !!entry && entry.items?.length > 0 && (Date.now() - entry.updatedAt) < CACHE_TTL_MS;

    if (!forceRefresh && cacheIsFresh) {
        return {
            items: seededShuffle(entry.items.slice(0, limit), `${cacheId}-${dayKey}`),
            updatedAt: entry.updatedAt,
            fromCache: true,
        };
    }

    const recentlyUpdated = !!entry?.updatedAt && (Date.now() - entry.updatedAt) < FORCE_REFRESH_MIN_INTERVAL_MS;
    if (forceRefresh && entry?.items?.length && recentlyUpdated) {
        return {
            items: seededShuffle(entry.items.slice(0, limit), `${cacheId}-${dayKey}`),
            updatedAt: entry.updatedAt,
            fromCache: true,
        };
    }

    try {
        const fresh = await fetchCategoryFresh(categoryId, { limit, reelsOnly });
        if (fresh.length > 0) {
            cache[cacheId] = {
                dayKey,
                updatedAt: Date.now(),
                items: fresh,
            };
            writeCache(cache);
            return { items: fresh, updatedAt: Date.now(), fromCache: false };
        }
    } catch {
        // fallback to cache below
    }

    if (entry?.items?.length) {
        return {
            items: seededShuffle(entry.items.slice(0, limit), `${cacheId}-${dayKey}`),
            updatedAt: entry.updatedAt,
            fromCache: true,
        };
    }

    return { items: [], updatedAt: null, fromCache: false };
}

export function isYouTubeApiConfigured(): boolean {
    return !!YOUTUBE_API_KEY;
}

export function isYouTubeApiTemporarilyBlocked(): boolean {
    return Date.now() < youtubeApiBlockedUntil;
}

export function getYouTubeApiIssueMessage(): string | null {
    if (!YOUTUBE_API_KEY) return 'مفتاح YouTube API غير مضاف. أضف VITE_YOUTUBE_API_KEY لتفعيل الجلب التلقائي.';
    return youtubeApiIssueMessage;
}
