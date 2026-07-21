package com.avistream.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ImmersivePlugin.class);
        super.onCreate(savedInstanceState);

        // Lay out content edge-to-edge so the WebView can use the full screen.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Hide system bars immediately on launch — don't wait for the first
        // focus event, which can arrive late and leave bars visible briefly.
        applyImmersive();

        // The Capacitor WebView can reset window insets after it finishes
        // loading. Re-apply after a short delay to ensure bars stay hidden.
        new Handler(Looper.getMainLooper()).postDelayed(this::applyImmersive, 300);
        new Handler(Looper.getMainLooper()).postDelayed(this::applyImmersive, 800);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Re-apply on every resume (returning from background, permission
        // dialogs, OAuth redirects, etc. all restore bars temporarily).
        applyImmersive();
    }

    /**
     * onWindowFocusChanged fires every time the Activity regains focus
     * (app launch, return from another app, dialog dismissed, etc.).
     * Re-applying immersive mode here is the standard pattern — Android
     * can restore the system bars after certain events, so we need to
     * re-hide them each time focus returns.
     */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersive();
        }
    }

    void applyImmersive() {
        WindowInsetsControllerCompat ctrl = WindowCompat.getInsetsController(
            getWindow(),
            getWindow().getDecorView()
        );
        // Hide both the status bar (top) and navigation bar (bottom).
        ctrl.hide(WindowInsetsCompat.Type.systemBars());
        // Bars reappear temporarily when the user swipes from the edge
        // (same behaviour as Netflix / YouTube).
        ctrl.setSystemBarsBehavior(
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        );
    }
}
