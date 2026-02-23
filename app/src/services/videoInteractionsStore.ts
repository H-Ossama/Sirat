import { logInteraction } from './activityLogStore';

export interface LocalVideoComment {
    id: string;
    text: string;
    createdAt: number;
}

export interface VideoMeta {
    videoId: string;
    title: string;
    channel: string;
    thumbnail: string;
    durationText: string;
    views: string;
}

export interface LocalVideoInteractions {
    liked: boolean;
    saved: boolean;
    comments: LocalVideoComment[];
    meta?: VideoMeta;
}

type InteractionsState = Record<string, LocalVideoInteractions>;

const STORAGE_KEY = 'video_local_interactions_v1';

function readState(): InteractionsState {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function writeState(state: InteractionsState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureVideoState(state: InteractionsState, videoId: string): LocalVideoInteractions {
    if (!state[videoId]) {
        state[videoId] = {
            liked: false,
            saved: false,
            comments: [],
        };
    }
    return state[videoId];
}

export function registerVideoMeta(videoId: string, meta: VideoMeta): void {
    const state = readState();
    const item = ensureVideoState(state, videoId);
    item.meta = meta;
    writeState(state);
}

export function getSavedVideos(): Array<LocalVideoInteractions & { meta: VideoMeta }> {
    const state = readState();
    return Object.values(state).filter(v => v.saved && v.meta) as Array<LocalVideoInteractions & { meta: VideoMeta }>;
}

export function getLikedVideos(): Array<LocalVideoInteractions & { meta: VideoMeta }> {
    const state = readState();
    return Object.values(state).filter(v => v.liked && v.meta) as Array<LocalVideoInteractions & { meta: VideoMeta }>;
}

export function getVideoInteractions(videoId: string): LocalVideoInteractions {
    const state = readState();
    return ensureVideoState(state, videoId);
}

export function toggleVideoLike(videoId: string, meta?: VideoMeta): LocalVideoInteractions {
    const state = readState();
    const item = ensureVideoState(state, videoId);
    item.liked = !item.liked;
    if (meta && !item.meta) item.meta = meta;
    writeState(state);
    logInteraction({
        type: item.liked ? 'video_like' : 'video_unlike',
        category: 'video',
        title: item.liked ? 'إعجاب بالفيديو' : 'إلغاء الإعجاب',
        details: item.meta?.title || meta?.title || 'فيديو',
        meta: {
            videoId,
            liked: item.liked,
        },
    });
    return item;
}

export function toggleVideoSave(videoId: string, meta?: VideoMeta): LocalVideoInteractions {
    const state = readState();
    const item = ensureVideoState(state, videoId);
    item.saved = !item.saved;
    if (meta && !item.meta) item.meta = meta;
    writeState(state);
    logInteraction({
        type: item.saved ? 'video_save' : 'video_unsave',
        category: 'video',
        title: item.saved ? 'حفظ فيديو' : 'إزالة فيديو محفوظ',
        details: item.meta?.title || meta?.title || 'فيديو',
        meta: {
            videoId,
            saved: item.saved,
        },
    });
    return item;
}

export function addVideoComment(videoId: string, text: string): LocalVideoInteractions {
    const cleanText = text.trim();
    if (!cleanText) return getVideoInteractions(videoId);

    const state = readState();
    const item = ensureVideoState(state, videoId);
    item.comments.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: cleanText,
        createdAt: Date.now(),
    });
    item.comments = item.comments.slice(0, 40);
    writeState(state);
    logInteraction({
        type: 'video_comment',
        category: 'video',
        title: 'تعليق على فيديو',
        details: item.meta?.title || 'فيديو',
        meta: {
            videoId,
            commentLength: cleanText.length,
        },
    });
    return item;
}
