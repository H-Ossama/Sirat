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
        editor.commit(); // Use commit for immediate write

        // Trigger widget update
        Context context = getContext();
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(context, NextPrayerWidget.class));
        for (int id : ids) {
            NextPrayerWidget.updateAppWidget(context, widgetManager, id);
        }

        call.resolve();
    }

    @PluginMethod
    public void updateHijri(PluginCall call) {
        String dayName = call.getString("dayName");
        String date = call.getString("date");
        String year = call.getString("year");

        SharedPreferences prefs = getContext().getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("widget_hijri_day_name", dayName);
        editor.putString("widget_hijri_date", date);
        editor.putString("widget_hijri_year", year);
        editor.commit();

        Context context = getContext();
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(context, HijriDateWidget.class));
        for (int id : ids) {
            HijriDateWidget.updateAppWidget(context, widgetManager, id);
        }

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
        editor.commit();

        Context context = getContext();
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(context, AthkarWidget.class));
        for (int id : ids) {
            AthkarWidget.updateAppWidget(context, widgetManager, id);
        }

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
        editor.commit();

        Context context = getContext();
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(context, PrayerScheduleWidget.class));
        for (int id : ids) {
            PrayerScheduleWidget.updateAppWidget(context, widgetManager, id);
        }

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
        editor.commit();

        Context context = getContext();
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(context, InspirationWidget.class));
        for (int id : ids) {
            InspirationWidget.updateAppWidget(context, widgetManager, id);
        }

        call.resolve();
    }
}
