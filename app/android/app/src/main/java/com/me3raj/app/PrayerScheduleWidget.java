package com.me3raj.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class PrayerScheduleWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        
        String fajr = prefs.getString("widget_schedule_fajr", "--:--");
        String dhuhr = prefs.getString("widget_schedule_dhuhr", "--:--");
        String asr = prefs.getString("widget_schedule_asr", "--:--");
        String maghrib = prefs.getString("widget_schedule_maghrib", "--:--");
        String isha = prefs.getString("widget_schedule_isha", "--:--");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_prayer_schedule);
        
        views.setTextViewText(R.id.row_fajr_time, fajr);
        views.setTextViewText(R.id.row_dhuhr_time, dhuhr);
        views.setTextViewText(R.id.row_asr_time, asr);
        views.setTextViewText(R.id.row_maghrib_time, maghrib);
        views.setTextViewText(R.id.row_isha_time, isha);

        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("me3raj://app/home"));
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_schedule_root, pendingIntent);

        ComponentName thisWidget = new ComponentName(context, PrayerScheduleWidget.class);
        appWidgetManager.updateAppWidget(thisWidget, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
