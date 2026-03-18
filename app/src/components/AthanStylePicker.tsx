import React, { useState, useCallback } from 'react';
import { MosqueStyle, DawnStyle, GeometryStyle, useLongPress } from './AthanScreen';
import { MUEZZINS, AthanPlaybackState } from '../services/athanService';

interface AthanStylePickerProps {
    currentStyle: 'mosque' | 'dawn' | 'geometry';
    currentCustomImage?: string;
    isDark: boolean;
    onSave: (style: 'mosque' | 'dawn' | 'geometry', customImage?: string) => void;
    onClose: () => void;
}

const STYLES = [
    { id: 'mosque' as const, nameAr: 'النمط 1' },
    { id: 'dawn' as const, nameAr: 'النمط 2' },
    { id: 'geometry' as const, nameAr: 'النمط 3' },
];

export default function AthanStylePicker({ currentStyle, currentCustomImage, isDark, onSave, onClose }: AthanStylePickerProps) {
    const [index, setIndex] = useState(() => {
        const idx = STYLES.findIndex(s => s.id === currentStyle);
        return idx === -1 ? 0 : idx;
    });
    const [customImage, setCustomImage] = useState(currentCustomImage || '');

    const activeStyle = STYLES[index];

    const previewState: AthanPlaybackState = {
        isPlaying: true,
        isMuted: false,
        prayerName: 'Maghrib',
        prayerNameAr: 'المغرب',
        muezzin: MUEZZINS[0],
        screenStyle: activeStyle.id,
    };

    const handleNext = () => setIndex((index + 1) % STYLES.length);
    const handlePrev = () => setIndex((index - 1 + STYLES.length) % STYLES.length);

    const longPressProps = useLongPress(() => {
        // Long press handler for interaction
    });

    const sharedProps = {
        state: previewState,
        isDark,
        onMute: () => {},
        onStop: () => {},
        longPressProps,
        customImage
    };

    return (
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col overflow-hidden">
            {/* Preview Area */}
            <div className="flex-1 relative">
                {activeStyle.id === 'mosque' && <MosqueStyle {...sharedProps} />}
                {activeStyle.id === 'dawn' && <DawnStyle {...sharedProps} />}
                {activeStyle.id === 'geometry' && <GeometryStyle {...sharedProps} />}

                {/* Overlay Navigation Buttons */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 flex justify-between items-center pointer-events-none z-30">
                    <button
                        onClick={handlePrev}
                        className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white pointer-events-auto active:scale-90 transition-all"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={handleNext}
                        className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center text-white pointer-events-auto active:scale-90 transition-all"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>

                {/* Style Name Badge */}
                <div className="absolute top-20 inset-x-0 flex justify-center pointer-events-none z-30">
                    <div className="px-6 py-2 rounded-full bg-black/40 backdrop-blur-xl border border-white/20">
                        <span className="text-white font-amiri font-bold text-lg">{activeStyle.nameAr}</span>
                    </div>
                </div>

                {/* Custom Image Input for Geometry Style */}
                {activeStyle.id === 'geometry' && (
                    <div className="absolute bottom-28 inset-x-0 px-6 z-30">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4">
                            <p className="text-white/80 text-[13px] font-bold mb-2 text-right">اختر صورة مخصصة (اختياري)</p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                            const img = new Image();
                                            img.onload = () => {
                                                const canvas = document.createElement('canvas');
                                                const MAX_WIDTH = 1080;
                                                const MAX_HEIGHT = 1920;
                                                let width = img.width;
                                                let height = img.height;

                                                if (width > height) {
                                                    if (width > MAX_WIDTH) {
                                                        height *= MAX_WIDTH / width;
                                                        width = MAX_WIDTH;
                                                    }
                                                } else {
                                                    if (height > MAX_HEIGHT) {
                                                        width *= MAX_HEIGHT / height;
                                                        height = MAX_HEIGHT;
                                                    }
                                                }
                                                canvas.width = width;
                                                canvas.height = height;
                                                const ctx = canvas.getContext('2d');
                                                ctx?.drawImage(img, 0, 0, width, height);
                                                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                                                setCustomImage(dataUrl);
                                            };
                                            img.src = event.target?.result as string;
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="w-full px-3 py-2 rounded-xl text-[13px] outline-none bg-white/10 text-white transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold-500 file:text-white hover:file:bg-gold-600"
                                dir="rtl"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="p-6 bg-black/90 backdrop-blur-2xl border-t border-white/10 flex gap-4 z-40">
                <button
                    onClick={onClose}
                    className="flex-1 py-4 rounded-2xl bg-white/10 text-white font-amiri font-bold text-lg active:scale-95 transition-all"
                >
                    إلغاء
                </button>
                <button
                    onClick={() => onSave(activeStyle.id, customImage)}
                    className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-400 text-gray-900 font-amiri font-bold text-lg shadow-lg shadow-gold-500/20 active:scale-95 transition-all"
                >
                    حفظ النمط
                </button>
            </div>
        </div>
    );
}
