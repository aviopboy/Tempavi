import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";

const STORE_URL = "https://aviappstore.netlify.app";
const APP_PACKAGE = "com.avistream.app";

function isInsideNativeApp() {
  return typeof (window as any).Capacitor !== "undefined";
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isIOS();
}

function forceWebMode() {
  return new URLSearchParams(window.location.search).get("web") === "1";
}

/**
 * Tries to open the native app via an Android Intent URL.
 * If the app is installed  → app opens in foreground.
 * If the app is NOT installed → browser is sent to the store (fallback_url).
 */
function triggerAndroidIntent() {
  const fallback = encodeURIComponent(STORE_URL);
  const intent =
    `intent://${window.location.host}${window.location.pathname}` +
    `#Intent;scheme=https;package=${APP_PACKAGE};` +
    `S.browser_fallback_url=${fallback};end`;
  window.location.href = intent;
}

/**
 * SmartAppBanner:
 *
 * Android  (not in app, not ?web=1) → tries to open app; if missing, sends to store.
 * iOS/desktop                       → shows a dismissible top banner linking to the store.
 * Inside Capacitor native app       → renders nothing.
 */
export function SmartAppBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Never redirect inside the installed app itself
    if (isInsideNativeApp()) return;
    // User explicitly asked to stay on web
    if (forceWebMode()) return;
    // Only auto-redirect on Android
    if (!isAndroid()) return;

    // Small delay so the page has time to paint before we navigate away
    const t = setTimeout(triggerAndroidIntent, 300);
    return () => clearTimeout(t);
  }, []);

  // Nothing to show inside the native app
  if (isInsideNativeApp()) return null;

  // Android: we already triggered the intent redirect — nothing to render
  // (the page will either open the app or navigate to the store)
  if (isAndroid() && !forceWebMode()) return null;

  // iOS / desktop: show a gentle dismissible banner
  if (dismissed) return null;
  if (!isMobile()) return null; // desktop users don't need a banner

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3"
      style={{
        background: "rgba(14,14,18,0.97)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(224,32,32,0.25)",
        boxShadow: "0 2px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* Icon + text */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(224,32,32,0.15)", border: "1px solid rgba(224,32,32,0.3)" }}
        >
          <Smartphone className="w-4 h-4" style={{ color: "#e02020" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-none">Get the AviStream app</p>
          <p className="text-xs text-white/50 mt-0.5 truncate">
            Better experience — download free
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
          style={{
            background: "#e02020",
            color: "#fff",
          }}
        >
          Download
        </a>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="p-1 rounded-full text-white/40 hover:text-white/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
