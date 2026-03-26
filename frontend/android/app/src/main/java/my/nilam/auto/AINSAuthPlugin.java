package my.nilam.auto;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

@CapacitorPlugin(name = "AINSAuth")
public class AINSAuthPlugin extends Plugin {

    @PluginMethod
    public void openLogin(PluginCall call) {
        saveCall(call);
        Intent intent = new Intent(getContext(), AINSAuthWebViewActivity.class);
        startActivityForResult(call, intent, "loginActivityResult");
    }

    @ActivityCallback
    private void loginActivityResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            String sessionJson = result.getData().getStringExtra("sessionData");
            try {
                JSObject ret = new JSObject(sessionJson != null ? sessionJson : "{}");
                call.resolve(ret);
            } catch (JSONException e) {
                call.reject("Failed to parse session: " + e.getMessage());
            }
        } else {
            call.reject("Login was cancelled");
        }
    }
}
