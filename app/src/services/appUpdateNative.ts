import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export type NativeUpdatePhase =
    | 'downloading'
    | 'installing'
    | 'installer_opened'
    | 'error';

export interface NativeUpdateProgress {
    phase: NativeUpdatePhase;
    progress: number;
    message: string;
}

interface StartUpdateOptions {
    downloadUrl: string;
    fileName?: string;
}

interface StartUpdateResult {
    started: boolean;
    requiresInstallPermission: boolean;
    message?: string;
}

interface CanInstallResult {
    canInstall: boolean;
}

interface OpenPermissionResult {
    opened: boolean;
}

export interface AppUpdateNativePlugin {
    startUpdate(options: StartUpdateOptions): Promise<StartUpdateResult>;
    canInstallPackages(): Promise<CanInstallResult>;
    openInstallPermissionSettings(): Promise<OpenPermissionResult>;
    addListener(eventName: 'updateProgress', listenerFunc: (event: NativeUpdateProgress) => void): Promise<PluginListenerHandle>;
    removeAllListeners(): Promise<void>;
}

const AppUpdateNative = registerPlugin<AppUpdateNativePlugin>('AppUpdate');

export default AppUpdateNative;