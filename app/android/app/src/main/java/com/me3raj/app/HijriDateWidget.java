package com.me3raj.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class HijriDateWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        
        String dayName = prefs.getString("widget_hijri_day_name", "اليوم");
        String date = prefs.getString("widget_hijri_date", "--");
        String year = prefs.getString("widget_hijri_year", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_hijri_date);
        
        views.setTextViewText(R.id.hijri_day_name, dayName);
        views.setTextViewText(R.id.hijri_date, date);
        views.setTextViewText(R.id.hijri_year, year);

        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("me3raj://app/calendar"));
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_hijri_root, pendingIntent);

        ComponentName thisWidget = new ComponentName(context, HijriDateWidget.class);
        appWidgetManager.updateAppWidget(thisWidget, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
