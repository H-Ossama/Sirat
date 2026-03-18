package com.me3raj.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Widget")
public class WidgetPlugin extends Plugin {
    
    @PluginMethod
    public void update(PluginCall call) {
        String nameAr = call.getString("nameAr");
        String time = call.getString("time");
        String remaining = call.getString("remaining");

        SharedPreferences prefs = getContext().getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_next_prayer_name_ar", nameAr);
        editor.putString("widget_next_prayer_time", time);
        editor.putString("widget_next_prayer_remaining", remaining);
        editor.apply();

        updateNativeWidgets(NextPrayerWidget.class);
        call.resolve();
    }

    @PluginMethod
    public void updateHijri(PluginCall call) {
        String dayName = call.getString("dayName");
        String date = call.getString("date");
        String year = call.getString("year");
        String gregorian = call.getString("gregorian", "");
        int hDay = call.getInt("hDay", 1);
        int hMonthIndex = call.getInt("hMonthIndex", 1);

        SharedPreferences prefs = getContext().getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_hijri_day_name", dayName);
        editor.putString("widget_hijri_date", date);
        editor.putString("widget_hijri_year", year);
        editor.putString("widget_hijri_gregorian", gregorian);
        editor.putInt("widget_hijri_day_num", hDay);
        editor.putInt("widget_hijri_month_index", hMonthIndex);
        editor.apply();

        updateNativeWidgets(HijriDateWidget.class);
        call.resolve();
    }

    @PluginMethod
    public void updateAthkar(PluginCall call) {
        String title = call.getString("title");
        String status = call.getString("status");
        String msg = call.getString("msg");

        SharedPreferences prefs = getContext().getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_athkar_title", title);
        editor.putString("widget_athkar_status", status);
        editor.putString("widget_athkar_msg", msg);
        editor.apply();

        updateNativeWidgets(AthkarWidget.class);
        call.resolve();
    }

    @PluginMethod
    public void updateSchedule(PluginCall call) {
        String fajr = call.getString("fajr");
        String dhuhr = call.getString("dhuhr");
        String asr = call.getString("asr");
        String maghrib = call.getString("maghrib");
        String isha = call.getString("isha");

        SharedPreferences prefs = getContext().getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_schedule_fajr", fajr);
        editor.putString("widget_schedule_dhuhr", dhuhr);
        editor.putString("widget_schedule_asr", asr);
        editor.putString("widget_schedule_maghrib", maghrib);
        editor.putString("widget_schedule_isha", isha);
        editor.apply();

        updateNativeWidgets(PrayerScheduleWidget.class);
        call.resolve();
    }

    @PluginMethod
    public void updateInspiration(PluginCall call) {
        String text = call.getString("text");
        String source = call.getString("source");

        SharedPreferences prefs = getContext().getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_inspiration_text", text);
        editor.putString("widget_inspiration_source", source);
        editor.apply();

        updateNativeWidgets(InspirationWidget.class);
        call.resolve();
    }

    @PluginMethod
    public void updateCalendar(PluginCall call) {
        int year = call.getInt("year", 0);
        int month = call.getInt("month", 0);
        String data = call.getString("data", "");
        String hijriTitle = call.getString("hijriTitle", "");
        String hijriSubtitle = call.getString("hijriSubtitle", "");

        SharedPreferences prefs = getContext().getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_cal_" + year + "_" + month, data);
        editor.putString("widget_cal_hijri_title_" + year + "_" + month, hijriTitle);
        editor.putString("widget_cal_hijri_subtitle_" + year + "_" + month, hijriSubtitle);
        editor.apply();

        updateNativeWidgets(CalendarWidget.class);
        call.resolve();
    }

    private void updateNativeWidgets(Class<?> widgetClass) {
        Context context = getContext();
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(context, widgetClass));
        for (int id : ids) {
            try {
                if (widgetClass == NextPrayerWidget.class) NextPrayerWidget.updateAppWidget(context, widgetManager, id);
                else if (widgetClass == HijriDateWidget.class) HijriDateWidget.updateAppWidget(context, widgetManager, id);
                else if (widgetClass == AthkarWidget.class) AthkarWidget.updateAppWidget(context, widgetManager, id);
                else if (widgetClass == PrayerScheduleWidget.class) PrayerScheduleWidget.updateAppWidget(context, widgetManager, id);
                else if (widgetClass == InspirationWidget.class) InspirationWidget.updateAppWidget(context, widgetManager, id);
                else if (widgetClass == CalendarWidget.class) CalendarWidget.updateAppWidget(context, widgetManager, id);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

}
