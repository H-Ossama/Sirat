import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeftIcon, CompassIcon } from './Icons';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { useTheme } from './ThemeContext';
import { Motion } from '@capacitor/motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface QiblaScreenProps {
    onBack: () => void;
}

export function QiblaScreen({ onBack }: QiblaScreenProps) {
    const { theme } = useTheme();
    const { prayerData, locationName } = usePrayerTimes();
    const [rotation, setRotation] = useState(0);
    const [isNativeActive, setIsNativeActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const qiblaDirection = prayerData?.qiblaDirection || 135.5;

    const lastHeading = useRef(0);
    const initialized = useRef(false);

    // Vibration feedback when pointing to Kaaba
    const lastVibrateTime = useRef(0);
    const vibrateFeedback = useCallback(async () => {
        const now = Date.now();
        // Prevent constant vibration - debounced to once every 1.5 seconds
        if (now - lastVibrateTime.current < 1500) return;

        try {
            await Haptics.impact({ style: ImpactStyle.Heavy });
            lastVibrateTime.current = now;
        } catch (e) {
            // Ignore if haptics fail
        }
    }, []);

    const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>(() => {
        // Android doesn't need explicit request for deviceorientation, but needs a gesture for some policies
        return /Android/i.test(navigator.userAgent) ? 'granted' : 'prompt';
    });

    useEffect(() => {
        if (permissionStatus !== 'granted') return;

        let handleOrientation = (event: any) => {
            let heading = 0;

            if (event.webkitCompassHeading !== undefined) {
                heading = event.webkitCompassHeading;
            } else if (event.alpha !== null) {
                heading = 360 - event.alpha;
            }

            if (heading !== 0 || initialized.current) {
                if (!initialized.current) {
                    lastHeading.current = heading;
                    initialized.current = true;
                    setIsNativeActive(true);
                }

                // Smooth rotation using shortest path
                let diff = heading - lastHeading.current;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;

                // Adaptive smoothing: faster when far, smoother when close
                const smoothingFactor = Math.abs(diff) > 20 ? 0.25 : 0.12;
                lastHeading.current = lastHeading.current + diff * smoothingFactor;
                lastHeading.current = (lastHeading.current + 360) % 360;

                setRotation(-lastHeading.current);

                // Check for Qibla alignment (within 3 degrees)
                const currentAngle = (-lastHeading.current + 360) % 360;
                const normalizedQibla = (qiblaDirection + 360) % 360;
                const angleDiff = Math.abs(currentAngle - normalizedQibla);
                const finalDiff = angleDiff > 180 ? 360 - angleDiff : angleDiff;

                if (finalDiff < 3) {
                    vibrateFeedback();
                }
            }
        };

        const isAndroid = /Android/i.test(navigator.userAgent);
        const eventName = isAndroid ? 'deviceorientationabsolute' : 'deviceorientation';

        window.addEventListener(eventName as any, handleOrientation, true);
        setIsNativeActive(true);

        return () => {
            window.removeEventListener(eventName as any, handleOrientation, true);
        };
    }, [permissionStatus, qiblaDirection]);

    const requestPermission = async () => {
        try {
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                setPermissionStatus(permission === 'granted' ? 'granted' : 'denied');
            } else {
                // On Android/PC, just simulate grant
                setPermissionStatus('granted');
            }
        } catch (err) {
            console.error('Permission error:', err);
            setError('تعذر تفعيل الحساسات.');
        }
    };

    const isDark = theme !== 'light';

    return (
        <div className={`h-full flex flex-col overflow-hidden transition-colors duration-700 ${isDark ? 'bg-[#04070d] text-white' : 'bg-[#f4f7ff] text-slate-900'}`}>
            {/* Background Glow Overlay */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000 ${isDark ? 'bg-gold-500/5' : 'bg-gold-200/20'}`} />
                <div className={`absolute top-1/2 -left-48 w-96 h-96 rounded-full blur-[120px] transition-all duration-1000 ${isDark ? 'bg-blue-500/5' : 'bg-blue-200/10'}`} />
            </div>

            {/* Header */}
            <div className={`px-6 pt-12 pb-6 sticky top-0 z-20 backdrop-blur-2xl border-b transition-all duration-500 ${isDark ? 'bg-[#04070d]/80 border-white/[0.03]' : 'bg-white/70 border-slate-200/40'}`}>
                <div className="flex items-center justify-between">
                    <button
                        onClick={onBack}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 border ${isDark ? 'bg-white/[0.03] border-white/10 hover:bg-white/10' : 'bg-white shadow-sm border-slate-100 hover:shadow-md'}`}
                    >
                        <ChevronLeftIcon className="w-6 h-6 rotate-180" />
                    </button>
                    <div className="text-center">
                        <h1 className={`text-2xl font-amiri font-bold tracking-tight ${isDark ? 'text-gold-200' : 'text-slate-900'}`}>القِبْلَة</h1>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            <div className={`w-1 h-1 rounded-full ${isNativeActive ? 'bg-emerald-500 shadow-[0_0_8px_theme(colors.emerald.500)]' : 'bg-red-500'}`} />
                            <p className={`text-[9px] font-bold uppercase tracking-[0.2em] opacity-40 ${isDark ? 'text-white' : 'text-slate-500'}`}>Native Precision</p>
                        </div>
                    </div>
                    <div className="w-12" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto hide-scrollbar px-6 relative z-10">
                {/* Location Detail Card */}
                <div className="mt-8 mb-6">
                    <div className={`relative p-8 rounded-[2.5rem] overflow-hidden border transition-all duration-500 ${isDark
                        ? 'bg-gradient-to-br from-white/[0.04] to-transparent border-white/[0.06] shadow-2xl shadow-black/50'
                        : 'bg-white border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)]'
                        }`}>
                        {/* Internal Glows */}
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none transition-all ${isDark ? 'bg-gold-500/10' : 'bg-gold-100'}`} />

                        <div className="relative z-10 grid grid-cols-2 gap-4" dir="rtl">
                            <div className="flex flex-col gap-1">
                                <p className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${isDark ? 'text-gold-200' : 'text-slate-500'}`}>موقعك الحالي</p>
                                <h3 className={`text-xl font-amiri font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>{locationName}</h3>
                                <div className="flex items-center gap-1 mt-1">
                                    <div className="w-1 h-1 rounded-full bg-gold-500" />
                                    <span className={`text-[9px] font-bold opacity-30 ${isDark ? 'text-white' : 'text-slate-500'}`}>GPS Active</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <p className={`text-[10px] font-bold uppercase tracking-widest text-left opacity-40 ${isDark ? 'text-gold-200' : 'text-slate-500'}`}>زاوية القبلة</p>
                                <div className="flex flex-col items-end">
                                    <span className={`text-3xl font-en font-black leading-none ${isDark ? 'text-gold-300' : 'text-gold-600'}`}>
                                        {qiblaDirection.toFixed(1)}°
                                    </span>
                                    <span className={`text-[10px] font-bold mt-1 opacity-20 ${isDark ? 'text-white' : 'text-slate-500'}`}>Magnetic Heading</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Compass UI */}
                <div className="relative flex flex-col items-center justify-center py-10 scale-110 sm:scale-100">
                    {/* Background Aura */}
                    <div className={`absolute w-80 h-80 rounded-full blur-[100px] transition-all duration-1000 ${isNativeActive ? (isDark ? 'bg-gold-500/15' : 'bg-gold-300/30') : 'bg-red-500/5'}`} />

                    {/* Outer Decorative Ring 1 */}
                    <div className={`absolute w-[330px] h-[330px] rounded-full border border-dashed transition-all duration-1000 ${isDark ? 'border-white/[0.05]' : 'border-slate-200'}`} />

                    {/* Outer Decorative Ring 2 (Glass Ring) */}
                    <div className={`absolute w-[300px] h-[300px] rounded-full border transition-all duration-1000 ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white shadow-xl shadow-slate-200/50 border-slate-100'}`} />

                    {/* Compass Container */}
                    <div className="relative w-72 h-72">
                        {/* Rotating Compass Body */}
                        <div
                            className="absolute inset-0 transition-transform duration-300 ease-out"
                            style={{ transform: `rotate(${rotation}deg)` }}
                        >
                            {/* Detailed Degrees Ticks */}
                            {Array.from({ length: 72 }).map((_, i) => (
                                <div key={i} className="absolute inset-2 flex justify-center" style={{ transform: `rotate(${i * 5}deg)` }}>
                                    <div className={`w-0.5 rounded-full transition-colors ${i % 18 === 0 ? 'bg-gold-500 h-6 w-0.5' : i % 2 === 0 ? 'bg-gray-500/30 h-3' : 'bg-gray-500/10 h-1.5'}`} />
                                </div>
                            ))}

                            {/* Cardinal Directions */}
                            <div className="absolute inset-0 flex justify-center pt-10">
                                <span className={`text-2xl font-en font-black transition-colors ${isDark ? 'text-white' : 'text-slate-800'}`}>N</span>
                            </div>
                            <div className="absolute inset-0 flex items-end justify-center pb-10">
                                <span className="text-sm font-bold opacity-10">S</span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-start pl-10">
                                <span className="text-sm font-bold opacity-10">W</span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-end pr-10">
                                <span className="text-sm font-bold opacity-10">E</span>
                            </div>

                            {/* Qibla Indicator Line */}
                            <div
                                className="absolute inset-0 flex flex-col items-center"
                                style={{ transform: `rotate(${qiblaDirection}deg)` }}
                            >
                                {/* The Pointer */}
                                <div className="z-10 relative flex flex-col items-center">
                                    <div className="w-0 h-0 border-l-[18px] border-r-[18px] border-b-[45px] border-l-transparent border-r-transparent border-b-gold-500 drop-shadow-[0_0_15px_rgba(212,165,40,0.8)]" />
                                    <div className="w-1 h-32 bg-gradient-to-b from-gold-500/80 via-gold-500/20 to-transparent -mt-1" />
                                </div>

                                {/* Floating Kabah - Visual feedback enhanced */}
                                <div className="mt-6 flex flex-col items-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 blur-2xl bg-gold-500/40 animate-pulse" />
                                        <div className="text-6xl drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)] animate-float relative z-10">🕋</div>
                                    </div>
                                    <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.4em] text-gold-500 opacity-60">القبلة</p>
                                </div>
                            </div>
                        </div>

                        {/* Center Hub (Static Cover over rotation axis) */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center border shadow-inner transition-all duration-700 ${isDark ? 'bg-[#0a0f1a] border-white/10 shadow-black' : 'bg-white border-slate-100 shadow-slate-200'}`}>
                                <div className={`w-4 h-4 rounded-full transition-all duration-1000 ${isNativeActive ? 'bg-gold-500 shadow-[0_0_20px_theme(colors.gold.500)]' : 'bg-slate-300'}`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status & Help UI */}
                <div className="mt-14 mb-32 space-y-5">
                    {permissionStatus === 'prompt' && (
                        <button
                            onClick={requestPermission}
                            className={`group w-full p-8 rounded-[2.5rem] border-2 border-dashed relative overflow-hidden transition-all active:scale-[0.97] ${isDark ? 'bg-gold-500/5 border-gold-500/20 text-gold-300' : 'bg-gold-50 border-gold-200 text-gold-800'}`}
                        >
                            <div className="absolute inset-0 bg-gold-500/5 group-hover:scale-110 transition-transform duration-700" />
                            <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                                <div className="w-16 h-16 rounded-3xl bg-gold-500 flex items-center justify-center shadow-xl shadow-gold-500/40 group-hover:rotate-12 transition-transform duration-500">
                                    <CompassIcon className="w-8 h-8 text-white" />
                                </div>
                                <div className="text-center">
                                    <h4 className="font-bold text-lg mb-1">تنشيط البوصلة الذكية</h4>
                                    <p className="text-[12px] opacity-70">يجب السماح بالوصول للحساسات لتعمل البوصلة</p>
                                </div>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Aesthetic Bottom Fade */}
            <div className={`fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-20 transition-all duration-1000 ${isDark ? 'bg-gradient-to-t from-[#04070d] to-transparent opacity-80' : 'bg-gradient-to-t from-white to-transparent opacity-90'}`} />
        </div>
    );
}
