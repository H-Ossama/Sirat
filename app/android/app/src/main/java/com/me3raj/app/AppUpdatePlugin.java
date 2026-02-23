package com.me3raj.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile boolean updateInProgress = false;

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        JSObject result = new JSObject();
        result.put("canInstall", canInstallUnknownSources());
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Uri packageUri = Uri.parse("package:" + getContext().getPackageName());
                Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, packageUri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception ex) {
            call.reject("Failed to open install permission settings", ex);
        }
    }

    @PluginMethod
    public void startUpdate(PluginCall call) {
        String downloadUrl = call.getString("downloadUrl");
        String fileName = call.getString("fileName", "sirat-latest.apk");

        if (downloadUrl == null || downloadUrl.trim().isEmpty()) {
            call.reject("downloadUrl is required");
            return;
        }

        if (updateInProgress) {
            JSObject result = new JSObject();
            result.put("started", false);
            result.put("requiresInstallPermission", false);
            result.put("message", "Update already in progress");
            call.resolve(result);
            return;
        }

        if (!canInstallUnknownSources()) {
            JSObject result = new JSObject();
            result.put("started", false);
            result.put("requiresInstallPermission", true);
            result.put("message", "Install unknown apps permission is required");
            call.resolve(result);
            return;
        }

        updateInProgress = true;
        JSObject result = new JSObject();
        result.put("started", true);
        result.put("requiresInstallPermission", false);
        call.resolve(result);

        executor.execute(() -> downloadAndInstall(downloadUrl, fileName));
    }

    private boolean canInstallUnknownSources() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return true;
        }
        PackageManager packageManager = getContext().getPackageManager();
        return packageManager.canRequestPackageInstalls();
    }

    private void downloadAndInstall(String downloadUrl, String fileName) {
        HttpURLConnection connection = null;
        InputStream inputStream = null;
        FileOutputStream outputStream = null;

        try {
            notifyProgress("downloading", 0, "Downloading update package...");

            URL url = new URL(downloadUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(20000);
            connection.setReadTimeout(30000);
            connection.connect();

            int responseCode = connection.getResponseCode();
            if (responseCode < 200 || responseCode >= 300) {
                throw new RuntimeException("Download failed with status " + responseCode);
            }

            int contentLength = connection.getContentLength();
            inputStream = connection.getInputStream();

            File downloadDir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
            if (downloadDir == null) {
                downloadDir = getContext().getCacheDir();
            }
            if (!downloadDir.exists()) {
                boolean created = downloadDir.mkdirs();
                if (!created) {
                    throw new RuntimeException("Failed to prepare download folder");
                }
            }

            File apkFile = new File(downloadDir, fileName);
            if (apkFile.exists()) {
                apkFile.delete();
            }

            outputStream = new FileOutputStream(apkFile);

            byte[] buffer = new byte[8192];
            long totalRead = 0;
            int read;
            long lastNotifyMs = 0;

            while ((read = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, read);
                totalRead += read;

                long now = System.currentTimeMillis();
                if (now - lastNotifyMs > 200) {
                    int progress = contentLength > 0 ? (int) ((totalRead * 100) / contentLength) : -1;
                    notifyProgress("downloading", progress, "Downloading update package...");
                    lastNotifyMs = now;
                }
            }

            outputStream.flush();

            notifyProgress("installing", 100, "Opening installer...");
            openInstaller(apkFile);
        } catch (Exception ex) {
            notifyProgress("error", -1, ex.getMessage() != null ? ex.getMessage() : "Update failed");
        } finally {
            updateInProgress = false;
            try {
                if (outputStream != null) outputStream.close();
            } catch (Exception ignored) {
            }
            try {
                if (inputStream != null) inputStream.close();
            } catch (Exception ignored) {
            }
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private void openInstaller(File apkFile) {
        try {
            Uri apkUri;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apkFile
                );
            } else {
                apkUri = Uri.fromFile(apkFile);
            }

            Intent installIntent = new Intent(Intent.ACTION_VIEW);
            installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            installIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            getActivity().runOnUiThread(() -> {
                getContext().startActivity(installIntent);
                notifyProgress("installer_opened", 100, "Installer opened");
            });
        } catch (Exception ex) {
            notifyProgress("error", -1, ex.getMessage() != null ? ex.getMessage() : "Failed to open installer");
        }
    }

    private void notifyProgress(String phase, int progress, String message) {
        JSObject payload = new JSObject();
        payload.put("phase", phase);
        payload.put("progress", progress);
        payload.put("message", message);
        notifyListeners("updateProgress", payload, true);
    }
}