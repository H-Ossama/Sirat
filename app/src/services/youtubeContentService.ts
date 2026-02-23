import { videoCategories } from '../data/videoContent';

export interface FetchedVideoItem {
    id: string;
    videoId: string;
    title: string;
    channel: string;
    views: string;
    thumbnail: string;
    url: string;
    embedUrl: string;
    durationText: string;
    isReel: boolean;
}

interface CacheEntry {
    dayKey: string;
    updatedAt: number;
    items: FetchedVideoItem[];
}

type CacheStore = Record<string, CacheEntry>;

const CACHE_KEY = 'yt_content_cache_v2';
const DAILY_KEY = () => new Date().toISOString().slice(0, 10);
const DEFAULT_LIMIT = 18;
const YOUTUBE_API_KEY = (import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined)?.trim() || '';

const hasArabic = (text: string) => /[\u0600-\u06FF]/.test(text || '');

const toYouTubeUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
const toThumbnail = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
const toEmbedUrl = (videoId: string, isReel: boolean) => `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1${isReel ? `&loop=1&playlist=${videoId}` : ''}`;

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

async function fetchJson(url: string, timeout = 9000): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

async function searchByYouTubeApi(query: string, maxResults = 8): Promise<FetchedVideoItem[]> {
    if (!YOUTUBE_API_KEY) return [];

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&regionCode=SA&relevanceLanguage=ar&safeSearch=moderate&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const searchData = await fetchJson(searchUrl);
    const items = Array.isArray(searchData?.items) ? searchData.items : [];
    const ids = items.map((it: any) => it?.id?.videoId).filter(Boolean);
    if (!ids.length) return [];

    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids.join(',')}&key=${YOUTUBE_API_KEY}`;
    const statsData = await fetchJson(statsUrl);
    const statsMap = new Map<string, any>();
    for (const stat of statsData?.items || []) {
        statsMap.set(stat.id, {
            statistics: stat.statistics || {},
            contentDetails: stat.contentDetails || {},
        });
    }

    return items
        .map((it: any) => {
            const videoId = it?.id?.videoId as string;
            const snippet = it?.snippet || {};
            const stat = statsMap.get(videoId);
            const views = stat?.statistics?.viewCount ? Number(stat.statistics.viewCount) : null;
            const durationSeconds = parseIsoDurationToSeconds(stat?.contentDetails?.duration);
            const isReel = durationSeconds > 0 && durationSeconds <= 90;
            return {
                id: `${videoId}-yt`,
                videoId,
                title: snippet.title || 'فيديو إسلامي',
                channel: snippet.channelTitle || 'YouTube',
                views: formatViews(views),
                thumbnail: snippet?.thumbnails?.high?.url || snippet?.thumbnails?.medium?.url || toThumbnail(videoId),
                url: toYouTubeUrl(videoId),
                embedUrl: toEmbedUrl(videoId, isReel),
                durationText: formatDuration(durationSeconds),
                isReel,
            } as FetchedVideoItem;
        })
        .filter((v: FetchedVideoItem) => v.videoId && v.title && hasArabic(v.title));
}

function uniqueByVideoId(items: FetchedVideoItem[]): FetchedVideoItem[] {
    const map = new Map<string, FetchedVideoItem>();
    for (const item of items) {
        if (!map.has(item.videoId)) map.set(item.videoId, item);
    }
    return Array.from(map.values());
}

async function fetchCategoryFresh(categoryId: string, limit = DEFAULT_LIMIT): Promise<FetchedVideoItem[]> {
    const category = videoCategories.find(c => c.id === categoryId);
    if (!category || !YOUTUBE_API_KEY) return [];

    const merged: FetchedVideoItem[] = [];
    for (const query of category.searchQueries) {
        const yt = await searchByYouTubeApi(query, 6);
        merged.push(...yt);

        if (merged.length >= limit * 2) break;
    }

    const unique = uniqueByVideoId(merged).slice(0, limit);
    return seededShuffle(unique, `${categoryId}-${DAILY_KEY()}`);
}

export async function getVideosByCategory(categoryId: string, options?: { forceRefresh?: boolean; limit?: number }): Promise<{ items: FetchedVideoItem[]; updatedAt: number | null; fromCache: boolean }> {
    const forceRefresh = !!options?.forceRefresh;
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const dayKey = DAILY_KEY();

    const cache = readCache();
    const entry = cache[categoryId];
    const cacheIsFresh = entry && entry.dayKey === dayKey && entry.items?.length > 0;

    if (!forceRefresh && cacheIsFresh) {
        return {
            items: seededShuffle(entry.items.slice(0, limit), `${categoryId}-${dayKey}`),
            updatedAt: entry.updatedAt,
            fromCache: true,
        };
    }

    try {
        const fresh = await fetchCategoryFresh(categoryId, limit);
        if (fresh.length > 0) {
            cache[categoryId] = {
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
            items: seededShuffle(entry.items.slice(0, limit), `${categoryId}-${dayKey}`),
            updatedAt: entry.updatedAt,
            fromCache: true,
        };
    }

    return { items: [], updatedAt: null, fromCache: false };
}

export function isYouTubeApiConfigured(): boolean {
    return !!YOUTUBE_API_KEY;
}
