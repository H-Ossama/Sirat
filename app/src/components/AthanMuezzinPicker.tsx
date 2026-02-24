/**
 * AthanMuezzinPicker
 * Full-screen bottom-sheet that lets the user:
 *  – browse available muezzins
 *  – preview (play / stop) any muezzin
 *  – see download status per muezzin
 *  – automatically download on selection
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    MUEZZINS,
    Muezzin,
    DownloadStatus,
    getDownloadStatus,
    downloadMuezzin,
    deleteMuezzinCache,
    previewMuezzin,
    stopPreview,
    subscribeToPreview,
    subscribeToDlProgress,
} from '../services/athanService';

interface Props {
    selectedId: string;
    onSelect: (id: string) => void;
    onClose: () => void;
    isDark: boolean;
}

/* tiny button icon helpers */
function PlayIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M8 5v14l11-7z" />
        </svg>
    );
}
function StopIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
    );
}
function CloudDownloadIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A6.002 6.002 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z" />
        </svg>
    );
}
function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
    );
}
function ErrorIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
    );
}
function SpinnerIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin text-blue-400">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" strokeLinecap="round" />
        </svg>
    );
}
function TrashIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M9 3v1H4v2h1l1 14h12l1-14h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z" />
        </svg>
    );
}

// ─ MuezzinRow ──────────────────────────────────────────────────────────────

interface RowProps {
    muezzin: Muezzin;
    isSelected: boolean;
    isPreviewing: boolean;
    dlStatus: DownloadStatus;
    dlProgress: number;  // 0-100 only meaningful when downloading
    isDark: boolean;
    onSelect: () => void;
    onPreview: () => void;
    onDelete: () => void;
}

const MuezzinRow: React.FC<RowProps> = ({
    muezzin, isSelected, isPreviewing, dlStatus, dlProgress, isDark,
    onSelect, onPreview, onDelete,
}) => {
    const base = isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900';
    const border = isSelected
        ? 'border-2 border-yellow-400'
        : isDark ? 'border border-gray-700' : 'border border-gray-200';

    return (
        <div
            onClick={onSelect}
            className={`flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer transition-all ${base} ${border}`}
        >
            {/* selection dot */}
            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                isSelected ? 'border-yellow-400 bg-yellow-400' : isDark ? 'border-gray-500' : 'border-gray-300'
            }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            {/* info */}
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-tight">{muezzin.nameAr}</div>
                <div className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {muezzin.description}
                </div>
                {/* download progress bar */}
                {dlStatus === 'downloading' && (
                    <div className="mt-1 h-1 rounded-full bg-gray-300 overflow-hidden">
                        <div
                            className="h-full bg-blue-400 transition-all duration-200 rounded-full"
                            style={{ width: `${dlProgress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* size */}
            {muezzin.sizeMB && (
                <span className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {muezzin.sizeMB}
                </span>
            )}

            {/* download status badge */}
            {muezzin.cdnUrl && (
                <div className="flex-shrink-0 flex items-center gap-1">
                    {dlStatus === 'none' && (
                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <CloudDownloadIcon />
                        </span>
                    )}
                    {dlStatus === 'downloading' && <SpinnerIcon />}
                    {dlStatus === 'downloaded' && (
                        <>
                            <CheckIcon />
                            <button
                                onClick={e => { e.stopPropagation(); onDelete(); }}
                                className={`p-1 rounded ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                                title="حذف التنزيل"
                            >
                                <TrashIcon />
                            </button>
                        </>
                    )}
                    {dlStatus === 'error' && <ErrorIcon />}
                </div>
            )}

            {/* preview button */}
            {muezzin.cdnUrl && (
                <button
                    onClick={e => { e.stopPropagation(); onPreview(); }}
                    className={`flex-shrink-0 p-2 rounded-full transition-colors ${
                        isPreviewing
                            ? 'bg-yellow-400 text-gray-900'
                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={isPreviewing ? 'إيقاف المعاينة' : 'معاينة الأذان'}
                >
                    {isPreviewing ? <StopIcon /> : <PlayIcon />}
                </button>
            )}
        </div>
    );
};

// ─ AthanMuezzinPicker ──────────────────────────────────────────────────────

const AthanMuezzinPicker: React.FC<Props> = ({ selectedId, onSelect, onClose, isDark }) => {
    const [dlStatuses, setDlStatuses] = useState<Record<string, DownloadStatus>>(() => {
        const map: Record<string, DownloadStatus> = {};
        MUEZZINS.forEach(m => { map[m.id] = getDownloadStatus(m.id); });
        return map;
    });
    const [dlProgress, setDlProgress] = useState<Record<string, number>>({});
    const [previewingId, setPreviewingId] = useState<string | null>(null);

    // subscribe to download progress
    useEffect(() => {
        const unsub = subscribeToDlProgress((id, pct, status) => {
            setDlStatuses(prev => ({ ...prev, [id]: status }));
            setDlProgress(prev => ({ ...prev, [id]: pct }));
        });
        return unsub;
    }, []);

    // subscribe to preview state
    useEffect(() => {
        const unsub = subscribeToPreview(id => setPreviewingId(id));
        return unsub;
    }, []);

    // stop preview when picker closes
    useEffect(() => () => stopPreview(), []);

    const handleSelect = useCallback((muezzin: Muezzin) => {
        onSelect(muezzin.id);
        // auto-download if not already done
        if (muezzin.cdnUrl && getDownloadStatus(muezzin.id) === 'none') {
            downloadMuezzin(muezzin).catch(console.warn);
        }
    }, [onSelect]);

    const handleDelete = useCallback(async (muezzin: Muezzin) => {
        await deleteMuezzinCache(muezzin);
        setDlStatuses(prev => ({ ...prev, [muezzin.id]: 'none' }));
    }, []);

    const overlay = isDark ? 'bg-black/60' : 'bg-black/40';
    const sheet = isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';

    return (
        <div
            className={`fixed inset-0 z-50 flex items-end ${overlay}`}
            onClick={onClose}
        >
            <div
                className={`w-full max-h-[85vh] rounded-t-2xl overflow-hidden flex flex-col ${sheet}`}
                onClick={e => e.stopPropagation()}
            >
                {/* header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                    <button onClick={onClose} className={`p-1 rounded-full ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M19 11H7.83l4.88-4.88c.39-.39.39-1.03 0-1.42-.39-.39-1.02-.39-1.41 0l-6.59 6.59c-.39.39-.39 1.02 0 1.41l6.59 6.59c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L7.83 13H19c.55 0 1-.45 1-1s-.45-1-1-1z" />
                        </svg>
                    </button>
                    <h2 className="text-base font-bold font-amiri">اختر المؤذن</h2>
                    <div className="w-8" />
                </div>

                {/* note */}
                <div className={`px-4 py-2 text-xs ${isDark ? 'text-gray-400 bg-gray-800' : 'text-gray-500 bg-gray-100'}`}>
                    اضغط على زر التشغيل للاستماع · سيتم تنزيل المؤذن المختار تلقائياً للتشغيل بدون إنترنت
                </div>

                {/* list */}
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {MUEZZINS.map(m => (
                        <MuezzinRow
                            key={m.id}
                            muezzin={m}
                            isSelected={selectedId === m.id}
                            isPreviewing={previewingId === m.id}
                            dlStatus={dlStatuses[m.id] ?? 'none'}
                            dlProgress={dlProgress[m.id] ?? 0}
                            isDark={isDark}
                            onSelect={() => handleSelect(m)}
                            onPreview={() => previewMuezzin(m)}
                            onDelete={() => handleDelete(m)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AthanMuezzinPicker;
