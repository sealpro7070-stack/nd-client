package my.nilam.auto;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AINSAuthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
