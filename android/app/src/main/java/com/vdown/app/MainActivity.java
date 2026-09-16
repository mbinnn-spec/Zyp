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

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupNativeBridge();
        handleSendIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSendIntent(intent);
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
