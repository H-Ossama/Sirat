package com.me3raj.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class AthkarWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
        
        String title = prefs.getString("widget_athkar_title", "أذكار اليوم");
        String status = prefs.getString("widget_athkar_status", "أذكار الصباح: ☀️");
        String msg = prefs.getString("widget_athkar_msg", "اضغط للقراءة");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_athkar);
        
        views.setTextViewText(R.id.athkar_title, title);
        views.setTextViewText(R.id.athkar_status, status);
        views.setTextViewText(R.id.athkar_msg, msg);

        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("me3raj://app/adhkar"));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 103, intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_athkar_root, pendingIntent);
        
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
