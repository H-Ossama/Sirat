import { useEffect, useState } from 'react';
import { usePrayerTimes } from '../hooks/usePrayerTimes';
import { useTheme } from './ThemeContext';
import { getNotificationSettings, NotificationSettings, saveNotificationSettings, scheduleAllNotifications } from '../services/notificationService';
import { CALCULATION_METHODS } from '../services/prayerService';
import { MapPinIcon, ZapIcon, ChevronLeftIcon, MailIcon, WhatsappIcon, GithubIcon, GlobeIcon } from './Icons';
import { LocationSelector } from './LocationSelector';
import { logInteraction } from '../services/activityLogStore';
import { checkForAppUpdateIfDue, getUpdateOverview, isNativeAndroid, getLastCheckTime } from '../services/updateService';

interface SettingsScreenProps {
    onBack: () => void;
    onNavigate: (s: string) => void;
}

function ToggleSwitch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${on ? 'bg-gradient-to-r from-gold-500 to-amber-400 shadow-lg shadow-gold-500/30' : 'bg-white/10'}`}
        >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${on ? 'right-0.5' : 'right-6'}`} />
        </button>
    );
}

export function SettingsScreen({ onBack, onNavigate }: SettingsScreenProps) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme !== 'light';
    const { city, changeCity, methodId, changeMethod, school, changeSchool, prayerData, locationName, refreshLocation, locationLoading, prayerOffsets, updatePrayerOffset, updateAdjustment } = usePrayerTimes();
    const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
    const [hijriAdj, setHijriAdj] = useState(parseInt(localStorage.getItem('hijri_adjustment') || '0'));
    const [videoMiniPlayerEnabled, setVideoMiniPlayerEnabled] = useState(() => {
        const v = localStorage.getItem('video_mini_player_enabled');
        return v === null ? true : v === 'true';
    });
    const [showLocationSelector, setShowLocationSelector] = useState(false);
    const [activeTab, setActiveTab] = useState<'main' | 'prayer' | 'notifications' | 'appearance' | 'about'>('main');
    const [currentVersion, setCurrentVersion] = useState('---');
    const [latestVersion, setLatestVersion] = useState('---');
    const [latestPublishedAt, setLatestPublishedAt] = useState('---');
    const [lastCheckedText, setLastCheckedText] = useState('---');
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const [updateStatusText, setUpdateStatusText] = useState('');

    useEffect(() => {
        let cancelled = false;
        const loadUpdateInfo = async () => {
            if (!isNativeAndroid()) {
                if (!cancelled) {
                    setUpdateStatusText('ميزة التحديث التلقائي متاحة على أندرويد فقط.');
                }
                return;
            }

            try {
                const overview = await getUpdateOverview();
                const lastTime = getLastCheckTime();

                if (lastTime > 0) {
                    setLastCheckedText(new Date(lastTime).toLocaleString('en-US', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                    }));
                }

                if (!overview || cancelled) return;

                setCurrentVersion(overview.currentVersion || '---');
                setLatestVersion(overview.latestVersion || '---');
                if (overview.latestPublishedAt) {
                    const formatted = new Date(overview.latestPublishedAt).toLocaleDateString('en-US');
                    setLatestPublishedAt(formatted);
                }
            } catch {
                if (!cancelled) {
                    setUpdateStatusText('تعذر قراءة معلومات التحديث حالياً.');
                }
            }
        };

        loadUpdateInfo();
        return () => {
            cancelled = true;
        };
    }, []);

    const toggleSetting = (key: keyof NotificationSettings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        saveNotificationSettings(newSettings);
        if (prayerData) scheduleAllNotifications(prayerData.prayers, newSettings);
        logInteraction({
            type: 'settings_toggle_notification',
            category: 'settings',
            title: newSettings[key] ? 'تفعيل إشعار' : 'تعطيل إشعار',
            details: String(key),
            meta: { key: String(key), enabled: !!newSettings[key] },
        });
    };



    const updateHijri = (delta: number) => {
        const newAdj = hijriAdj + delta;
        setHijriAdj(newAdj);
        updateAdjustment(newAdj);
        logInteraction({
            type: 'settings_hijri_adjust',
            category: 'settings',
            title: 'تعديل التاريخ الهجري',
            details: `الإزاحة ${newAdj > 0 ? `+${newAdj}` : newAdj}`,
            meta: { adjustment: newAdj },
        });
    };

    const toggleVideoMiniPlayer = () => {
        setVideoMiniPlayerEnabled(prev => {
            const next = !prev;
            localStorage.setItem('video_mini_player_enabled', String(next));
            logInteraction({
                type: 'settings_toggle_video_mini_player',
                category: 'settings',
                title: next ? 'تفعيل المشغل المصغر' : 'تعطيل المشغل المصغر',
                details: 'مشغل الفيديو العائم',
                meta: { enabled: next },
            });
            return next;
        });
    };

    const D = isDark;
    const card = `rounded-2xl border overflow-hidden ${D ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-slate-100'}`;
    const rowDiv = `border-b ${D ? 'border-white/[0.05]' : 'border-slate-100'}`;
    const lbl = `text-[14px] font-amiri font-bold ${D ? 'text-white/90' : 'text-slate-800'}`;
    const sub = `text-[11px] ${D ? 'text-white/35' : 'text-slate-400'}`;
    const sectionIcon = `w-9 h-9 rounded-2xl border flex items-center justify-center flex-shrink-0 ${D ? 'bg-gold-500/10 border-gold-400/20 text-gold-400' : 'bg-gold-50 border-gold-200 text-gold-600'}`;
    const sectionTitle = `text-[15px] font-amiri font-bold ${D ? 'text-white' : 'text-slate-800'}`;
    const sectionSub = `text-[11px] ${D ? 'text-white/40' : 'text-slate-400'}`;

    const SectionHead = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
        <div className="flex items-center gap-3 mb-3 px-1" dir="rtl">
            <div className={sectionIcon}>{icon}</div>
            <div>
                <h2 className={sectionTitle}>{title}</h2>
                {subtitle && <p className={sectionSub}>{subtitle}</p>}
            </div>
        </div>
    );

    const notifItems = [
        { key: 'prayerAlerts', label: 'تنبيهات الصلاة', sub: 'إشعار عند كل وقت صلاة' },
        { key: 'suhoorReminder', label: 'تذكير السحور', sub: 'قبل أذان الفجر بـ 30 دقيقة' },
        { key: 'iftarReminder', label: 'تنبيه الإفطار', sub: 'عند أذان المغرب' },
        { key: 'morningAdhkar', label: 'أذكار الصباح', sub: 'بعد صلاة الفجر' },
        { key: 'eveningAdhkar', label: 'أذكار المساء', sub: 'بعد صلاة العصر' },
    ];

    const quickLinks = [
        { id: 'lastTen', label: 'العشر الأواخر', sub: 'أفضل ليالي رمضان' },
        { id: 'khatma', label: 'ختمة رمضان', sub: 'تتبع قراءة القرآن' },
        { id: 'deeds', label: 'سجل الحسنات', sub: 'تتبع الأعمال اليومية' },
        { id: 'profile', label: 'الملف الشخصي', sub: 'الإنجازات والشارات' },
    ];

    const handleBack = () => {
        if (activeTab === 'main') {
            onBack();
        } else {
            setActiveTab('main');
        }
    };

    const checkUpdatesNow = async () => {
        setCheckingUpdate(true);
        setUpdateStatusText('جاري التحقق من وجود تحديث...');

        try {
            const overview = await getUpdateOverview();

            if (overview) {
                setCurrentVersion(overview.currentVersion || '---');
                setLatestVersion(overview.latestVersion || '---');
                if (overview.latestPublishedAt) {
                    const formatted = new Date(overview.latestPublishedAt).toLocaleDateString('en-US');
                    setLatestPublishedAt(formatted);
                }
            }

            const lastTime = getLastCheckTime();
            if (lastTime > 0) {
                setLastCheckedText(new Date(lastTime).toLocaleString('en-US', {
                    dateStyle: 'short',
                    timeStyle: 'short'
                }));
            }

            if (!isNativeAndroid()) {
                setUpdateStatusText('تم جلب البيانات. ميزة تثبيت التحديثات متاحة على أندرويد فقط.');
                setCheckingUpdate(false);
                return;
            }

            const release = await checkForAppUpdateIfDue(true);

            if (release) {
                window.dispatchEvent(new CustomEvent('app:update-found', { detail: release }));
                setUpdateStatusText(`تم العثور على تحديث جديد (${release.versionTag}).`);
                logInteraction({
                    type: 'settings_check_updates',
                    category: 'settings',
                    title: 'فحص التحديثات',
                    details: `تم العثور على تحديث ${release.versionTag}`,
                    meta: { hasUpdate: true, version: release.versionTag },
                });
            } else if (overview?.latestVersion === '---' || !overview) {
                setUpdateStatusText('لا يوجد إصدارات متاحة على GitHub حالياً.');
            } else {
                setUpdateStatusText('أنت تستخدم آخر إصدار متاح حالياً.');
                logInteraction({
                    type: 'settings_check_updates',
                    category: 'settings',
                    title: 'فحص التحديثات',
                    details: 'لا يوجد تحديث جديد',
                    meta: { hasUpdate: false },
                });
            }
        } catch (e: any) {
            setUpdateStatusText(e.message || 'فشل التحقق من التحديث، حاول مرة أخرى لاحقاً.');
        } finally {
            setCheckingUpdate(false);
        }
    };

    const tabTitle = {
        main: 'الإعدادات',
        prayer: 'مواقيت الصلاة',
        notifications: 'الإشعارات والتنبيهات',
        appearance: 'المظهر والتقويم',
        about: 'عن التطبيق'
    }[activeTab];

    return (
        <div className={`h-full overflow-y-auto hide-scrollbar pb-24 transition-colors duration-300 ${D ? 'bg-gradient-to-b from-[#0b1929] via-[#0f1f38] to-[#0a1525] text-white' : 'bg-[#f0f4f8] text-slate-800'}`}>
            <div className={`px-5 pt-5 pb-4 sticky top-0 backdrop-blur-xl z-20 border-b transition-all ${D ? 'bg-[#0b1929]/95 border-white/[0.05]' : 'bg-white/90 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                    <button onClick={handleBack} className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${D ? 'bg-white/[0.08] border border-white/[0.1]' : 'bg-slate-100 border border-slate-200'}`}>
                        <svg className={`w-4 h-4 ${D ? 'text-white/80' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                    <h1 className={`text-xl font-amiri font-bold ${D ? 'text-gold-400' : 'text-gold-600'}`}>{tabTitle}</h1>
                    <div className="w-10" />
                </div>
            </div>

            <div className="px-4 pt-5 pb-8">
                {activeTab === 'main' && (
                    <div className="space-y-7 animation-fade-in">
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'prayer', title: 'مواقيت الصلاة والموقع', sub: 'طرق الحساب، المذهب، والوقع', icon: <MapPinIcon className="w-5 h-5" /> },
                                { id: 'notifications', title: 'الإشعارات والتنبيهات', sub: 'تذكير بالصلاة والأذكار والسحور', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
                                { id: 'appearance', title: 'المظهر والتقويم', sub: 'الوضع الليلي وتعديل التاريخ الهجري', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg> },
                                { id: 'about', title: 'عن التطبيق والمصادر', sub: 'الإصدار، الحقوق ومصادر البيانات', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                            ].map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveTab(cat.id as any)}
                                    className={`${card} w-full flex items-center gap-4 p-4 active:scale-[0.98] transition-all text-right group`}
                                    dir="rtl"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${D ? 'bg-gold-500/10 text-gold-400 group-active:bg-gold-500/20' : 'bg-gold-50 text-gold-600 group-active:bg-gold-100'}`}>
                                        {cat.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className={lbl}>{cat.title}</h3>
                                        <p className={sub}>{cat.sub}</p>
                                    </div>
                                    <svg className={`w-5 h-5 transition-transform group-active:translate-x-1 ${D ? 'text-white/20' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                                </button>
                            ))}
                        </div>

                        {/* Quick Links */}
                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                title="روابط سريعة"
                                subtitle="الوصول السريع للميزات الرئيسية"
                            />
                            <div className={card}>
                                {quickLinks.map((item, i) => (
                                    <button key={item.id} onClick={() => onNavigate(item.id)} className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${i < quickLinks.length - 1 ? rowDiv : ''} ${D ? 'active:bg-white/[0.05]' : 'active:bg-slate-50'}`} dir="rtl">
                                        <div className="text-right">
                                            <p className={lbl}>{item.label}</p>
                                            <p className={sub}>{item.sub}</p>
                                        </div>
                                        <svg className={`w-4 h-4 ${D ? 'text-white/20' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'prayer' && (
                    <div className="space-y-7 animation-slide-in">
                        {/* Location */}
                        <section>
                            <SectionHead
                                icon={<MapPinIcon className="w-4 h-4" />}
                                title="الموقع الجغرافي"
                                subtitle="تحديد المدينة يدوياً أو عبر GPS"
                            />
                            <div className={card}>
                                <div className="p-5 flex flex-col gap-4" dir="rtl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${D ? 'bg-gold-500/10 text-gold-400' : 'bg-gold-50 text-gold-600'}`}>
                                                <MapPinIcon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className={`text-[15px] font-amiri font-bold ${D ? 'text-white' : 'text-slate-800'}`}>
                                                    {locationName || city || 'غير محدد'}
                                                </p>
                                                <p className={`text-[10px] font-bold opacity-40 ${D ? 'text-white' : 'text-slate-500'}`}>
                                                    {city ? 'تحديد يدوي' : 'تحديد تلقائي'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowLocationSelector(true)}
                                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 text-white text-[12px] font-bold shadow-md active:scale-95 transition-all"
                                        >
                                            تغيير الموقع
                                        </button>
                                    </div>

                                    <button
                                        onClick={refreshLocation}
                                        disabled={locationLoading}
                                        className={`w-full py-3 rounded-2xl border flex items-center justify-center gap-3 text-[12px] font-bold transition-all active:scale-[0.98] ${D
                                            ? 'bg-white/[0.04] border-white/[0.08] text-white/80'
                                            : 'bg-slate-50 border-slate-200 text-slate-600'
                                            } ${locationLoading ? 'opacity-50' : ''}`}
                                    >
                                        <ZapIcon className={`w-4 h-4 ${locationLoading ? 'animate-spin' : ''}`} />
                                        {locationLoading ? 'جاري تحديد الموقع...' : 'استخدام الموقع الحالي (GPS)'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Prayer Times Config */}
                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3C12 3 8 7 8 10V12H16V10C16 7 12 3 12 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 12H18V21H6V12Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 21H20" /></svg>}
                                title="إعدادات الحساب"
                                subtitle="طريقة الحساب والمذهب الفقهي"
                            />
                            <div className={card}>
                                <div className={`px-4 py-3 ${rowDiv}`} dir="rtl">
                                    <p className={`text-[11px] font-bold mb-1.5 ${D ? 'text-white/40' : 'text-slate-400'}`}>طريقة الحساب</p>
                                    <select value={methodId} onChange={e => { changeMethod(e.target.value); logInteraction({ type: 'settings_change_prayer_method', category: 'settings', title: 'تغيير طريقة حساب الصلاة', details: e.target.value, meta: { methodId: e.target.value } }); }} className={`w-full bg-transparent outline-none text-[14px] font-amiri font-bold appearance-none cursor-pointer ${D ? 'text-white/90' : 'text-slate-800'}`}>
                                        {CALCULATION_METHODS.map(m => <option key={m.id} value={m.id} className={D ? 'bg-[#0b1929] text-white' : 'bg-white text-slate-800'}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div className="px-4 py-3" dir="rtl">
                                    <p className={`text-[11px] font-bold mb-1.5 ${D ? 'text-white/40' : 'text-slate-400'}`}>المذهب الفقهي</p>
                                    <select value={school} onChange={e => { const nextSchool = parseInt(e.target.value); changeSchool(nextSchool); logInteraction({ type: 'settings_change_fiqh_school', category: 'settings', title: 'تغيير المذهب الفقهي', details: nextSchool === 1 ? 'الحنفي' : 'الجمهور', meta: { school: nextSchool } }); }} className={`w-full bg-transparent outline-none text-[14px] font-amiri font-bold appearance-none cursor-pointer ${D ? 'text-white/90' : 'text-slate-800'}`}>
                                        <option value="0" className={D ? 'bg-[#0b1929] text-white' : 'bg-white text-slate-800'}>الشافعي، المالكي، الحنبلي</option>
                                        <option value="1" className={D ? 'bg-[#0b1929] text-white' : 'bg-white text-slate-800'}>الحنفي (تأخير العصر)</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Prayer Time Adjustments */}
                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                title="تعديل الأوقات يدوياً"
                                subtitle="إضافة أو حذف دقائق لكل صلاة"
                            />
                            <div className={card}>
                                {[
                                    { id: 'Fajr', name: 'الفجر' },
                                    { id: 'Sunrise', name: 'الشروق' },
                                    { id: 'Dhuhr', name: 'الظهر' },
                                    { id: 'Asr', name: 'العصر' },
                                    { id: 'Maghrib', name: 'المغرب' },
                                    { id: 'Isha', name: 'العشاء' },
                                ].map((p, i, arr) => (
                                    <div key={p.id} className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? rowDiv : ''}`} dir="rtl">
                                        <div>
                                            <p className={lbl}>{p.name}</p>
                                            <p className={sub}>{prayerOffsets[p.id] ? `${prayerOffsets[p.id] > 0 ? '+' : ''}${prayerOffsets[p.id]} دقيقة` : 'لا يوجد تعديل'}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => { updatePrayerOffset(p.id, -1); logInteraction({ type: 'settings_prayer_offset', category: 'settings', title: 'تعديل وقت الصلاة', details: `${p.name} -1 دقيقة`, meta: { prayer: p.id, delta: -1 } }); }}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold active:scale-95 transition-all ${D ? 'bg-white/[0.06] text-white/70' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                −
                                            </button>
                                            <span className={`w-8 text-center text-[18px] font-sans font-bold ${D ? 'text-gold-400' : 'text-gold-600'}`}>
                                                {prayerOffsets[p.id] || 0}
                                            </span>
                                            <button
                                                onClick={() => { updatePrayerOffset(p.id, 1); logInteraction({ type: 'settings_prayer_offset', category: 'settings', title: 'تعديل وقت الصلاة', details: `${p.name} +1 دقيقة`, meta: { prayer: p.id, delta: 1 } }); }}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold active:scale-95 transition-all ${D ? 'bg-white/[0.06] text-white/70' : 'bg-slate-100 text-slate-600'}`}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-7 animation-slide-in">
                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                                title="تنبيهات التطبيق"
                                subtitle="تحكم في جميع الإشعارات اليومية"
                            />
                            <div className={card}>
                                {notifItems.map((item, i) => (
                                    <div key={item.key} className={`flex items-center justify-between px-4 py-3.5 ${i < notifItems.length - 1 ? rowDiv : ''}`} dir="rtl">
                                        <div>
                                            <p className={lbl}>{item.label}</p>
                                            <p className={sub}>{item.sub}</p>
                                        </div>
                                        <ToggleSwitch
                                            on={!!settings[item.key as keyof NotificationSettings]}
                                            onToggle={() => toggleSetting(item.key as keyof NotificationSettings)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'appearance' && (
                    <div className="space-y-7 animation-slide-in">
                        {/* Appearance */}
                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2" /></svg>}
                                title="المظهر"
                                subtitle="تغيير وضع الألوان العام"
                            />
                            <div className={card}>
                                <div className="flex items-center justify-between px-4 py-3.5" dir="rtl">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${D ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-50 text-amber-500'}`}>
                                            {D
                                                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                                                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
                                            }
                                        </div>
                                        <span className={lbl}>الوضع {D ? 'المظلم' : 'الفاتح'}</span>
                                    </div>
                                    <ToggleSwitch on={D} onToggle={() => { toggleTheme(); logInteraction({ type: 'settings_toggle_theme', category: 'settings', title: D ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع المظلم', details: 'تغيير مظهر التطبيق', meta: { toDark: !D } }); }} />
                                </div>
                                <div className={`flex items-center justify-between px-4 py-3.5 ${rowDiv}`} dir="rtl">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${D ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <rect x="3" y="5" width="18" height="12" rx="2" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 9l5 3-5 3V9z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className={lbl}>المشغل المصغر للفيديو</p>
                                            <p className={sub}>إظهار الفيديو بشكل نافذة عائمة عند الرجوع</p>
                                        </div>
                                    </div>
                                    <ToggleSwitch on={videoMiniPlayerEnabled} onToggle={toggleVideoMiniPlayer} />
                                </div>
                            </div>
                        </section>

                        {/* Hijri Date */}
                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>}
                                title="التاريخ الهجري"
                                subtitle="مزامنة التقويم مع الرؤية المحلية"
                            />
                            <div className={card}>
                                <div className="flex items-center justify-between px-5 py-4">
                                    <button onClick={() => updateHijri(-1)} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-95 ${D ? 'bg-white/[0.06] border border-white/[0.1] text-white/80' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}>−</button>
                                    <div className="text-center">
                                        <span className={`text-[28px] font-sans font-bold ${D ? 'text-gold-400' : 'text-gold-600'}`}>{hijriAdj > 0 ? `+${hijriAdj}` : hijriAdj}</span>
                                        <p className={`text-[11px] mt-0.5 ${D ? 'text-white/30' : 'text-slate-400'}`}>يوم</p>
                                    </div>
                                    <button onClick={() => updateHijri(1)} className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl font-bold transition-all active:scale-95 ${D ? 'bg-white/[0.06] border border-white/[0.1] text-white/80' : 'bg-slate-100 border border-slate-200 text-slate-600'}`}>+</button>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="space-y-7 animation-slide-in">
                        {/* Improved About Section */}
                        <section>
                            <div className="flex flex-col items-center py-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-gold-500/20 to-amber-400/20 border border-gold-400/20 flex items-center justify-center mb-4 shadow-2xl shadow-gold-500/10 overflow-hidden p-3">
                                    <img src="/assets/icons/icon-512.webp" alt="App Icon" className="w-full h-full object-contain rounded-2xl" />
                                </div>
                                <h2 className={`text-2xl font-amiri font-bold mb-1 ${D ? 'text-white' : 'text-slate-800'}`}>تطبيق Sirat</h2>
<p className={`text-[13px] ${D ? 'text-white/40' : 'text-slate-500'} mb-3`}>رفيقك الإسلامي الشامل</p>
                                    <a 
                                        href="https://github.com/H-Ossama/Sirat" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                                            D ? 'bg-white/[0.05] text-white/60 border border-white/10' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        } active:scale-95`}
                                    >
                                        <GithubIcon className="w-3.5 h-3.5" />
                                        <span>مشروع مفتوح المصدر على GitHub</span>
                                    </a>
                            </div>

                            <div className={card}>
                                <div className={`flex items-center justify-between px-5 py-4 ${rowDiv}`} dir="rtl">
                                    <span className={lbl}>الإصدار الحالي</span>
                                    <span className={`text-[12px] font-sans font-bold px-3 py-1 rounded-full ${D ? 'bg-white/[0.05] text-gold-400' : 'bg-gold-50 text-gold-600'}`}>{currentVersion}</span>
                                </div>
                                <div className={`flex items-center justify-between px-5 py-4 ${rowDiv}`} dir="rtl">
                                    <span className={lbl}>أحدث إصدار على GitHub</span>
                                    <span className={`text-[12px] font-sans ${D ? 'text-white/40' : 'text-slate-500 font-bold'}`}>{latestVersion}</span>
                                </div>
                                <div className={`flex items-center justify-between px-5 py-4 ${rowDiv}`} dir="rtl">
                                    <span className={lbl}>تاريخ الإصدار الأخير</span>
                                    <span className={`text-[12px] font-sans ${D ? 'text-white/40' : 'text-slate-500 font-bold'}`}>{latestPublishedAt}</span>
                                </div>
                                <div className="flex items-center justify-between px-5 py-4" dir="rtl">
                                    <span className={lbl}>جميع الحقوق محفوظة</span>
                                    <span className={`text-[12px] font-sans ${D ? 'text-white/30' : 'text-slate-400 font-bold'}`}>© 2026</span>
                                </div>
                            </div>
                        </section>

                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                title="تواصل مع المطور"
                                subtitle="للملاحظات والاقتراحات"
                            />
                            <div className={`${card} flex justify-around py-5`} dir="rtl">
                                <a href="mailto:ossamahattan@gmail.com" className={`flex flex-col items-center gap-2 group`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${D ? 'bg-white/[0.05] group-active:bg-gold-500/20 text-white/50 group-active:text-gold-400' : 'bg-slate-100 group-active:bg-gold-50 text-slate-400 group-active:text-gold-600'}`}>
                                        <MailIcon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold ${D ? 'text-white/30' : 'text-slate-400'}`}>الإيميل</span>
                                </a>
                                <a href="https://wa.me/212630352250" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-2 group`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${D ? 'bg-white/[0.05] group-active:bg-gold-500/20 text-white/50 group-active:text-gold-400' : 'bg-slate-100 group-active:bg-gold-50 text-slate-400 group-active:text-gold-600'}`}>
                                        <WhatsappIcon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold ${D ? 'text-white/30' : 'text-slate-400'}`}>واتساب</span>
                                </a>
                                <a href="https://github.com/H-Ossama" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-2 group`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${D ? 'bg-white/[0.05] group-active:bg-gold-500/20 text-white/50 group-active:text-gold-400' : 'bg-slate-100 group-active:bg-gold-50 text-slate-400 group-active:text-gold-600'}`}>
                                        <GithubIcon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold ${D ? 'text-white/30' : 'text-slate-400'}`}>جيت هاب</span>
                                </a>
                                <a href="https://portfolio-v2-eight-lovat.vercel.app/" target="_blank" rel="noopener noreferrer" className={`flex flex-col items-center gap-2 group`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${D ? 'bg-white/[0.05] group-active:bg-gold-500/20 text-white/50 group-active:text-gold-400' : 'bg-slate-100 group-active:bg-gold-50 text-slate-400 group-active:text-gold-600'}`}>
                                        <GlobeIcon className="w-6 h-6" />
                                    </div>
                                    <span className={`text-[10px] font-bold ${D ? 'text-white/30' : 'text-slate-400'}`}>الموقع</span>
                                </a>
                            </div>
                        </section>

                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m14.836 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-14.836-2m14.836 2H15" /></svg>}
                                title="تحديثات التطبيق"
                                subtitle="فحص فوري للتحديثات المتاحة"
                            />

                            <div className={card} dir="rtl">
                                <div className="px-4 py-4">
                                    <button
                                        onClick={checkUpdatesNow}
                                        disabled={checkingUpdate}
                                        className={`w-full py-3 rounded-2xl border flex items-center justify-center gap-3 text-[12px] font-bold transition-all active:scale-[0.98] ${D
                                            ? 'bg-white/[0.04] border-white/[0.08] text-white/85'
                                            : 'bg-slate-50 border-slate-200 text-slate-700'
                                            } ${checkingUpdate ? 'opacity-60' : ''}`}
                                    >
                                        <svg className={`w-4 h-4 ${checkingUpdate ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            {checkingUpdate 
                                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m14.836 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-14.836-2m14.836 2H15" />
                                                : <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                            }
                                        </svg>
                                        {checkingUpdate ? 'جاري التحقق...' : 'التحقق الآن من التحديثات'}
                                    </button>

                                    <div className="flex items-center justify-between mt-3 px-1">
                                        <span className={`text-[11px] ${D ? 'text-white/30' : 'text-slate-400 font-bold'}`}>آخر فحص: {lastCheckedText}</span>
                                        {updateStatusText && (
                                            <p className={`text-[11px] ${D ? 'text-white/50' : 'text-slate-500'} text-left`}>
                                                {updateStatusText}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Credits */}
                        <section>
                            <SectionHead
                                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
                                title="مصادر البيانات"
                                subtitle="شكراً لكل من ساهم في هذه البيانات"
                            />
                            <div className={card} dir="rtl">
                                <div className={`px-4 py-3 ${rowDiv}`}>
                                    <p className={`text-[13px] font-amiri font-bold mb-0.5 ${D ? 'text-white/90' : 'text-slate-700'}`}>Quran for Android</p>
                                    <p className={`text-[11px] leading-relaxed ${D ? 'text-white/45' : 'text-slate-500'}`}>
                                        مستوحاة من مشروع <span className={`font-bold ${D ? 'text-amber-400' : 'text-amber-600'}`}>quran_android</span> مفتوح المصدر.
                                    </p>
                                </div>
                                <div className={`px-4 py-3 ${rowDiv}`}>
                                    <p className={`text-[13px] font-amiri font-bold mb-0.5 ${D ? 'text-white/90' : 'text-slate-700'}`}>صور الصفحات</p>
                                    <p className={`text-[11px] leading-relaxed ${D ? 'text-white/45' : 'text-slate-500'}`}>
                                        خطوط الطباعة من <span className={`font-bold ${D ? 'text-amber-400' : 'text-amber-600'}`}>مجمع الملك فهد</span> لطباعة المصحف الشريف.
                                    </p>
                                </div>
                                <div className={`px-4 py-3 ${rowDiv}`}>
                                    <p className={`text-[13px] font-amiri font-bold mb-0.5 ${D ? 'text-white/90' : 'text-slate-700'}`}>بيانات الآيات</p>
                                    <p className={`text-[11px] leading-relaxed ${D ? 'text-white/45' : 'text-slate-500'}`}>
                                        مُجلَب عبر <span className={`font-bold ${D ? 'text-amber-400' : 'text-amber-600'}`}>Quran.com API v4</span> والتفاسير من quranenc.com.
                                    </p>
                                </div>
                                <div className="px-4 py-3 text-center">
                                    <p className={`text-[11px] font-bold ${D ? 'text-gold-500/50' : 'text-gold-600/50'}`}>
                                        جزاهم الله خيراً على خدمتهم للقرآن الكريم.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {showLocationSelector && (
                <LocationSelector onClose={() => setShowLocationSelector(false)} />
            )}
        </div>
    );
}
