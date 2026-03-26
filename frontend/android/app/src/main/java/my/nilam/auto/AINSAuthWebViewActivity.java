package my.nilam.auto;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;

public class AINSAuthWebViewActivity extends Activity {

    private WebView webView;
    private Handler handler;
    private Runnable poller;
    private boolean finished = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setLayoutParams(new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        // Top bar
        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setBackgroundColor(0xFF4F46E5);
        int dp = dpToPx(14);
        topBar.setPadding(dp, dp, dp, dp);
        topBar.setGravity(Gravity.CENTER_VERTICAL);

        TextView title = new TextView(this);
        title.setText("Sign in to AINS");
        title.setTextColor(Color.WHITE);
        title.setTextSize(15);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        title.setLayoutParams(titleParams);
        topBar.addView(title);

        Button closeBtn = new Button(this);
        closeBtn.setText("✕ Close");
        closeBtn.setTextColor(Color.WHITE);
        closeBtn.setBackgroundColor(Color.TRANSPARENT);
        closeBtn.setTextSize(13);
        closeBtn.setOnClickListener(v -> {
            setResult(Activity.RESULT_CANCELED);
            finish();
        });
        topBar.addView(closeBtn);

        // WebView
        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        // Use a real mobile Chrome UA so AINS doesn't block the request
        settings.setUserAgentString(
            "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36");

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                checkLogin();
            }
        });

        LinearLayout.LayoutParams wvParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        webView.setLayoutParams(wvParams);

        root.addView(topBar);
        root.addView(webView);
        setContentView(root);

        webView.loadUrl("https://ains.moe.gov.my");

        // Poll every 2 s as fallback for client-side Vue Router navigation
        handler = new Handler(Looper.getMainLooper());
        poller = new Runnable() {
            @Override
            public void run() {
                if (!finished) {
                    checkLogin();
                    handler.postDelayed(this, 2000);
                }
            }
        };
        handler.postDelayed(poller, 3000);
    }

    private void checkLogin() {
        if (finished) return;
        // Only check when we are on the AINS origin
        String url = webView.getUrl();
        if (url == null || !url.contains("ains.moe.gov.my")) return;

        webView.evaluateJavascript(
            "(function(){" +
            "  var t = sessionStorage.getItem('jb-app-token');" +
            "  var u = sessionStorage.getItem('jb-app-user');" +
            "  var p = sessionStorage.getItem('jb-app-profile');" +
            "  if (!t) return null;" +
            "  return JSON.stringify({token:t, ssUser:u, ssProfile:p});" +
            "})()",
            value -> {
                if (value == null || value.equals("null")) return;
                // evaluateJavascript wraps string results in outer quotes + escapes inner quotes
                String json = value;
                if (json.startsWith("\"") && json.endsWith("\"")) {
                    json = json.substring(1, json.length() - 1)
                               .replace("\\\"", "\"")
                               .replace("\\\\", "\\");
                }
                onLoginDetected(json);
            }
        );
    }

    private void onLoginDetected(String storageJson) {
        if (finished) return;
        finished = true;
        if (handler != null) handler.removeCallbacks(poller);
        CookieManager.getInstance().flush();

        try {
            JSONObject session = new JSONObject(storageJson);
            JSONArray cookiesArray = new JSONArray();

            // Capture cookies for both AINS domains (includes HttpOnly via CookieManager)
            String[] domains = {"ains.moe.gov.my", "ains-api.moe.gov.my"};
            for (String domain : domains) {
                String raw = CookieManager.getInstance().getCookie(domain);
                if (raw == null) continue;
                for (String pair : raw.split(";")) {
                    pair = pair.trim();
                    int eq = pair.indexOf('=');
                    if (eq < 0) continue;
                    JSONObject c = new JSONObject();
                    c.put("name", pair.substring(0, eq).trim());
                    c.put("value", pair.substring(eq + 1).trim());
                    c.put("domain", domain);
                    c.put("path", "/");
                    c.put("httpOnly", false);
                    c.put("secure", true);
                    c.put("sameSite", "Lax");
                    cookiesArray.put(c);
                }
            }
            session.put("cookies", cookiesArray);

            Intent result = new Intent();
            result.putExtra("sessionData", session.toString());
            setResult(Activity.RESULT_OK, result);
        } catch (Exception e) {
            setResult(Activity.RESULT_CANCELED);
        }
        finish();
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density + 0.5f);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            setResult(Activity.RESULT_CANCELED);
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (handler != null) handler.removeCallbacks(poller);
        super.onDestroy();
    }
}
