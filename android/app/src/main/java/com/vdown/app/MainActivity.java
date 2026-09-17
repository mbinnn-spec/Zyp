package com.vdown.app;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeWebViewClient;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupNativeBridge();
        setupMediaProxy();
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
    }

    private void setupMediaProxy() {
        if (bridge != null) {
            bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    if (request != null && request.getUrl() != null) {
                        String url = request.getUrl().toString();
                        if (url.contains("akamaized.net") || url.contains("bilivideo.com") || url.contains("bstarstatic.com")) {
                            try {
                                URL targetUrl = new URL(url);
                                HttpURLConnection conn = (HttpURLConnection) targetUrl.openConnection();
                                conn.setRequestMethod("GET");
                                conn.setConnectTimeout(8000);
                                conn.setReadTimeout(12000);
                                conn.setRequestProperty("Referer", "https://www.bilibili.tv/");
                                conn.setRequestProperty("Origin", "https://www.bilibili.tv");
                                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

                                Map<String, String> reqHeaders = request.getRequestHeaders();
                                if (reqHeaders != null) {
                                    for (Map.Entry<String, String> entry : reqHeaders.entrySet()) {
                                        if ("range".equalsIgnoreCase(entry.getKey())) {
                                            conn.setRequestProperty("Range", entry.getValue());
                                        }
                                    }
                                }

                                conn.connect();
                                int responseCode = conn.getResponseCode();

                                String mimeType = conn.getContentType();
                                if (mimeType != null && mimeType.contains(";")) {
                                    mimeType = mimeType.split(";")[0].trim();
                                }
                                if (mimeType == null || mimeType.isEmpty()) {
                                    mimeType = url.contains(".m4s") || url.contains(".mp4") ? "video/mp4" : "*/*";
                                }

                                Map<String, String> respHeaders = new HashMap<>();
                                respHeaders.put("Access-Control-Allow-Origin", "*");
                                respHeaders.put("Access-Control-Allow-Headers", "*");
                                for (Map.Entry<String, java.util.List<String>> entry : conn.getHeaderFields().entrySet()) {
                                    if (entry.getKey() != null && entry.getValue() != null && !entry.getValue().isEmpty()) {
                                        respHeaders.put(entry.getKey(), entry.getValue().get(0));
                                    }
                                }

                                InputStream is = (responseCode >= 200 && responseCode < 400)
                                    ? conn.getInputStream()
                                    : conn.getErrorStream();

                                return new WebResourceResponse(
                                    mimeType,
                                    "UTF-8",
                                    responseCode,
                                    conn.getResponseMessage() != null ? conn.getResponseMessage() : "OK",
                                    respHeaders,
                                    is
                                );
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                    }
                    return super.shouldInterceptRequest(view, request);
                }
            });
        }
    }

    private void setupNativeBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void downloadUrl(String url, String filename, String mimeType) {
                    runOnUiThread(() -> {
                        try {
                            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                            request.setTitle(filename);
                            request.setDescription("VDown — Mengunduh media");
                            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                            if (mimeType != null && !mimeType.isEmpty()) {
                                request.setMimeType(mimeType);
                            }
                            request.allowScanningByMediaScanner();

                            // Ensure Bstation / Bilibili Akamai & Bilivideo CDN accepts the download request
                            if (url != null && (url.contains("bilivideo") || url.contains("bilibili") || url.contains("akamaized") || url.contains("bstar"))) {
                                request.addRequestHeader("Referer", "https://www.bilibili.tv/");
                                request.addRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
                            }

                            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                            if (dm != null) {
                                dm.enqueue(request);
                                Toast.makeText(MainActivity.this, "Mengunduh ke folder Download: " + filename, Toast.LENGTH_SHORT).show();
                            }
                        } catch (Exception e) {
                            e.printStackTrace();
                            Toast.makeText(MainActivity.this, "Gagal mengunduh: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                }

                @JavascriptInterface
                public void saveBase64(String base64Data, String filename, String mimeType) {
                    runOnUiThread(() -> {
                        try {
                            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            if (!downloadsDir.exists()) {
                                downloadsDir.mkdirs();
                            }
                            File destFile = new File(downloadsDir, filename);

                            String cleanBase64 = base64Data;
                            int commaIndex = cleanBase64.indexOf(",");
                            if (commaIndex != -1) {
                                cleanBase64 = cleanBase64.substring(commaIndex + 1);
                            }

                            byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                            try (FileOutputStream fos = new FileOutputStream(destFile)) {
                                fos.write(decodedBytes);
                                fos.flush();
                            }

                            MediaScannerConnection.scanFile(MainActivity.this,
                                new String[]{destFile.getAbsolutePath()},
                                new String[]{mimeType},
                                null
                            );

                            Toast.makeText(MainActivity.this, "✅ Tersimpan di Galeri & Download: " + filename, Toast.LENGTH_SHORT).show();
                        } catch (Exception e) {
                            e.printStackTrace();
                            Toast.makeText(MainActivity.this, "Gagal menyimpan file: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                }

                @JavascriptInterface
                public void shareFile(String filename, String mimeType) {
                    runOnUiThread(() -> {
                        try {
                            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            File file = new File(downloadsDir, filename);
                            if (!file.exists()) {
                                Toast.makeText(MainActivity.this, "File tidak ditemukan di folder Download", Toast.LENGTH_SHORT).show();
                                return;
                            }
                            Uri uri = androidx.core.content.FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                file
                            );
                            Intent intent = new Intent(Intent.ACTION_SEND);
                            intent.setType(mimeType != null && !mimeType.isEmpty() ? mimeType : "*/*");
                            intent.putExtra(Intent.EXTRA_STREAM, uri);
                            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(Intent.createChooser(intent, "Bagikan file via"));
                        } catch (Exception e) {
                            e.printStackTrace();
                            Toast.makeText(MainActivity.this, "Gagal membagikan: " + e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    });
                }

                @JavascriptInterface
                public void openFile(String filename, String mimeType) {
                    runOnUiThread(() -> {
                        try {
                            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            File file = new File(downloadsDir, filename);
                            if (!file.exists()) {
                                Toast.makeText(MainActivity.this, "File tidak ditemukan di folder Download", Toast.LENGTH_SHORT).show();
                                return;
                            }
                            Uri uri = androidx.core.content.FileProvider.getUriForFile(
                                MainActivity.this,
                                getPackageName() + ".fileprovider",
                                file
                            );
                            Intent intent = new Intent(Intent.ACTION_VIEW);
                            intent.setDataAndType(uri, mimeType != null && !mimeType.isEmpty() ? mimeType : "*/*");
                            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                            Toast.makeText(MainActivity.this, "Tidak ada aplikasi untuk membuka file ini: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                }

                @JavascriptInterface
                public boolean deleteFile(String filename) {
                    try {
                        File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        File file = new File(downloadsDir, filename);
                        if (file.exists()) {
                            boolean deleted = file.delete();
                            MediaScannerConnection.scanFile(MainActivity.this, new String[]{file.getAbsolutePath()}, null, null);
                            return deleted;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    return false;
                }
            }, "AndroidBridge");
        }
    }

    private void handleSendIntent(Intent intent) {
        if (intent != null && Intent.ACTION_SEND.equals(intent.getAction()) && "text/plain".equals(intent.getType())) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().postDelayed(() -> {
                    String clean = sharedText.replace("'", "\\'").replace("\n", " ");
                    bridge.getWebView().evaluateJavascript("window.handleSharedText && window.handleSharedText('" + clean + "');", null);
                }, 1000);
            }
        }
    }
}
