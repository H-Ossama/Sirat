package com.me3raj.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class NextPrayerWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        
        // We will store prayer data from the JS side into these pref keys
        String nameAr = prefs.getString("widget_next_prayer_name_ar", "جاري التحميل...");
        String time = prefs.getString("widget_next_prayer_time", "--:--");
        String remaining = prefs.getString("widget_next_prayer_remaining", "افتح التطبيق للتحديث");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_next_prayer);
        
        // Match app colors programmatically if needed, or rely on layout
        views.setTextViewText(R.id.prayer_name, nameAr);
        views.setTextViewText(R.id.prayer_time, time);
        views.setTextViewText(R.id.time_remaining, remaining);

        // Open app on click
        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("me3raj://app/home"));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 101, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_layout_root, pendingIntent);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
