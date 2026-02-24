# Athan Audio Files

Place the following MP3 files in this directory for **in-app** athan playback (when the app is open):

| File Name | Muezzin |
|---|---|
| `athan_makkah.mp3` | أذان مكة المكرمة |
| `athan_afasi.mp3` | مشاري راشد العفاسي |
| `athan_sudais.mp3` | عبد الرحمن السديس |
| `athan_ali_mulla.mp3` | علي أحمد ملا |
| `athan_madinah.mp3` | أذان المدينة المنورة |
| `athan_fajr.mp3` | أذان الفجر (مع التثويب) |
| `athan_turkey.mp3` | أذان تركي — ديانت |
| `athan_beep.mp3` | تنبيه بسيط |

> If no local file is found, the service falls back to the CDN URLs defined in `athanService.ts`.

---

## Background Athan (Android — app closed)

For athan to play via notification sound when the **app is closed**, copy these files to:

```
android/app/src/main/res/raw/
```

Use the **same base names without extension** (Android uses RAW resources):
- `athan_makkah.wav` or `.mp3`
- `athan_afasi.wav` or `.mp3`
- `athan_sudais.wav` or `.mp3`
- `athan_madinah.wav` or `.mp3`
- `athan_fajr.wav` or `.mp3`
- `athan_turkey.wav` or `.mp3`
- `athan_ali_mulla.wav` or `.mp3`
- `notification_reminder.wav` (for pre-athan reminders)

> **Note:** Android notification sounds have a length limit (~60 seconds) for channel sounds.  
> For a full athan (3-5 minutes), use a foreground service or a dedicated audio plugin.  
> This implementation uses Capacitor LocalNotifications which plays the sound as a ringtone,  
> meaning the full athan file will play through **without** keeping the app in the background.
