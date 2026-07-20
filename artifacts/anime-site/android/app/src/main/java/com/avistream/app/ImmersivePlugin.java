package com.avistream.app;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * ImmersivePlugin — hides / shows Android status bar + navigation bar.
 *
 * JS usage (via @capacitor/core Capacitor.Plugins):
 *   Capacitor.Plugins.Immersive.enter()   // hide both bars
 *   Capacitor.Plugins.Immersive.exit()    // restore both bars
 */
@CapacitorPlugin(name = "Immersive")
public class ImmersivePlugin extends Plugin {

    private WindowInsetsControllerCompat getController() {
        return WindowCompat.getInsetsController(
            getActivity().getWindow(),
            getActivity().getWindow().getDecorView()
        );
    }

    @PluginMethod
    public void enter(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WindowInsetsControllerCompat ctrl = getController();
            ctrl.hide(WindowInsetsCompat.Type.systemBars());
            // Bars reappear temporarily on swipe (same as YouTube / Netflix)
            ctrl.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        });
        call.resolve();
    }

    @PluginMethod
    public void exit(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            getController().show(WindowInsetsCompat.Type.systemBars());
        });
        call.resolve();
    }
}
