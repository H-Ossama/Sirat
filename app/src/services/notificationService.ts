// Notification Service using Capacitor Local Notifications
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { PrayerTime } from './prayerService';

export interface NotificationSettings {
    prayerAlerts: boolean;
    suhoorReminder: boolean;
    iftarReminder: boolean;
    morningAdhkar: boolean;
    eveningAdhkar: boolean;
    dailyVerse: boolean;
    tasbihReminder: boolean;
    tasbihTime: string; // "HH:MM"
}

const DEFAULT_SETTINGS: NotificationSettings = {
    prayerAlerts: true,
    suhoorReminder: true,
    iftarReminder: true,
    morningAdhkar: true,
    eveningAdhkar: true,
    dailyVerse: true,
    tasbihReminder: false,
    tasbihTime: '21:00',
};

const SETTINGS_KEY = 'notification_settings';

export function getNotificationSettings(): NotificationSettings {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch {
            return DEFAULT_SETTINGS;
        }
    }
    return DEFAULT_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
    try {
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    } catch {
        // Running in browser — notifications not available
        return false;
    }
}

function prayerTimeToDate(timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

export async function scheduleAllNotifications(
    prayers: PrayerTime[], // Today's prayers (unused now but kept for signature)
    settings: NotificationSettings,
    isRamadan: boolean = false,
    athanSettings?: any,
    location?: string,
    methodId?: string,
    school?: number,
    offsets?: Record<string, number>
): Promise<void> {
    try {
        const now = new Date();
        const nowTime = now.getTime() + 15000; // 15-second grace buffer to avoid "immediate" fires on missed seconds

        // 1. CLEANUP: Clear everything to prevent 'old' or duplicate notifications
        try {
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
            }
            await LocalNotifications.removeAllDeliveredNotifications();
        } catch (e) {
            console.warn('Notification cleanup failed:', e);
        }

        // Return early if no notifications are enabled
        const anyPrayerEnabled = Object.values(athanSettings?.prayerConfigs || {}).some((c: any) => c.enabled);
        if (!settings.prayerAlerts && !settings.suhoorReminder && !settings.iftarReminder && 
            !settings.morningAdhkar && !settings.eveningAdhkar && !settings.dailyVerse && !settings.tasbihReminder && !anyPrayerEnabled) {
            return;
        }

        // 2. FETCH DATA: Get consistent calendar for next 7 days
        const { fetchCalendar } = await import('./prayerService');
        const query = location || localStorage.getItem('user_city') || 'mecca';
        const mid = methodId || localStorage.getItem('prayer_method') || '3';
        const sch = school ?? parseInt(localStorage.getItem('prayer_school') || '0');
        const off = offsets || JSON.parse(localStorage.getItem('prayer_offsets') || '{}');

        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        let days = await fetchCalendar(query, year, month, mid, sch, off);

        if (now.getDate() > 24) {
            const nextMonth = month === 12 ? 1 : month + 1;
            const nextYear = month === 12 ? year + 1 : year;
            const nextDays = await fetchCalendar(query, nextYear, nextMonth, mid, sch, off);
            days = [...days, ...nextDays];
        }

        const todayDateStr = `${year}-${String(month).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const futureDays = days.filter(d => {
            const [dd, mm, yyyy] = d.gregorian.date.split('-');
            const dStr = `${yyyy}-${mm}-${dd}`;
            return dStr >= todayDateStr;
        }).slice(0, 7);

        const notifications: ScheduleOptions['notifications'] = [];
        const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        // 3. GENERATE NOTIFICATIONS
        futureDays.forEach((day, dayIdx) => {
            const [dd, mm, yyyy] = day.gregorian.date.split('-');
            const dYear = parseInt(yyyy);
            const dMonth = parseInt(mm) - 1;
            const dDay = parseInt(dd);

            prayerOrder.forEach((pName, pIdx) => {
                let timeStr = day.timings[pName];
                if (!timeStr) return;

                // Remove timezone suffix if present (e.g., "05:00 (AST)")
                timeStr = timeStr.split(' ')[0];

                const [h, m] = timeStr.split(':').map(Number);
                if (isNaN(h) || isNaN(m)) return;

                const prayerDate = new Date(dYear, dMonth, dDay, h, m, 0, 0);
                const pTime = prayerDate.getTime();

                // Skip if Invalid Date or if this prayer time is already in the past
                if (isNaN(pTime) || pTime <= nowTime) return;

                // Unique ID Deterministic logic: (dayIdx * 100) + (pIdx * 10) + type(1-9)
                const baseId = (dayIdx * 100) + (pIdx * 10);

                const prayerNameAr = pName === 'Fajr' ? 'الفجر' : 
                                   pName === 'Dhuhr' ? 'الظهر' : 
                                   pName === 'Asr' ? 'العصر' : 
                                   pName === 'Maghrib' ? 'المغرب' : 'العشاء';

                const aConfig = athanSettings?.prayerConfigs?.[pName];
                const isAthanEnabled = aConfig?.enabled && !athanSettings?.globalMuted;

                // --- Athan OR Prayer Alert ---
                if (isAthanEnabled) {
                    // Muezzin sound name (without extension)
                    const muezzinId = aConfig.muezzinId || 'makkah_classic';
                    const soundFile = muezzinId === 'beep' ? 'athan_beep' : `athan_${muezzinId.replace('muezzin_', '')}`;
                    
                    notifications.push({
                        id: baseId + 1,
                        title: `🕌 أذان ${prayerNameAr}`,
                        body: `حان وقت صلاة ${prayerNameAr} — ${timeStr}`,
                        schedule: { at: prayerDate },
                        sound: soundFile,
                        channelId: 'athan',
                        actionTypeId: 'ATHAN_ACTION',
                        smallIcon: 'ic_stat_icon',
                        iconColor: '#d4a520',
                        extra: { 
                            screen: 'home', 
                            prayer: pName, 
                            prayerAr: prayerNameAr, 
                            type: 'athan', 
                            muezzinId: aConfig.muezzinId 
                        },
                    });

                    // Pre-Athan Reminder
                    if (aConfig.reminderMinutes > 0) {
                        const rTime = pTime - (aConfig.reminderMinutes * 60 * 1000);
                        if (rTime > nowTime) {
                            notifications.push({
                                id: baseId + 2,
                                title: `⏰ ${aConfig.reminderMinutes} دقائق على أذان ${prayerNameAr}`,
                                body: `استعد لصلاة ${prayerNameAr} — سيحين الأذان قريباً`,
                                schedule: { at: new Date(rTime) },
                                sound: aConfig.reminderSound === 'default' ? 'notification_reminder' : aConfig.reminderSound,
                                channelId: 'athan_reminder',
                                smallIcon: 'ic_stat_icon',
                                iconColor: '#c49a16',
                                extra: { screen: 'home', prayer: pName, type: 'athan_reminder' },
                            });
                        }
                    }
                } else if (settings.prayerAlerts) {
                    notifications.push({
                        id: baseId + 3,
                        title: `🕌 حان وقت ${prayerNameAr}`,
                        body: `حان الآن وقت صلاة ${prayerNameAr} — ${timeStr}`,
                        schedule: { at: prayerDate },
                        sound: 'adhan.wav',
                        channelId: 'prayer',
                        actionTypeId: 'PRAYER_ACTION',
                        smallIcon: 'ic_stat_icon',
                        iconColor: '#d4a520',
                        extra: { screen: 'home', prayer: pName },
                    });
                }

                // --- Ramadan Reminders ---
                if (isRamadan) {
                    if (settings.suhoorReminder && pName === 'Fajr') {
                        const sTime = pTime - (30 * 60 * 1000);
                        if (sTime > nowTime) {
                            notifications.push({
                                id: baseId + 4,
                                title: '🌙 تذكير السحور',
                                body: 'تبقى 30 دقيقة على الفجر — لا تنس سحورك',
                                schedule: { at: new Date(sTime) },
                                channelId: 'reminders',
                                smallIcon: 'ic_stat_icon',
                                iconColor: '#d4a520',
                                extra: { screen: 'home' },
                            });
                        }
                    }
                    if (settings.iftarReminder && pName === 'Maghrib') {
                        notifications.push({
                            id: baseId + 5,
                            title: '🌅 حان وقت الإفطار!',
                            body: `اللهم لك صمت وعلى رزقك أفطرت — ${timeStr}`,
                            schedule: { at: prayerDate },
                            channelId: 'prayer',
                            actionTypeId: 'IFTAR_ACTION',
                            smallIcon: 'ic_stat_icon',
                            iconColor: '#d4a520',
                            extra: { screen: 'home' },
                        });
                    }
                }

                // --- Adhkar Reminders ---
                if (settings.morningAdhkar && pName === 'Fajr') {
                    const adTime = pTime + (15 * 60 * 1000);
                    if (adTime > nowTime) {
                        notifications.push({
                            id: baseId + 6,
                            title: '📿 أذكار الصباح',
                            body: 'ابدأ يومك بذكر الله — أذكار الصباح',
                            schedule: { at: new Date(adTime) },
                            channelId: 'reminders',
                            smallIcon: 'ic_stat_icon',
                            iconColor: '#d4a520',
                            actionTypeId: 'ADHKAR_ACTION',
                            extra: { screen: 'adhkar', category: 'morning' },
                        });
                    }
                }
                if (settings.eveningAdhkar && pName === 'Asr') {
                    const adTime = pTime + (15 * 60 * 1000);
                    if (adTime > nowTime) {
                        notifications.push({
                            id: baseId + 7,
                            title: '📿 أذكار المساء',
                            body: 'اختم نهارك بذكر الله — أذكار المساء',
                            schedule: { at: new Date(adTime) },
                            channelId: 'reminders',
                            smallIcon: 'ic_stat_icon',
                            iconColor: '#d4a520',
                            actionTypeId: 'ADHKAR_ACTION',
                            extra: { screen: 'adhkar', category: 'evening' },
                        });
                    }
                }
            });

            // --- Daily Miscellaneous (at specific hour on each day) ---
            if (settings.dailyVerse) {
                const vDate = new Date(dYear, dMonth, dDay, 8, 0, 0);
                if (vDate.getTime() > nowTime) {
                    notifications.push({
                        id: (dayIdx * 100) + 90,
                        title: '📖 آية اليوم',
                        body: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ',
                        schedule: { at: vDate },
                        channelId: 'daily',
                        smallIcon: 'ic_stat_icon',
                        iconColor: '#d4a520',
                        actionTypeId: 'QURAN_ACTION',
                        extra: { screen: 'quran' },
                    });
                }
            }
            if (settings.tasbihReminder && settings.tasbihTime) {
                const [th, tm] = settings.tasbihTime.split(':').map(Number);
                const tDate = new Date(dYear, dMonth, dDay, th, tm, 0);
                if (tDate.getTime() > nowTime) {
                    notifications.push({
                        id: (dayIdx * 100) + 91,
                        title: '🔢 تذكير التسبيح',
                        body: 'سبحان الله وبحمده — افتح التسبيح',
                        schedule: { at: tDate },
                        channelId: 'reminders',
                        smallIcon: 'ic_stat_icon',
                        iconColor: '#d4a520',
                        actionTypeId: 'TASBIH_ACTION',
                        extra: { screen: 'tasbih' },
                    });
                }
            }
        });

        // 4. SCHEDULE: Split into chunks to avoid OS limitations
        if (notifications.length > 0) {
            const chunkSize = 40;
            for (let i = 0; i < notifications.length; i += chunkSize) {
                await LocalNotifications.schedule({ 
                    notifications: notifications.slice(i, i + chunkSize) 
                });
            }
        }
    } catch (err) {
        console.warn('Major error in master scheduler:', err);
    }
}



export async function setupNotificationChannels(): Promise<void> {
    try {
        await LocalNotifications.createChannel({
            id: 'prayer',
            name: 'مواقيت الصلاة',
            description: 'تنبيهات أوقات الصلاة والإفطار',
            importance: 5, // HIGH
            visibility: 1,
            vibration: true,
        });
        await LocalNotifications.createChannel({
            id: 'athan',
            name: 'الأذان',
            description: 'أذان الصلاة — يُشغَّل تلقائياً عند دخول وقت الصلاة',
            importance: 5,
            visibility: 1,
            vibration: true,
            sound: 'athan_makkah',
        });
        await LocalNotifications.createChannel({
            id: 'athan_reminder',
            name: 'تذكير قبل الأذان',
            description: 'تنبيه قبيل وقت الصلاة',
            importance: 4,
            visibility: 1,
            vibration: true,
        });
        await LocalNotifications.createChannel({
            id: 'reminders',
            name: 'التذكيرات',
            description: 'أذكار الصباح والمساء والتسبيح',
            importance: 3, // DEFAULT
            visibility: 1,
            vibration: true,
        });
        await LocalNotifications.createChannel({
            id: 'daily',
            name: 'اليومية',
            description: 'آية اليوم والتحديات اليومية',
            importance: 2, // LOW
            visibility: 1,
            vibration: false,
        });
    } catch {
        // Browser mode
    }
}

export async function setupNotificationActions(): Promise<void> {
    try {
        await LocalNotifications.registerActionTypes({
            types: [
                {
                    id: 'ATHAN_ACTION',
                    actions: [
                        { id: 'mute_athan', title: '🔕 كتم الأذان' },
                        { id: 'open_athan', title: '🕌 فتح شاشة الأذان' },
                    ],
                },
                {
                    id: 'PRAYER_ACTION',
                    actions: [
                        { id: 'mark_prayed', title: '✅ سجّل صلاتي' },
                        { id: 'open_app', title: '📿 أذكار بعد الصلاة' },
                    ],
                },
                {
                    id: 'IFTAR_ACTION',
                    actions: [
                        { id: 'alhamdulillah', title: '🤲 الحمد لله' },
                    ],
                },
                {
                    id: 'ADHKAR_ACTION',
                    actions: [
                        { id: 'open_adhkar', title: '📿 ابدأ الأذكار' },
                    ],
                },
                {
                    id: 'QURAN_ACTION',
                    actions: [
                        { id: 'open_quran', title: '📖 افتح القرآن' },
                    ],
                },
                {
                    id: 'TASBIH_ACTION',
                    actions: [
                        { id: 'open_tasbih', title: '🔢 افتح التسبيح' },
                    ],
                },
            ],
        });
    } catch {
        // Browser mode
    }
}

export function listenToNotificationActions(
    onNavigate: (screen: string, actionId?: string, extra?: any) => void
): () => void {
    try {
        const handle = LocalNotifications.addListener(
            'localNotificationActionPerformed',
            (event) => {
                const screen = event.notification.extra?.screen;
                const actionId = event.actionId;
                const extra = event.notification.extra;
                onNavigate(screen || 'home', actionId, extra);
            }
        );
        return () => { handle.then(h => h.remove()); };
    } catch {
        return () => { };
    }
}
