import { useRef, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { saveUserName } from '../services/rewardsStore';
import { CALCULATION_METHODS } from '../services/prayerService';
import { MapPinIcon } from './Icons';
import { useTheme } from './ThemeContext';

interface OnboardingScreenProps {
    onComplete: () => void;
}

const TOTAL_STEPS = 5;

function StepDots({ current, isDark }: { current: number; isDark: boolean }) {
    return (
        <div className="flex items-center justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                    key={i}
                    className={`rounded-full transition-all duration-500 ${i === current
                        ? 'w-6 h-2 bg-gold-400'
                        : i < current
                            ? 'w-2 h-2 bg-gold-400/40'
                            : isDark
                                ? 'w-2 h-2 bg-white/15'
                                : 'w-2 h-2 bg-slate-300'
                        }`}
                />
            ))}
        </div>
    );
}

function StepWelcome({ name, onChange, isDark }: { name: string; onChange: (v: string) => void; isDark: boolean }) {
    return (
        <div className="flex flex-col h-full gap-6">
            <div className="text-center pt-4" dir="rtl">
                <p className="text-[13px] font-scheherazade text-gold-400/70 tracking-widest mb-2">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
                <h1 className={`text-3xl font-amiri font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>مرحباً بك في Sirat</h1>
                <p className={`text-[13px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>رفيقك اليومي في الصلاة والذكر وتلاوة القرآن</p>
            </div>

            <div className={`rounded-2xl border p-4 ${isDark ? 'bg-white/[0.04] border-white/[0.1]' : 'bg-white border-slate-200 shadow-sm'}`} dir="rtl">
                <p className={`text-[12px] mb-2 ${isDark ? 'text-white/40' : 'text-slate-500'}`}>ما اسمك؟</p>
                <input
                    type="text"
                    value={name}
                    onChange={e => onChange(e.target.value)}
                    placeholder="أدخل اسمك هنا"
                    dir="rtl"
                    className={`w-full bg-transparent text-[20px] font-amiri font-bold outline-none text-right ${isDark ? 'text-white placeholder:text-white/20' : 'text-slate-800 placeholder:text-slate-400'}`}
                    autoFocus
                    enterKeyHint="next"
                />
            </div>
        </div>
    );
}

function StepLocation({
    cityInput,
    onCityInput,
    detectedCity,
    detecting,
    onDetect,
    locationError,
    isDark,
}: {
    cityInput: string;
    onCityInput: (v: string) => void;
    detectedCity: string | null;
    detecting: boolean;
    onDetect: () => void;
    locationError?: string | null;
    isDark: boolean;
}) {
    return (
        <div className="flex flex-col h-full gap-4" dir="rtl">
            <div className="text-center pt-4">
                <h2 className={`text-2xl font-amiri font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>موقعك الجغرافي</h2>
                <p className={`text-[13px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>نحتاج معرفة موقعك لحساب مواقيت الصلاة بدقة</p>
            </div>

            <button
                onClick={onDetect}
                disabled={detecting}
                className={`w-full rounded-2xl border p-4 flex items-center gap-4 text-right transition-all active:scale-[0.98] ${detectedCity
                    ? 'bg-islamic-500/10 border-islamic-400/30'
                    : isDark
                        ? 'bg-white/[0.04] border-white/[0.1]'
                        : 'bg-white border-slate-200 shadow-sm'
                    }`}
            >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${detectedCity ? 'bg-islamic-500 text-white' : isDark ? 'bg-white/[0.07] text-white/60' : 'bg-slate-100 text-slate-500'}`}>
                    {detecting ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <MapPinIcon className="w-5 h-5" />
                    )}
                </div>
                <div className="flex-1 text-right">
                    <p className={`text-[15px] font-amiri font-bold ${detectedCity ? (isDark ? 'text-white' : 'text-slate-800') : (isDark ? 'text-white/70' : 'text-slate-700')}`}>
                        {detecting ? 'جاري التحديد...' : detectedCity ? detectedCity : 'تحديد الموقع تلقائياً'}
                    </p>
                    <p className={`text-[11px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{detectedCity ? 'تم الكشف عبر GPS بنجاح' : 'استخدام خدمة الموقع الجغرافي'}</p>
                </div>
            </button>

            {locationError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-right">
                    <p className="text-[12px] text-red-400 leading-relaxed">{locationError}</p>
                </div>
            )}

            <div className="flex items-center gap-3 px-1">
                <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />
                <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-white/25' : 'text-slate-400'}`}>أو</span>
                <div className={`flex-1 h-px ${isDark ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />
            </div>

            <div className={`rounded-2xl border p-4 ${isDark ? 'bg-white/[0.04] border-white/[0.1]' : 'bg-white border-slate-200 shadow-sm'}`}>
                <p className={`text-[11px] text-right mb-1 uppercase tracking-wider ${isDark ? 'text-white/35' : 'text-slate-400'}`}>أدخل مدينتك يدوياً</p>
                <input
                    type="text"
                    value={cityInput}
                    onChange={e => onCityInput(e.target.value)}
                    placeholder="مثال: الرياض، القاهرة، مراكش..."
                    dir="rtl"
                    className={`w-full bg-transparent text-[17px] font-amiri outline-none py-2 text-right ${isDark ? 'text-white placeholder:text-white/20' : 'text-slate-800 placeholder:text-slate-400'}`}
                    enterKeyHint="next"
                />
                <p className={`text-[11px] mt-2 text-right ${isDark ? 'text-white/25' : 'text-slate-400'}`}>اكتب اسم المدينة بالعربية أو الإنجليزية</p>
            </div>
        </div>
    );
}

function StepMethod({ methodId, onChange, isDark }: { methodId: string; onChange: (id: string) => void; isDark: boolean }) {
    return (
        <div className="flex flex-col h-full gap-4" dir="rtl">
            <div className="text-center pt-4">
                <h2 className={`text-2xl font-amiri font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>طريقة الحساب</h2>
                <p className={`text-[13px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>اختر الجهة المرجعية لحساب مواقيت الصلاة في بلدك</p>
            </div>

            <div className="space-y-2">
                {CALCULATION_METHODS.map(m => (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id)}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.98] text-right ${methodId === m.id
                            ? 'bg-gold-500/10 border-gold-400/30'
                            : isDark
                                ? 'bg-white/[0.03] border-white/[0.07] active:bg-white/[0.06]'
                                : 'bg-white border-slate-200 active:bg-slate-50'
                            }`}
                    >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${methodId === m.id ? 'border-gold-400 bg-gold-400' : isDark ? 'border-white/20' : 'border-slate-300'}`}>
                            {methodId === m.id && <div className="w-2 h-2 rounded-full bg-[#0b1929]" />}
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                            <p className={`text-[14px] font-amiri font-bold truncate ${methodId === m.id ? 'text-gold-300' : isDark ? 'text-white/80' : 'text-slate-700'}`}>{m.name}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${methodId === m.id ? 'text-gold-400/50' : isDark ? 'text-white/25' : 'text-slate-400'}`}>{m.country}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function StepMadhab({ school, onChange, isDark }: { school: number; onChange: (s: number) => void; isDark: boolean }) {
    const options = [
        {
            value: 0,
            label: 'الشافعي والمالكي والحنبلي',
            sub: 'وقت العصر عندما يكون ظل الشيء الرأسي مساوياً لطوله',
            region: 'أغلب الدول العربية',
        },
        {
            value: 1,
            label: 'الحنفي',
            sub: 'وقت العصر عندما يكون ظل الشيء الرأسي ضعف طوله',
            region: 'تركيا وجنوب آسيا وبعض الدول',
        },
    ];

    return (
        <div className="flex flex-col h-full gap-4" dir="rtl">
            <div className="text-center pt-4">
                <h2 className={`text-2xl font-amiri font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>المذهب الفقهي</h2>
                <p className={`text-[13px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>يؤثر في حساب وقت صلاة العصر تحديداً</p>
            </div>

            <div className="space-y-3">
                {options.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={`w-full p-5 rounded-2xl border text-right transition-all active:scale-[0.98] ${school === opt.value
                            ? 'bg-violet-500/10 border-violet-400/30'
                            : isDark
                                ? 'bg-white/[0.03] border-white/[0.07]'
                                : 'bg-white border-slate-200'
                            }`}
                    >
                        <p className={`text-[17px] font-amiri font-bold mb-1 ${school === opt.value ? 'text-violet-300' : isDark ? 'text-white/80' : 'text-slate-700'}`}>{opt.label}</p>
                        <p className={`text-[12px] leading-relaxed ${school === opt.value ? 'text-violet-300/50' : isDark ? 'text-white/30' : 'text-slate-400'}`}>{opt.sub}</p>
                        <div className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${school === opt.value ? 'bg-violet-500/20 text-violet-300' : isDark ? 'bg-white/[0.05] text-white/20' : 'bg-slate-100 text-slate-500'}`}>
                            {opt.region}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function StepHijri({ adj, onChange, userName, isDark }: { adj: number; onChange: (v: number) => void; userName: string; isDark: boolean }) {
    const getHijriStr = () => {
        const toLatinNum = (str: string) => {
            const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
            return str.replace(/[٠-٩]/g, (d) => arabicNumbers.indexOf(d).toString());
        };
        try {
            const date = new Date();
            if (adj !== 0) date.setDate(date.getDate() + adj);
            const formatted = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(date);
            return toLatinNum(formatted);
        } catch {
            return '—';
        }
    };

    return (
        <div className="flex flex-col h-full gap-4" dir="rtl">
            <div className="text-center pt-4">
                <h2 className={`text-2xl font-amiri font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>التقويم الهجري</h2>
                <p className={`text-[13px] ${isDark ? 'text-white/40' : 'text-slate-500'}`}>اضبط التاريخ الهجري إن كان مختلفاً في بلدك</p>
            </div>

            <div className="rounded-2xl bg-amber-500/[0.07] border border-amber-400/20 p-5 text-center">
                <p className="text-[11px] text-amber-400/50 font-bold uppercase tracking-widest mb-2">التاريخ الهجري الحالي</p>
                <p className="text-[22px] font-scheherazade text-amber-300 font-bold">{getHijriStr()}</p>
                {adj !== 0 && (
                    <p className="text-[11px] text-amber-400/60 mt-1">{adj > 0 ? `مضاف ${adj} يوم` : `مطروح ${Math.abs(adj)} يوم`}</p>
                )}
            </div>

            <div className="flex items-center justify-center gap-6">
                <button
                    onClick={() => onChange(adj - 1)}
                    disabled={adj <= -3}
                    className={`w-14 h-14 rounded-full border flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 ${isDark ? 'bg-white/[0.06] border-white/[0.1] text-white/60' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>

                <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex flex-col items-center justify-center shadow-xl">
                    <span className={`text-4xl font-amiri font-bold ${adj === 0 ? (isDark ? 'text-white/40' : 'text-slate-500') : 'text-amber-300'}`}>
                        {adj > 0 ? `+${adj}` : adj}
                    </span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${isDark ? 'text-white/25' : 'text-slate-400'}`}>يوم</span>
                </div>

                <button
                    onClick={() => onChange(adj + 1)}
                    disabled={adj >= 3}
                    className={`w-14 h-14 rounded-full border flex items-center justify-center active:scale-90 transition-all disabled:opacity-30 ${isDark ? 'bg-white/[0.06] border-white/[0.1] text-white/60' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
            </div>

            <div className="rounded-2xl bg-gold-500/[0.07] border border-gold-400/15 p-4">
                <p className="text-[12px] text-gold-400/60 font-bold uppercase tracking-wider mb-2 text-center">ملخص إعداداتك</p>
                <div className="flex justify-between items-center">
                    <span className={`text-[13px] ${isDark ? 'text-white/50' : 'text-slate-500'}`}>الاسم</span>
                    <span className={`text-[13px] font-amiri font-bold ${isDark ? 'text-white/80' : 'text-slate-700'}`}>{userName || 'أخي المسلم'}</span>
                </div>
                <p className={`text-[11px] text-center mt-3 ${isDark ? 'text-white/20' : 'text-slate-400'}`}>يمكنك تغيير كل هذه الإعدادات لاحقاً من قائمة الإعدادات</p>
            </div>
        </div>
    );
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { theme } = useTheme();
    const isDark = theme !== 'light';
    const { changeCity, changeMethod, changeSchool, updateAdjustment } = usePrayerTimes();

    const [step, setStep] = useState(0);
    const [sliding, setSliding] = useState<'in' | 'out' | null>(null);
    const [direction, setDirection] = useState<'forward' | 'back'>('forward');

    const [name, setName] = useState('');
    const [cityInput, setCityInput] = useState('');
    const [detectedCity, setDetectedCity] = useState<string | null>(null);
    const [detectedCoords, setDetectedCoords] = useState<string | null>(null);
    const [detecting, setDetecting] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [methodId, setMethodId] = useState('3');
    const [school, setSchool] = useState(0);
    const [hijriAdj, setHijriAdj] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);

    const canAdvance = (): boolean => {
        if (step === 0) return name.trim().length >= 2;
        if (step === 1) return !!detectedCity || cityInput.trim().length >= 2;
        return true;
    };

    const detectGPS = async () => {
        setDetecting(true);
        setLocationError(null);
        try {
            let latitude: number;
            let longitude: number;

            try {
                const permissions = await Geolocation.checkPermissions();
                if (permissions.location !== 'granted') {
                    const req = await Geolocation.requestPermissions();
                    if (req.location === 'denied') throw new Error('denied');
                }
                const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
            } catch {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    if (!navigator.geolocation) {
                        reject(new Error('no_geolocation'));
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
                });
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
            }

            let cityName = 'موقعي الحالي';
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                const data = await res.json();
                cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || 'موقعي الحالي';
            } catch {
                // keep default
            }

            const coordStr = `${latitude},${longitude}`;
            setDetectedCity(cityName);
            setDetectedCoords(coordStr);
            localStorage.setItem('user_city_display', cityName);
            localStorage.setItem('user_city', coordStr);
        } catch (e: any) {
            setDetectedCity(null);
            setDetectedCoords(null);
            const code = e?.code;
            if (code === 1) {
                setLocationError('تم رفض إذن الموقع. يرجى تفعيله من إعدادات الجهاز.');
            } else if (code === 2) {
                setLocationError('تعذّر تحديد موقعك. حاول مرة أخرى.');
            } else if (code === 3) {
                setLocationError('انتهت مهلة تحديد الموقع. حاول مرة أخرى.');
            } else {
                setLocationError('تعذّر الوصول إلى خدمة الموقع.');
            }
        } finally {
            setDetecting(false);
        }
    };

    const animateTo = (nextStep: number, dir: 'forward' | 'back') => {
        setDirection(dir);
        setSliding('out');
        setTimeout(() => {
            setStep(nextStep);
            setSliding('in');
            setTimeout(() => setSliding(null), 350);
        }, 250);
    };

    const handleNext = () => {
        if (!canAdvance()) return;
        if (step < TOTAL_STEPS - 1) {
            animateTo(step + 1, 'forward');
        } else {
            finish();
        }
    };

    const handleBack = () => {
        if (step > 0) animateTo(step - 1, 'back');
    };

    const finish = () => {
        const trimmedName = name.trim() || 'أخي المسلم';
        saveUserName(trimmedName);

        if (detectedCity && detectedCoords) {
            changeCity(detectedCoords, detectedCity);
        } else if (cityInput.trim()) {
            const city = cityInput.trim().toLowerCase();
            localStorage.setItem('user_city', city);
            changeCity(city, cityInput.trim());
        }

        changeMethod(methodId);
        changeSchool(school);
        localStorage.setItem('prayer_method', methodId);
        localStorage.setItem('prayer_school', school.toString());

        updateAdjustment(hijriAdj);

        localStorage.setItem('onboarding_complete', '1');
        onComplete();
    };

    const getSlideClass = () => {
        if (!sliding) return 'translate-x-0 opacity-100';
        if (sliding === 'out') return direction === 'forward' ? '-translate-x-8 opacity-0' : 'translate-x-8 opacity-0';
        if (sliding === 'in') return direction === 'forward' ? 'translate-x-8 opacity-0' : '-translate-x-8 opacity-0';
        return 'translate-x-0 opacity-100';
    };

    const isLastStep = step === TOTAL_STEPS - 1;

    return (
        <div
            className={`fixed inset-0 overflow-hidden ${isDark ? 'bg-gradient-to-b from-[#06101f] via-[#0b1929] to-[#070f1d] text-white' : 'bg-[#f5f7fc] text-slate-800'}`}
            style={{ paddingBottom: 'calc(0px + env(safe-area-inset-bottom, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-gold-500/[0.04] blur-[100px] pointer-events-none" />

            <div className="flex items-center justify-between px-5 pt-4 pb-2" dir="rtl">
                <button
                    onClick={handleBack}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${step > 0
                        ? isDark
                            ? 'bg-white/[0.07] border border-white/[0.1] text-white/70'
                            : 'bg-slate-100 border border-slate-200 text-slate-600'
                        : 'opacity-0 pointer-events-none'
                        }`}
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                </button>

                <StepDots current={step} isDark={isDark} />

                <div className="w-10 h-10 flex items-center justify-center">
                    <span className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-slate-400'}`}>{step + 1}/{TOTAL_STEPS}</span>
                </div>
            </div>

            <div
                ref={containerRef}
                className={`px-6 transition-all duration-300 ease-out ${getSlideClass()}`}
                style={{ height: 'calc(100% - 140px)', overflowY: 'auto' }}
            >
                {step === 0 && <StepWelcome name={name} onChange={setName} isDark={isDark} />}
                {step === 1 && (
                    <StepLocation
                        cityInput={cityInput}
                        onCityInput={setCityInput}
                        detectedCity={detectedCity}
                        detecting={detecting}
                        onDetect={detectGPS}
                        locationError={locationError}
                        isDark={isDark}
                    />
                )}
                {step === 2 && <StepMethod methodId={methodId} onChange={setMethodId} isDark={isDark} />}
                {step === 3 && <StepMadhab school={school} onChange={setSchool} isDark={isDark} />}
                {step === 4 && <StepHijri adj={hijriAdj} onChange={setHijriAdj} userName={name.trim() || 'أخي المسلم'} isDark={isDark} />}
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-6 pb-safe" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>
                <button
                    onClick={handleNext}
                    disabled={!canAdvance()}
                    className={`w-full py-4 rounded-2xl text-[16px] font-amiri font-bold transition-all active:scale-[0.97] shadow-2xl ${canAdvance()
                        ? 'bg-gradient-to-l from-gold-500 to-amber-400 text-[#080f1c] shadow-gold-500/30'
                        : isDark
                            ? 'bg-white/[0.07] text-white/20 cursor-not-allowed'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {isLastStep ? 'ابدأ رحلتك' : 'التالي'}
                </button>
            </div>
        </div>
    );
}
