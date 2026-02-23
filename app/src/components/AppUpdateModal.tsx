import React from 'react';
import { useTheme } from './ThemeContext';
import type { AppUpdateRelease } from '../services/updateService';

export type UpdateModalStage = 'available' | 'permission' | 'progress' | 'error';

interface AppUpdateModalProps {
    open: boolean;
    release: AppUpdateRelease | null;
    stage: UpdateModalStage;
    progress: number;
    message: string;
    onUpdateNow: () => void;
    onLater: () => void;
    onOpenPermission: () => void;
    onRetry: () => void;
    onCloseError: () => void;
}

export function AppUpdateModal({
    open,
    release,
    stage,
    progress,
    message,
    onUpdateNow,
    onLater,
    onOpenPermission,
    onRetry,
    onCloseError,
}: AppUpdateModalProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';

    if (!open || !release) return null;

    const cardClass = isDark
        ? 'bg-[#0f1728] border border-white/10 text-white'
        : 'bg-white border border-slate-200 text-slate-900';

    const mutedClass = isDark ? 'text-white/70' : 'text-slate-600';

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6" dir="rtl">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <div className={`relative w-full max-w-md rounded-3xl p-5 shadow-2xl animate-fade-in-scale ${cardClass}`}>
                {stage === 'available' && (
                    <>
                        <h3 className="text-xl font-black mb-2">تحديث جديد متاح</h3>
                        <p className={`text-sm leading-7 mb-2 ${mutedClass}`}>
                            اكتشفنا إصدارًا جديدًا ({release.versionTag}).
                        </p>
                        <p className={`text-xs leading-6 mb-5 ${mutedClass}`}>
                            يمكنك التحديث الآن أو التأجيل إلى الغد.
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={onLater}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 ${isDark ? 'bg-white/10 text-white/85' : 'bg-slate-100 text-slate-700'
                                    }`}
                            >
                                لاحقًا
                            </button>
                            <button
                                onClick={onUpdateNow}
                                className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 bg-gold-500 text-white"
                            >
                                تحديث الآن
                            </button>
                        </div>
                    </>
                )}

                {stage === 'permission' && (
                    <>
                        <h3 className="text-xl font-black mb-2">إذن تثبيت التحديث</h3>
                        <p className={`text-sm leading-7 mb-5 ${mutedClass}`}>
                            نحتاج إذن "تثبيت تطبيقات غير معروفة" حتى يتم تثبيت التحديث تلقائيًا بعد تنزيله.
                        </p>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={onLater}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 ${isDark ? 'bg-white/10 text-white/85' : 'bg-slate-100 text-slate-700'
                                    }`}
                            >
                                لاحقًا
                            </button>
                            <button
                                onClick={onOpenPermission}
                                className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 bg-gold-500 text-white"
                            >
                                منح الإذن والمتابعة
                            </button>
                        </div>
                    </>
                )}

                {stage === 'progress' && (
                    <>
                        <h3 className="text-xl font-black mb-2">جاري التحديث</h3>
                        <p className={`text-sm leading-7 mb-4 ${mutedClass}`}>
                            {message || 'جاري تنزيل وتثبيت التحديث...'}
                        </p>

                        <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                            <div
                                className="h-full bg-gold-500 transition-all duration-200"
                                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                            />
                        </div>

                        <div className="mt-3 text-center text-sm font-bold text-gold-500">
                            {progress >= 0 ? `${Math.max(0, Math.min(100, progress))}%` : '...'}
                        </div>
                    </>
                )}

                {stage === 'error' && (
                    <>
                        <h3 className="text-xl font-black mb-2">تعذر التحديث</h3>
                        <p className={`text-sm leading-7 mb-5 ${mutedClass}`}>
                            {message || 'حدث خطأ أثناء تنزيل أو تثبيت التحديث.'}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={onCloseError}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 ${isDark ? 'bg-white/10 text-white/85' : 'bg-slate-100 text-slate-700'
                                    }`}
                            >
                                إغلاق
                            </button>
                            <button
                                onClick={onRetry}
                                className="px-4 py-2 rounded-xl text-sm font-bold transition active:scale-95 bg-gold-500 text-white"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
