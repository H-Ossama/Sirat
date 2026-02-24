import { useEffect, useRef, useState, useCallback } from 'react';
import { AthanPlaybackState, stopAthan, muteAthan, getAthanSettings, toggleGlobalMute } from '../services/athanService';
import { useTheme } from './ThemeContext';

interface AthanScreenProps {
    state: AthanPlaybackState;
    onClose: () => void;
}

// ─── Style 1: Mosque (Classic Dark) ──────────────────────────────────────────
export function MosqueStyle({ state, isDark, onMute, onStop, longPressProps }: {
    state: AthanPlaybackState;
    isDark: boolean;
    onMute: () => void;
    onStop: () => void;
    longPressProps: ReturnType<typeof useLongPress>;
}) {
    return (
        <div
            className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none bg-cover bg-center"
            style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1080&auto=format&fit=crop')`,
            }}
            {...longPressProps}
        >
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Top section - Prayer name */}
            <div className="flex-1 flex flex-col items-center justify-center pt-16 gap-4 z-10 w-full px-6">
                <div className="flex items-center gap-4 w-full justify-center">
                    <div className="h-[1px] flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-white/50" />
                    <p className="text-[14px] font-amiri tracking-widest text-white/80">الله أكبر • الله أكبر</p>
                    <div className="h-[1px] flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-white/50" />
                </div>

                <div className="text-center px-8 mt-2">
                    <h1 className="text-[68px] font-amiri font-bold leading-none drop-shadow-xl text-white">
                        {state.prayerNameAr}
                    </h1>
                    <p className="text-[20px] font-amiri mt-3 font-medium tracking-wide text-white/80">حان وقت الصلاة</p>
                </div>

                {/* Elegant Audio Visualizer */}
                <div className="flex items-center justify-center gap-1.5 h-12 mt-8">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 rounded-full bg-white/80"
                            style={{
                                height: '20%',
                                animation: `premiumWave 1.2s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.15}s`,
                                opacity: 0.8 - Math.abs(i - 3) * 0.15
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Muezzin name */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 text-center">
                <div className="px-5 py-2 rounded-full backdrop-blur-md border shadow-sm flex items-center gap-2 bg-black/20 border-white/20 text-white/90">
                    <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-[13px] font-amiri font-medium tracking-wide">{state.muezzin.nameAr}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-30 pb-10 px-6">
                <div className="flex items-center gap-4 justify-center max-w-md mx-auto">
                    <button
                        onClick={onMute}
                        className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 backdrop-blur-xl border active:scale-95 transition-all duration-200 bg-black/20 border-white/15 hover:bg-black/30 shadow-lg"
                    >
                        <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        <span className="text-[10px] font-bold text-white/60">كتم</span>
                    </button>

                    <button
                        onClick={onStop}
                        className="flex-1 h-16 rounded-2xl flex items-center justify-center gap-3 backdrop-blur-xl border active:scale-95 transition-all duration-200 shadow-xl bg-white/20 border-white/30 hover:bg-white/30 text-white"
                    >
                        <span className="font-amiri font-bold text-[17px]">إيقاف الأذان</span>
                    </button>
                </div>
                <p className="text-center text-[11px] mt-4 font-amiri tracking-wide text-white/40">اضغط مطولاً في أي مكان لكتم الصوت</p>
            </div>

            <style>{`
                @keyframes premiumWave {
                    0% { height: 20%; }
                    100% { height: 100%; }
                }
            `}</style>
        </div>
    );
}

// ─── Style 2: Dawn / Fajr (Nature Gradient) ──────────────────────────────────
export function DawnStyle({ state, isDark, onMute, onStop, longPressProps }: {
    state: AthanPlaybackState;
    isDark: boolean;
    onMute: () => void;
    onStop: () => void;
    longPressProps: ReturnType<typeof useLongPress>;
}) {
    return (
        <div
            className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none bg-cover bg-center"
            style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1080&auto=format&fit=crop')`,
            }}
            {...longPressProps}
        >
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Muezzin Badge */}
            <div className="w-full pt-12 px-6 flex justify-center z-20">
                <div className="px-5 py-2 rounded-full backdrop-blur-md border border-white/20 bg-black/20 text-white/90 shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-[13px] font-amiri font-medium tracking-wide">{state.muezzin.nameAr}</span>
                </div>
            </div>

            {/* Prayer Name */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 w-full px-6 mt-[-10vh]">
                <div className="flex items-center gap-4 w-full justify-center mb-4">
                    <div className="h-[1px] flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-white/50" />
                    <p className="text-white/80 text-[15px] font-amiri tracking-widest drop-shadow-md">الله أكبر • الله أكبر</p>
                    <div className="h-[1px] flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-white/50" />
                </div>

                <h1 className="text-[72px] font-amiri font-bold text-white leading-none text-center drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    {state.prayerNameAr}
                </h1>
                
                <p className="text-white/90 text-[20px] font-amiri mt-4 font-medium drop-shadow-md">
                    حان وقت الصلاة
                </p>

                {/* Waveform */}
                <div className="flex items-center justify-center gap-1.5 h-12 mt-10">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div
                            key={i}
                            className="w-1.5 rounded-full bg-white/90"
                            style={{
                                height: '20%',
                                animation: `premiumWave 1.2s ease-in-out infinite alternate`,
                                animationDelay: `${i * 0.15}s`,
                                opacity: 0.8 - Math.abs(i - 3) * 0.15
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 inset-x-0 z-30 pb-10 px-6">
                <div className="flex gap-4 items-center justify-center max-w-md mx-auto">
                    <button onClick={onMute}
                        className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 bg-black/20 backdrop-blur-xl border border-white/15 hover:bg-black/30 active:scale-95 transition-all duration-200">
                        <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        <span className="text-white/60 text-[10px] font-bold">كتم</span>
                    </button>
                    <button onClick={onStop}
                        className="flex-1 h-16 rounded-2xl flex items-center justify-center gap-3 bg-white/20 backdrop-blur-xl border border-white/30 hover:bg-white/30 active:scale-95 transition-all duration-200 shadow-xl">
                        <span className="text-white font-amiri font-bold text-[17px]">إيقاف الأذان</span>
                    </button>
                </div>
                <p className="text-center text-white/40 text-[11px] mt-4 font-amiri tracking-wide">اضغط مطولاً في أي مكان لكتم الصوت</p>
            </div>

            <style>{`
                @keyframes premiumWave {
                    0% { height: 20%; }
                    100% { height: 100%; }
                }
            `}</style>
        </div>
    );
}

// ─── Style 3: Islamic Pattern Image ──────────────────────────────────────
export function GeometryStyle({ state, isDark, onMute, onStop, longPressProps, customImage }: {
    state: AthanPlaybackState;
    isDark: boolean;
    onMute: () => void;
    onStop: () => void;
    longPressProps: ReturnType<typeof useLongPress>;
    customImage?: string;
}) {
    return (
        <div
            className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none bg-cover bg-center"
            style={{
                backgroundImage: `url('${customImage || 'https://plus.unsplash.com/premium_photo-1691031428612-4721f80beff7?q=80&w=1080&auto=format&fit=crop'}')`,
            }}
            {...longPressProps}
        >
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Muezzin Badge */}
            <div className="w-full pt-12 px-6 flex justify-center z-20">
                <div className="px-5 py-2 rounded-full backdrop-blur-md border border-white/20 bg-black/20 text-white/90 shadow-sm flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-[13px] font-amiri font-medium tracking-wide">{state.muezzin.nameAr}</span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 gap-6 w-full px-6">
                <div className="flex items-center gap-4 w-full justify-center">
                    <div className="h-[1px] flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-white/50" />
                    <p className="text-white/80 text-[15px] font-amiri tracking-widest drop-shadow-md">الله أكبر • الله أكبر</p>
                    <div className="h-[1px] flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-white/50" />
                </div>

                <div className="text-center px-10 py-8 rounded-[2.5rem] backdrop-blur-xl border border-white/10 bg-white/5 shadow-2xl w-full max-w-sm">
                    <h1 className="text-[72px] font-amiri font-bold leading-none text-white">
                        {state.prayerNameAr}
                    </h1>
                    <p className="text-[20px] font-amiri mt-4 font-medium text-white/80">
                        حان وقت الصلاة
                    </p>
                </div>

                {/* Elegant Audio rings */}
                <div className="relative flex items-center justify-center w-32 h-32 mt-4">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className="absolute rounded-full border-[1.5px] border-white/40"
                            style={{
                                width: 50 + i * 30,
                                height: 50 + i * 30,
                                animation: `premiumPing ${1.5 + i * 0.2}s cubic-bezier(0.2, 0.8, 0.2, 1) infinite`,
                                animationDelay: `${i * 0.4}s`,
                            }}
                        />
                    ))}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-10 bg-white/20 border border-white/50">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 inset-x-0 z-30 pb-10 px-6">
                <div className="flex gap-4 items-center justify-center max-w-md mx-auto">
                    <button onClick={onMute}
                        className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 bg-black/20 backdrop-blur-xl border border-white/15 hover:bg-black/30 active:scale-95 transition-all duration-200">
                        <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                        <span className="text-white/60 text-[10px] font-bold">كتم</span>
                    </button>
                    <button onClick={onStop}
                        className="flex-1 h-16 rounded-2xl flex items-center justify-center gap-3 bg-white/20 backdrop-blur-xl border border-white/30 hover:bg-white/30 active:scale-95 transition-all duration-200 shadow-xl">
                        <span className="text-white font-amiri font-bold text-[17px]">إيقاف الأذان</span>
                    </button>
                </div>
                <p className="text-center text-white/40 text-[11px] mt-4 font-amiri tracking-wide">
                    اضغط مطولاً في أي مكان لكتم الصوت
                </p>
            </div>

            <style>{`
                @keyframes premiumPing {
                    0% { transform: scale(0.8); opacity: 1; border-width: 2px; }
                    100% { transform: scale(2); opacity: 0; border-width: 0px; }
                }
            `}</style>
        </div>
    );
}

// ─── Long-press hook ──────────────────────────────────────────────────────────
export function useLongPress(onLongPress: () => void, delay = 700) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggeredRef = useRef(false);

    const start = useCallback(() => {
        triggeredRef.current = false;
        timerRef.current = setTimeout(() => {
            triggeredRef.current = true;
            onLongPress();
        }, delay);
    }, [onLongPress, delay]);

    const clear = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    return {
        onTouchStart: start,
        onTouchEnd: clear,
        onMouseDown: start,
        onMouseUp: clear,
        onMouseLeave: clear,
    };
}

// ─── Root Athan Screen ────────────────────────────────────────────────────────
export function AthanScreen({ state, onClose }: AthanScreenProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';
    const [dismissed, setDismissed] = useState(false);

    const settings = getAthanSettings();

    const handleMute = useCallback(() => {
        muteAthan();
        setDismissed(true);
        setTimeout(() => onClose(), 800);
    }, [onClose]);

    const handleStop = useCallback(() => {
        stopAthan();
        onClose();
    }, [onClose]);

    // Long press to mute (quick mute gesture: screen_long)
    const longPressProps = useLongPress(() => {
        if (settings.quickMuteGesture === 'screen_long') {
            handleMute();
        }
    });

    // Volume key handler (custom event dispatched by native plugin or keyboard)
    useEffect(() => {
        const handleVolumeKey = (e: KeyboardEvent | Event) => {
            if (settings.quickMuteGesture === 'volume_double' || settings.quickMuteGesture === 'volume_long') {
                handleMute();
            }
        };
        window.addEventListener('volumedown', handleVolumeKey);
        return () => window.removeEventListener('volumedown', handleVolumeKey);
    }, [handleMute, settings.quickMuteGesture]);

    if (dismissed) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl transition-opacity duration-500 opacity-0">
                <div className="text-white text-2xl font-amiri">تم كتم الأذان</div>
            </div>
        );
    }

    const sharedProps = { state, isDark, onMute: handleMute, onStop: handleStop, longPressProps, customImage: settings.customImage };

    return (
        <div className="fixed inset-0 z-[9999] transition-all duration-300">
            {state.screenStyle === 'mosque' && <MosqueStyle {...sharedProps} />}
            {state.screenStyle === 'dawn' && <DawnStyle {...sharedProps} />}
            {state.screenStyle === 'geometry' && <GeometryStyle {...sharedProps} />}
        </div>
    );
}
