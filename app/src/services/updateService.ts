import { App as CapApp } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import AppUpdateNative, { type NativeUpdateProgress } from './appUpdateNative';

const GITHUB_OWNER = 'H-Ossama';
const GITHUB_REPO = 'Sirat';
const RELEASE_ENDPOINT = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const LATER_REMINDER_NOTIFICATION_ID = 94001;

const UPDATE_LAST_CHECK_AT_KEY = 'update_last_check_at';
const UPDATE_DEFER_RELEASE_ID_KEY = 'update_defer_release_id';
const UPDATE_DEFER_UNTIL_KEY = 'update_defer_until';

export interface AppUpdateRelease {
    releaseId: number;
    versionTag: string;
    title: string;
    notes: string;
    publishedAt: string;
    apkName: string;
    apkUrl: string;
}

export interface UpdateOverview {
    currentVersion: string;
    latestVersion: string;
    latestPublishedAt: string;
    hasApkAsset: boolean;
    hasUpdate: boolean;
}

interface GitHubAsset {
    name: string;
    browser_download_url: string;
    content_type?: string;
}

interface GitHubRelease {
    id: number;
    tag_name: string;
    name: string;
    body: string;
    published_at: string;
    assets: GitHubAsset[];
}

function normalizeVersion(value: string): string {
    return value.trim().replace(/^v/i, '').replace(/\s+/g, '').toLowerCase();
}

function parseVersionParts(value: string): number[] | null {
    const normalized = normalizeVersion(value);
    const match = normalized.match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return null;
    return [
        Number(match[1] ?? 0),
        Number(match[2] ?? 0),
        Number(match[3] ?? 0),
    ];
}

function isReleaseNewer(latest: string, current: string): boolean {
    const latestParts = parseVersionParts(latest);
    const currentParts = parseVersionParts(current);

    if (latestParts && currentParts) {
        for (let i = 0; i < 3; i++) {
            const diff = latestParts[i] - currentParts[i];
            if (diff > 0) return true;
            if (diff < 0) return false;
        }

        const latestNormalized = normalizeVersion(latest);
        const currentNormalized = normalizeVersion(current);

        const latestIsPrerelease = latestNormalized.includes('beta') || latestNormalized.includes('alpha') || latestNormalized.includes('rc');
        const currentIsPrerelease = currentNormalized.includes('beta') || currentNormalized.includes('alpha') || currentNormalized.includes('rc');

        return currentIsPrerelease && !latestIsPrerelease;
    }

    return normalizeVersion(latest) !== normalizeVersion(current);
}

function getDeferredReleaseId(): number | null {
    const raw = localStorage.getItem(UPDATE_DEFER_RELEASE_ID_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function getDeferredUntil(): number {
    const raw = Number(localStorage.getItem(UPDATE_DEFER_UNTIL_KEY) || '0');
    return Number.isFinite(raw) ? raw : 0;
}

function isDeferredNow(releaseId: number): boolean {
    const deferredReleaseId = getDeferredReleaseId();
    const deferredUntil = getDeferredUntil();
    return deferredReleaseId === releaseId && deferredUntil > Date.now();
}

function markCheckNow(): void {
    localStorage.setItem(UPDATE_LAST_CHECK_AT_KEY, String(Date.now()));
}

export function getLastCheckTime(): number {
    return Number(localStorage.getItem(UPDATE_LAST_CHECK_AT_KEY) || '0');
}

function shouldCheckNow(): boolean {
    const lastCheckedAt = Number(localStorage.getItem(UPDATE_LAST_CHECK_AT_KEY) || '0');
    if (!Number.isFinite(lastCheckedAt) || lastCheckedAt <= 0) return true;
    return Date.now() - lastCheckedAt >= CHECK_INTERVAL_MS;
}

function pickApkAsset(assets: GitHubAsset[]): GitHubAsset | null {
    if (!Array.isArray(assets) || assets.length === 0) return null;

    const apkAssets = assets.filter(a => {
        const lower = a.name.toLowerCase();
        return lower.endsWith('.apk') || (a.content_type ?? '').includes('android.package-archive');
    });

    if (apkAssets.length === 0) return null;

    const releasePreferred = apkAssets.find(a => a.name.toLowerCase().includes('release'));
    return releasePreferred ?? apkAssets[0];
}

async function fetchLatestGitHubRelease(): Promise<GitHubRelease> {
    try {
        const response = await fetch(RELEASE_ENDPOINT, {
            headers: {
                Accept: 'application/vnd.github+json',
            },
        });

        if (response.status === 404) {
            throw new Error('لا يوجد إصدارات منشورة بعد');
        }

        if (!response.ok) {
            throw new Error(`فشل التحقق (${response.status})`);
        }

        return await response.json();
    } catch (e: any) {
        if (e.message.indexOf('Failed to fetch') !== -1) {
            throw new Error('فشل الاتصال بالإنترنت');
        }
        throw e;
    }
}

export async function getUpdateOverview(): Promise<UpdateOverview | null> {
    const isNative = isNativeAndroid();
    
    try {
        const [release, appInfo] = await Promise.all([
            fetchLatestGitHubRelease().catch(() => null),
            isNative ? CapApp.getInfo() : Promise.resolve({ version: '1.0.0' }),
        ]);

        if (!release) {
            return {
                currentVersion: appInfo?.version || '1.0.0',
                latestVersion: '---',
                latestPublishedAt: '',
                hasApkAsset: false,
                hasUpdate: false,
            };
        }

        const apkAsset = pickApkAsset(release.assets ?? []);

        return {
            currentVersion: appInfo?.version || '1.0.0',
            latestVersion: release.tag_name || release.name,
            latestPublishedAt: release.published_at,
            hasApkAsset: !!apkAsset,
            hasUpdate: !!apkAsset && isReleaseNewer(release.tag_name || release.name, appInfo?.version || '0.0.0'),
        };
    } catch (e) {
        console.error('Update overview check failed:', e);
        return null;
    }
}

export function isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function checkForAppUpdateIfDue(force = false): Promise<AppUpdateRelease | null> {
    if (!isNativeAndroid()) {
        return null;
    }

    if (!force && !shouldCheckNow()) {
        return null;
    }

    markCheckNow();

    const [release, appInfo] = await Promise.all([
        fetchLatestGitHubRelease(),
        CapApp.getInfo(),
    ]);

    const apkAsset = pickApkAsset(release.assets ?? []);
    if (!apkAsset) {
        return null;
    }

    const isNewer = isReleaseNewer(release.tag_name || release.name, appInfo.version);
    if (!isNewer) {
        return null;
    }

    if (isDeferredNow(release.id)) {
        return null;
    }

    return {
        releaseId: release.id,
        versionTag: release.tag_name || release.name,
        title: release.name || release.tag_name,
        notes: release.body || '',
        publishedAt: release.published_at,
        apkName: apkAsset.name,
        apkUrl: apkAsset.browser_download_url,
    };
}

export async function postponeUpdateToTomorrow(update: AppUpdateRelease): Promise<void> {
    const remindAt = Date.now() + CHECK_INTERVAL_MS;
    localStorage.setItem(UPDATE_DEFER_RELEASE_ID_KEY, String(update.releaseId));
    localStorage.setItem(UPDATE_DEFER_UNTIL_KEY, String(remindAt));

    try {
        await LocalNotifications.cancel({ notifications: [{ id: LATER_REMINDER_NOTIFICATION_ID }] });
        await LocalNotifications.schedule({
            notifications: [
                {
                    id: LATER_REMINDER_NOTIFICATION_ID,
                    title: '🔄 تحديث جديد متاح',
                    body: `يوجد إصدار جديد (${update.versionTag}) من تطبيق Sirat.`,
                    schedule: { at: new Date(remindAt) },
                    channelId: 'reminders',
                    smallIcon: 'ic_stat_icon',
                    iconColor: '#d4a520',
                    extra: { screen: 'home' },
                },
            ],
        });
    } catch {
        // Ignore if notifications are unavailable.
    }
}

export async function clearDeferredUpdateReminder(): Promise<void> {
    localStorage.removeItem(UPDATE_DEFER_RELEASE_ID_KEY);
    localStorage.removeItem(UPDATE_DEFER_UNTIL_KEY);
    try {
        await LocalNotifications.cancel({ notifications: [{ id: LATER_REMINDER_NOTIFICATION_ID }] });
    } catch {
        // Ignore.
    }
}

export async function canInstallAppPackages(): Promise<boolean> {
    if (!isNativeAndroid()) return false;
    try {
        const result = await AppUpdateNative.canInstallPackages();
        return !!result.canInstall;
    } catch {
        return false;
    }
}

export async function openInstallPermissionSettings(): Promise<void> {
    if (!isNativeAndroid()) return;
    await AppUpdateNative.openInstallPermissionSettings();
}

export async function startAppUpdateDownload(update: AppUpdateRelease): Promise<{ started: boolean; requiresInstallPermission: boolean; message?: string }> {
    if (!isNativeAndroid()) {
        return { started: false, requiresInstallPermission: false, message: 'Android only' };
    }

    return AppUpdateNative.startUpdate({
        downloadUrl: update.apkUrl,
        fileName: update.apkName,
    });
}

export async function listenToNativeUpdateProgress(
    callback: (event: NativeUpdateProgress) => void,
): Promise<PluginListenerHandle> {
    return AppUpdateNative.addListener('updateProgress', callback);
}