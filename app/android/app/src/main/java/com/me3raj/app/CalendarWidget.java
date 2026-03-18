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
import java.util.Calendar;
import java.util.Locale;

public class CalendarWidget extends AppWidgetProvider {

    private static final String ACTION_PREV_MONTH = "com.me3raj.app.CALENDAR_PREV_MONTH";
    private static final String ACTION_NEXT_MONTH = "com.me3raj.app.CALENDAR_NEXT_MONTH";
    private static final String ACTION_GO_TODAY = "com.me3raj.app.CALENDAR_GO_TODAY";
    private static final String ACTION_TOGGLE_CALENDAR = "com.me3raj.app.CALENDAR_TOGGLE";
    private static final String PREF_NAME = "Me3rajWidgetPrefs";

    private static final String[] HIJRI_MONTHS_AR = {
        "محرم", "صفر", "ربيع الأول", "ربيع الثاني",
        "جمادى الأولى", "جمادى الثانية", "رجب", "شعبان",
        "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
    };

    // Calendar cell IDs: cal_R_C where R=row(1-6), C=col(1-7)
    private static final int[][] CELL_IDS = new int[6][7];

    static {
        try {
            for (int r = 1; r <= 6; r++) {
                for (int c = 1; c <= 7; c++) {
                    CELL_IDS[r - 1][c - 1] = R.id.class.getField("cal_" + r + "_" + c).getInt(null);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (action == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);

        if (action.equals(ACTION_PREV_MONTH)) {
            int offset = prefs.getInt("month_offset", 0);
            prefs.edit().putInt("month_offset", offset - 1).commit();
            updateAllWidgets(context);
        } else if (action.equals(ACTION_NEXT_MONTH)) {
            int offset = prefs.getInt("month_offset", 0);
            prefs.edit().putInt("month_offset", offset + 1).commit();
            updateAllWidgets(context);
        } else if (action.equals(ACTION_GO_TODAY)) {
            prefs.edit().putInt("month_offset", 0).commit();
            updateAllWidgets(context);
        } else if (action.equals(ACTION_TOGGLE_CALENDAR)) {
            boolean isHijri = prefs.getBoolean("is_hijri", true);
            prefs.edit().putBoolean("is_hijri", !isHijri).commit();
            updateAllWidgets(context);
        }
    }

    static void updateAllWidgets(Context context) {
        AppWidgetManager widgetManager = AppWidgetManager.getInstance(context);
        int[] ids = widgetManager.getAppWidgetIds(new ComponentName(context, CalendarWidget.class));
        for (int id : ids) {
            updateAppWidget(context, widgetManager, id);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        boolean isHijri = prefs.getBoolean("is_hijri", true);
        int monthOffset = prefs.getInt("month_offset", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_calendar);

        // Set up button click intents
        views.setOnClickPendingIntent(R.id.btn_prev_month, getPendingIntent(context, ACTION_PREV_MONTH));
        views.setOnClickPendingIntent(R.id.btn_next_month, getPendingIntent(context, ACTION_NEXT_MONTH));
        views.setOnClickPendingIntent(R.id.btn_go_today, getPendingIntent(context, ACTION_GO_TODAY));
        views.setOnClickPendingIntent(R.id.btn_toggle_calendar, getPendingIntent(context, ACTION_TOGGLE_CALENDAR));

        // Open app on root click (but specific buttons override for their areas)
        Intent appIntent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("me3raj://app/calendar"));
        PendingIntent appPendingIntent = PendingIntent.getActivity(context, 100, appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_calendar_root, appPendingIntent);

        // Update toggle button text
        views.setTextViewText(R.id.btn_toggle_calendar, isHijri ? "هجري ⟷ ميلادي" : "ميلادي ⟷ هجري");

        // Get today's info
        Calendar today = Calendar.getInstance();
        int todayDay = today.get(Calendar.DAY_OF_MONTH);
        int todayMonth = today.get(Calendar.MONTH);
        int todayYear = today.get(Calendar.YEAR);

        if (isHijri) {
            // ===== HIJRI MODE =====
            // Use the numeric Hijri data stored in prefs
            SharedPreferences mainPrefs = context.getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
            int currentHijriDay = mainPrefs.getInt("widget_hijri_day_num", 1);
            int currentHijriMonthIndex = mainPrefs.getInt("widget_hijri_month_index", 1) - 1; // 0-based
            int currentHijriYear = 1447;
            
            String storedHijriYear = mainPrefs.getString("widget_hijri_year", "");
            if (!storedHijriYear.isEmpty()) {
                try {
                    currentHijriYear = Integer.parseInt(storedHijriYear.replace("هـ", "").trim());
                } catch (Exception e) {}
            }

            // Calculate target hijri month based on offset
            int targetHijriMonth = currentHijriMonthIndex + monthOffset; // 0-based
            int targetHijriYear = currentHijriYear;

            // Handle month overflow/underflow
            while (targetHijriMonth < 0) {
                targetHijriMonth += 12;
                targetHijriYear--;
            }
            while (targetHijriMonth >= 12) {
                targetHijriMonth -= 12;
                targetHijriYear++;
            }

            // Set header
            views.setTextViewText(R.id.calendar_month_title, HIJRI_MONTHS_AR[targetHijriMonth] + " " + targetHijriYear);

            // Calculate the approximate Gregorian equivalent for subtitle
            // Days offset from today's Hijri to target month's 1st day
            int daysToTarget1st = -(currentHijriDay - 1); // days to go back to 1st of current hijri month
            daysToTarget1st += monthOffset * 30; // approximate: hijri months are ~29-30 days

            Calendar approxGreg = (Calendar) today.clone();
            approxGreg.add(Calendar.DAY_OF_YEAR, daysToTarget1st);
            SimpleDateFormat gregSubFormat = new SimpleDateFormat("MMMM yyyy", Locale.forLanguageTag("ar"));
            views.setTextViewText(R.id.calendar_subtitle, gregSubFormat.format(approxGreg.getTime()));

            // Determine days in this hijri month (alternating 30/29, Dhul Hijjah can be 30 in leap years)
            int daysInHijriMonth = (targetHijriMonth % 2 == 0) ? 30 : 29;
            if (targetHijriMonth == 11) {
                // Dhul Hijjah - check if leap year
                // Hijri leap years in a 30-year cycle: 2,5,7,10,13,16,18,21,24,26,29
                int yearInCycle = targetHijriYear % 30;
                int[] leapYears = {2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29};
                for (int ly : leapYears) {
                    if (yearInCycle == ly) {
                        daysInHijriMonth = 30;
                        break;
                    }
                }
            }

            // Calculate which Gregorian weekday the 1st of this Hijri month falls on
            // Use the offset from today
            int daysToCurrent1st = -(currentHijriDay - 1);
            int daysToTargetMonth1st = daysToCurrent1st + monthOffset * 30; // approximate
            // Better approximation: account for actual hijri month lengths between current and target
            if (monthOffset != 0) {
                daysToTargetMonth1st = daysToCurrent1st;
                int step = monthOffset > 0 ? 1 : -1;
                int mIdx = currentHijriMonthIndex;
                for (int i = 0; i < Math.abs(monthOffset); i++) {
                    if (step > 0) {
                        int mDays = (mIdx % 2 == 0) ? 30 : 29;
                        daysToTargetMonth1st += mDays;
                        mIdx++;
                        if (mIdx >= 12) mIdx = 0;
                    } else {
                        mIdx--;
                        if (mIdx < 0) mIdx = 11;
                        int mDays = (mIdx % 2 == 0) ? 30 : 29;
                        daysToTargetMonth1st -= mDays;
                    }
                }
            }

            Calendar firstOfHijriMonth = (Calendar) today.clone();
            firstOfHijriMonth.add(Calendar.DAY_OF_YEAR, daysToTargetMonth1st);
            int firstDayOfWeek = firstOfHijriMonth.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sunday

            // Determine if today falls in this hijri month
            boolean isTodayMonth = (monthOffset == 0);

            // Clear all cells
            for (int r = 0; r < 6; r++) {
                for (int c = 0; c < 7; c++) {
                    views.setTextViewText(CELL_IDS[r][c], "");
                    views.setTextColor(CELL_IDS[r][c], context.getResources().getColor(R.color.widget_calendar_grid_text));
                    views.setInt(CELL_IDS[r][c], "setBackgroundResource", 0);
                }
            }

            // Fill in hijri days
            int dayCounter = 1;
            for (int r = 0; r < 6; r++) {
                for (int c = 0; c < 7; c++) {
                    int cellIndex = r * 7 + c;
                    if (cellIndex >= firstDayOfWeek && dayCounter <= daysInHijriMonth) {
                        views.setTextViewText(CELL_IDS[r][c], String.valueOf(dayCounter));

                        // Highlight today
                        if (isTodayMonth && dayCounter == currentHijriDay) {
                            views.setInt(CELL_IDS[r][c], "setBackgroundResource", R.drawable.widget_calendar_today_bg);
                            views.setTextColor(CELL_IDS[r][c], context.getResources().getColor(R.color.widget_today_text));
                        } else if (c == 5) {
                            // Friday column - accent color
                            views.setTextColor(CELL_IDS[r][c], context.getResources().getColor(R.color.widget_text_accent));
                        }

                        dayCounter++;
                    }
                }
            }

        } else {
            // ===== GREGORIAN MODE =====
            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.MONTH, monthOffset);

            int targetYear = cal.get(Calendar.YEAR);
            int targetMonth = cal.get(Calendar.MONTH);

            // Set header
            SimpleDateFormat gregFormat = new SimpleDateFormat("MMMM yyyy", Locale.forLanguageTag("ar"));
            views.setTextViewText(R.id.calendar_month_title, gregFormat.format(cal.getTime()));

            // Subtitle: show approximate hijri month
            SharedPreferences mainPrefs = context.getSharedPreferences("Me3rajWidgetPrefs", Context.MODE_PRIVATE);
            String hijriTitle = mainPrefs.getString("widget_cal_hijri_title_" + targetYear + "_" + (targetMonth + 1), "");
            if (!hijriTitle.isEmpty() && monthOffset == 0) {
                views.setTextViewText(R.id.calendar_subtitle, hijriTitle);
            } else {
                views.setTextViewText(R.id.calendar_subtitle, "");
            }

            // Calculate grid
            Calendar temp = (Calendar) cal.clone();
            temp.set(Calendar.DAY_OF_MONTH, 1);
            int firstDayOfWeek = temp.get(Calendar.DAY_OF_WEEK) - 1; // 0=Sunday
            int daysInMonth = temp.getActualMaximum(Calendar.DAY_OF_MONTH);

            // Clear all cells
            for (int r = 0; r < 6; r++) {
                for (int c = 0; c < 7; c++) {
                    views.setTextViewText(CELL_IDS[r][c], "");
                    views.setTextColor(CELL_IDS[r][c], context.getResources().getColor(R.color.widget_calendar_grid_text));
                    views.setInt(CELL_IDS[r][c], "setBackgroundResource", 0);
                }
            }

            // Fill in days
            int dayCounter = 1;
            for (int r = 0; r < 6; r++) {
                for (int c = 0; c < 7; c++) {
                    int cellIndex = r * 7 + c;
                    if (cellIndex >= firstDayOfWeek && dayCounter <= daysInMonth) {
                        views.setTextViewText(CELL_IDS[r][c], String.valueOf(dayCounter));

                        // Highlight today
                        if (dayCounter == todayDay && targetMonth == todayMonth && targetYear == todayYear) {
                            views.setInt(CELL_IDS[r][c], "setBackgroundResource", R.drawable.widget_calendar_today_bg);
                            views.setTextColor(CELL_IDS[r][c], context.getResources().getColor(R.color.widget_today_text));
                        } else if (c == 5) {
                            // Friday column - accent
                            views.setTextColor(CELL_IDS[r][c], context.getResources().getColor(R.color.widget_text_accent));
                        }

                        dayCounter++;
                    }
                }
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent getPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, CalendarWidget.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, action.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}
