import { useState } from 'react';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { useTheme } from './ThemeContext';
import { MapPinIcon, ChevronLeftIcon, ZapIcon, CheckIcon, SearchIcon } from './Icons';

interface LocationSelectorProps {
    onClose: () => void;
}

export function LocationSelector({ onClose }: LocationSelectorProps) {
    const { theme } = useTheme();
    const {
        city,
        locationCity,
        locationLoading,
        changeCity,
        refreshLocation,
        locationName
    } = usePrayerTimes();

    const [searchInput, setSearchInput] = useState('');

    const handleUseManual = () => {
        if (searchInput.trim()) {
            changeCity(searchInput.trim().toLowerCase());
            onClose();
        }
    };

    const handleUseDetected = () => {
        if (locationCity) {
            changeCity(null); // Clear manual city to use detected one
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-lg rounded-t-[3rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-slide-up transition-colors duration-300 ${theme === 'light' ? 'bg-white' : 'bg-[#0b1929] border border-white/10'
                }`}>
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={onClose}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${theme === 'light' ? 'bg-slate-100 text-slate-600' : 'bg-white/10 text-white/80'
                            }`}
                    >
                        <ChevronLeftIcon className="w-4 h-4 rotate-180" />
                    </button>
                    <h2 className={`text-xl font-amiri font-bold ${theme === 'light' ? 'text-slate-800' : 'text-gold-300'}`}>تغيير الموقع</h2>
                    <div className="w-10" />
                </div>

                {/* Detected Location Card */}
                <div className="mb-8">
                    <p className={`text-[12px] font-bold uppercase tracking-widest mb-3 px-2 ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>الموقع المكتشف</p>
                    <div className={`rounded-3xl p-5 border transition-all ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/[0.03] border-white/[0.08]'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse-glow ${theme === 'light' ? 'bg-gold-100 text-gold-600' : 'bg-gold-500/20 text-gold-400'
                                    }`}>
                                    <MapPinIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    {locationLoading ? (
                                        <div className="space-y-2">
                                            <div className="h-4 w-32 bg-slate-300/30 rounded-full animate-pulse" />
                                            <div className="h-3 w-24 bg-slate-300/20 rounded-full animate-pulse" />
                                        </div>
                                    ) : (
                                        <>
                                            <p className={`text-[18px] font-amiri font-bold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>
                                                {locationCity || 'لم يتم العثور على موقع'}
                                            </p>
                                            <p className={`text-[11px] font-bold uppercase tracking-widest ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>
                                                تحديد عبر GPS
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {!locationLoading && locationCity && (
                                <button
                                    onClick={handleUseDetected}
                                    className={`px-5 py-2.5 rounded-xl text-[13px] font-amiri font-bold transition-all active:scale-95 ${!city
                                        ? 'bg-islamic-500 text-white flex items-center gap-2'
                                        : 'bg-gold-600 text-white'
                                        }`}
                                >
                                    {!city ? <><CheckIcon className="w-4 h-4" /> الحالي</> : 'استخدام هذا'}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={refreshLocation}
                            disabled={locationLoading}
                            className={`mt-4 w-full py-3 rounded-2xl border flex items-center justify-center gap-3 text-[13px] font-bold transition-all active:scale-95 ${theme === 'light'
                                ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                                } ${locationLoading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <ZapIcon className={`w-4 h-4 ${locationLoading ? 'animate-spin' : ''}`} />
                            {locationLoading ? 'جاري المسح...' : 'إعادة مسح الموقع'}
                        </button>
                    </div>
                </div>

                {/* Manual Search */}
                <div>
                    <p className={`text-[12px] font-bold uppercase tracking-widest mb-3 px-2 ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>بحث يدوي</p>
                    <div className="relative group">
                        <div className={`absolute right-5 top-1/2 -translate-y-1/2 transition-colors ${theme === 'light' ? 'text-slate-300' : 'text-white/20'}`}>
                            <SearchIcon className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleUseManual()}
                            placeholder="أدخل اسم المدينة... (Casablanca)"
                            className={`w-full rounded-3xl py-5 pr-14 pl-6 text-[15px] font-amiri outline-none transition-all shadow-inner text-right ${theme === 'light'
                                ? 'bg-slate-50 border-2 border-transparent focus:border-gold-300 focus:bg-white text-slate-800'
                                : 'bg-black/20 border-2 border-transparent focus:border-gold-400/50 focus:bg-black/40 text-white'
                                }`}
                            dir="rtl"
                        />
                    </div>
                    {city && (
                        <div className={`mt-3 flex items-center justify-end gap-2 px-3 opacity-60`}>
                            <span className="text-[12px] font-amiri font-bold text-gold-500">{city}</span>
                            <span className={`text-[11px] font-bold ${theme === 'light' ? 'text-slate-400' : 'text-white/30'}`}>المدينة الحالية:</span>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleUseManual}
                    disabled={!searchInput.trim()}
                    className={`w-full py-4 rounded-2xl text-[15px] font-amiri font-bold transition-all active:scale-95 shadow-lg ${searchInput.trim()
                        ? 'bg-gold-600 text-white shadow-gold-600/20'
                        : 'bg-slate-200 text-slate-400 pointer-events-none'
                        }`}
                >
                    تحديث الموقع يدوياً
                </button>

                {city && (
                    <button
                        onClick={() => { changeCity(null); onClose(); }}
                        className={`mt-4 w-full py-3 text-[13px] font-amiri font-bold text-red-400/80 active:scale-95 transition-all`}
                    >
                        إلغاء التحديد اليدوي
                    </button>
                )}
            </div>
        </div>
    );
}
