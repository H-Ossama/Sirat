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
    prayers: PrayerTime[],
    settings: NotificationSettings,
    isRamadan: boolean = false
): Promise<void> {
    try {
        // Cancel all existing notifications first
        await LocalNotifications.cancel({ notifications: Array.from({ length: 50 }, (_, i) => ({ id: i + 1 })) });

        const notifications: ScheduleOptions['notifications'] = [];
        let id = 1;

        const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        for (const prayer of prayers) {
            if (!prayerOrder.includes(prayer.name)) continue;
            const prayerDate = prayerTimeToDate(prayer.time);

            // Prayer alert
            if (settings.prayerAlerts) {
                notifications.push({
                    id: id++,
                    title: `🕌 حان وقت ${prayer.nameAr}`,
                    body: `حان الآن وقت صلاة ${prayer.nameAr} — ${prayer.time}`,
                    schedule: {
                        at: prayerDate,
                        repeats: true,
                        every: 'day',
                    },
                    sound: 'adhan.wav',
                    channelId: 'prayer',
                    actionTypeId: 'PRAYER_ACTION',
                    smallIcon: 'ic_stat_icon',
                    iconColor: '#d4a520',
                    extra: { screen: 'home', prayer: prayer.name },
                });
            }

            // Suhoor reminder (30 min before Fajr)
            if (isRamadan && settings.suhoorReminder && prayer.name === 'Fajr') {
                const suhoorTime = addMinutes(prayerDate, -30);
                notifications.push({
                    id: id++,
                    title: '🌙 تذكير السحور',
                    body: 'تبقى 30 دقيقة على الفجر — لا تنس سحورك',
                    schedule: {
                        at: suhoorTime,
                        repeats: true,
                        every: 'day',
                    },
                    channelId: 'reminders',
                    smallIcon: 'ic_stat_icon',
                    iconColor: '#d4a520',
                    extra: { screen: 'home' },
                });
            }

            // Iftar reminder (at Maghrib)
            if (isRamadan && settings.iftarReminder && prayer.name === 'Maghrib') {
                notifications.push({
                    id: id++,
                    title: '🌅 حان وقت الإفطار!',
                    body: `اللهم لك صمت وعلى رزقك أفطرت — ${prayer.time}`,
                    schedule: {
                        at: prayerDate,
                        repeats: true,
                        every: 'day',
                    },
                    channelId: 'prayer',
                    actionTypeId: 'IFTAR_ACTION',
                    smallIcon: 'ic_stat_icon',
                    iconColor: '#d4a520',
                    extra: { screen: 'home' },
                });
            }

            // Morning Adhkar (15 min after Fajr)
            if (settings.morningAdhkar && prayer.name === 'Fajr') {
                const adhkarTime = addMinutes(prayerDate, 15);
                notifications.push({
                    id: id++,
                    title: '📿 أذكار الصباح',
                    body: 'ابدأ يومك بذكر الله — أذكار الصباح',
                    schedule: {
                        at: adhkarTime,
                        repeats: true,
                        every: 'day',
                    },
                    channelId: 'reminders',
                    smallIcon: 'ic_stat_icon',
                    iconColor: '#d4a520',
                    actionTypeId: 'ADHKAR_ACTION',
                    extra: { screen: 'adhkar', category: 'morning' },
                });
            }

            // Evening Adhkar (15 min after Asr)
            if (settings.eveningAdhkar && prayer.name === 'Asr') {
                const adhkarTime = addMinutes(prayerDate, 15);
                notifications.push({
                    id: id++,
                    title: '📿 أذكار المساء',
                    body: 'اختم نهارك بذكر الله — أذكار المساء',
                    schedule: {
                        at: adhkarTime,
                        repeats: true,
                        every: 'day',
                    },
                    channelId: 'reminders',
                    smallIcon: 'ic_stat_icon',
                    iconColor: '#d4a520',
                    actionTypeId: 'ADHKAR_ACTION',
                    extra: { screen: 'adhkar', category: 'evening' },
                });
            }
        }

        // Daily Verse — 8:00 AM
        if (settings.dailyVerse) {
            const verseTime = new Date();
            verseTime.setHours(8, 0, 0, 0);
            notifications.push({
                id: id++,
                title: '📖 آية اليوم',
                body: 'شَهْرُ رَمَضَانَ الَّذِي أُنزِلَ فِيهِ الْقُرْآنُ هُدًى لِّلنَّاسِ',
                schedule: {
                    at: verseTime,
                    repeats: true,
                    every: 'day',
                },
                channelId: 'daily',
                smallIcon: 'ic_stat_icon',
                iconColor: '#d4a520',
                actionTypeId: 'QURAN_ACTION',
                extra: { screen: 'quran' },
            });
        }

        // Tasbih reminder
        if (settings.tasbihReminder && settings.tasbihTime) {
            const [th, tm] = settings.tasbihTime.split(':').map(Number);
            const tasbihDate = new Date();
            tasbihDate.setHours(th, tm, 0, 0);
            notifications.push({
                id: id++,
                title: '🔢 تذكير التسبيح',
                body: 'سبحان الله وبحمده — افتح التسبيح',
                schedule: {
                    at: tasbihDate,
                    repeats: true,
                    every: 'day',
                },
                channelId: 'reminders',
                smallIcon: 'ic_stat_icon',
                iconColor: '#d4a520',
                actionTypeId: 'TASBIH_ACTION',
                extra: { screen: 'tasbih' },
            });
        }

        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
        }
    } catch (err) {
        console.warn('Notifications not available (browser mode):', err);
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
