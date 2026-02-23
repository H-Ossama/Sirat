export type ActivityCategory =
    | 'navigation'
    | 'deed'
    | 'video'
    | 'quran'
    | 'hadith'
    | 'tasbih'
    | 'settings'
    | 'system'
    | 'other';

export interface ActivityLogEntry {
    id: string;
    type: string;
    category: ActivityCategory;
    title: string;
    details?: string;
    screen?: string;
    at: number;
    startedAt?: number;
    endedAt?: number;
    durationSeconds?: number;
    meta?: Record<string, string | number | boolean>;
}

interface LogActivityInput {
    type: string;
    category: ActivityCategory;
    title: string;
    details?: string;
    screen?: string;
    at?: number;
    startedAt?: number;
    endedAt?: number;
    durationSeconds?: number;
    meta?: Record<string, string | number | boolean>;
}

const STORAGE_KEY = 'app_activity_log_v1';
const MAX_ENTRIES = 6000;

function readState(): ActivityLogEntry[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as ActivityLogEntry[];
    } catch {
        return [];
    }
}

function writeState(entries: ActivityLogEntry[]): void {
    const next = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function logActivity(input: LogActivityInput): ActivityLogEntry {
    const at = input.at ?? Date.now();
    const entry: ActivityLogEntry = {
        id: makeId(),
        type: input.type,
        category: input.category,
        title: input.title,
        details: input.details,
        screen: input.screen,
        at,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        durationSeconds: input.durationSeconds,
        meta: input.meta,
    };

    const state = readState();
    state.push(entry);
    writeState(state);
    return entry;
}

export function logScreenSession(screen: string, startedAtMs: number, endedAtMs: number): ActivityLogEntry | null {
    const durationSeconds = Math.max(0, Math.round((endedAtMs - startedAtMs) / 1000));
    if (durationSeconds < 1) return null;

    return logActivity({
        type: 'screen_session',
        category: 'navigation',
        title: `جلسة استخدام: ${screen}`,
        details: `استخدمت شاشة ${screen}`,
        screen,
        at: endedAtMs,
        startedAt: startedAtMs,
        endedAt: endedAtMs,
        durationSeconds,
    });
}

export function logInteraction(input: Omit<LogActivityInput, 'at'> & { at?: number }): ActivityLogEntry {
    return logActivity(input);
}

export function clearActivityLog(): void {
    localStorage.removeItem(STORAGE_KEY);
}

export function toDateKey(timestamp: number): string {
    const d = new Date(timestamp);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function getActivitiesByDate(dateKey: string): ActivityLogEntry[] {
    return readState()
        .filter(item => toDateKey(item.at) === dateKey)
        .sort((a, b) => a.at - b.at);
}

export function getDailyActivitySummary(dateKey: string): {
    totalDurationSeconds: number;
    interactionsCount: number;
    sessionsCount: number;
    entriesCount: number;
} {
    const entries = getActivitiesByDate(dateKey);
    let totalDurationSeconds = 0;
    let sessionsCount = 0;

    for (const entry of entries) {
        if ((entry.durationSeconds ?? 0) > 0) {
            totalDurationSeconds += entry.durationSeconds ?? 0;
            sessionsCount += 1;
        }
    }

    return {
        totalDurationSeconds,
        interactionsCount: entries.length - sessionsCount,
        sessionsCount,
        entriesCount: entries.length,
    };
}

export function formatDurationArabic(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;

    if (hours > 0) {
        return `${hours}س ${minutes}د`;
    }
    if (minutes > 0) {
        return `${minutes}د ${seconds}ث`;
    }
    return `${seconds}ث`;
}
