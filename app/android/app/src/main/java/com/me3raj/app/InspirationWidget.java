package com.me3raj.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class InspirationWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        
        String text = prefs.getString("widget_inspiration_text", "جاري التحميل...");
        String source = prefs.getString("widget_inspiration_source", "...");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_inspiration);
        
        views.setTextViewText(R.id.inspiration_text, text);
        views.setTextViewText(R.id.inspiration_source, source);

        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("me3raj://app/quran"));
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_inspiration_root, pendingIntent);

        ComponentName thisWidget = new ComponentName(context, InspirationWidget.class);
        appWidgetManager.updateAppWidget(thisWidget, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
