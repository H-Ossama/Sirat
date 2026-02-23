import { registerPlugin } from '@capacitor/core';

export interface WidgetPlugin {
    update(options: { nameAr: string; time: string; remaining: string }): Promise<void>;
    updateHijri(options: { dayName: string; date: string; year: string }): Promise<void>;
    updateAthkar(options: { title: string; status: string; msg: string }): Promise<void>;
    updateSchedule(options: { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }): Promise<void>;
    updateInspiration(options: { text: string; source: string }): Promise<void>;
}

const Widget = registerPlugin<WidgetPlugin>('Widget');

export default Widget;
