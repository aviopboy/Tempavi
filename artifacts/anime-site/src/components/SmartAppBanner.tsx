import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";

const STORE_URL = "https://aviappstore.netlify.app";
const SKIP_PARAM = "skip_redirect";

// Are we running inside the installed Capacitor app?
export const isNativeApp = typeof (window as any).Capacitor !== "undefined";
const isAndroid = /Android/i.test(navigator.userAgent);
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function alreadySkipped() {
  return new URLSearchParams(window.location.search).has(SKIP_PARAM);
}

/**
 * Android intent URL:
 *  – If AviStream is installed → Android opens the app immediately.
 *  – If not installed         → browser navigates to the fallback URL
 *    (same page + ?skip_redirect=1) so we don't loop.
 */
function buildIntentUrl(): string {
  const sep = window.location.search ? "&" : "?";
  const fallback = encodeURIComponent(
    `${window.location.href}${sep}${SKIP_PARAM}=1`,
  );
  return (
    `intent://open#Intent;` +
    `scheme=avistream;` +
    `package=com.avistream.app;` +
    `S.browser_fallback_url=${fallback};` +
    `end`
  );
}

/**
 * AppGate — handles three scenarios:
 *
 * 1. Inside native app        → renders nothing (Capacitor is already the host).
 * 2. Android browser, no app  → shows a "Download" banner (came back via fallback URL).
 * 3. Android browser, app OK  → immediately fires intent URL; app opens, page stays put.
 * 4. Desktop / non-Android    → renders nothing (web works normally).
 */
export function SmartAppBanner() {
  // null = deciding, true = show "get the app" banner, false = hide everything
  const [showBanner, setShowBanner] = useState<boolean | null>(null);

  useEffect(() => {
    // Never interfere when already inside the native app
    if (isNativeApp) { setShowBanner(false); return; }
    // Desktop — just use the web
    if (!isMobile) { setShowBanner(false); return; }
    // Came back from intent fallback → app not installed → show banner
    if (alreadySkipped()) { setShowBanner(true); return; }

    if (isAndroid) {
      // Fire the intent. If app is installed Android intercepts it and
      // opens AviStream — the browser tab stays where it is.
      // If not installed, browser follows browser_fallback_url.
      window.location.href = buildIntentUrl();
      // Keep the page invisible while Android decides (≈ 800 ms is plenty).
      // If the app opens the user is gone; if fallback fires the param reloads.
      setShowBanner(false);
    } else {
      // iOS — no native build yet; fall through to web
      setShowBanner(false);
    }
  }, []);

  if (!showBanner) return null;

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
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: "rgba(224,32,32,0.15)",
            border: "1px solid rgba(224,32,32,0.3)",
          }}
        >
          <Smartphone className="w-4 h-4" style={{ color: "#e02020" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-none">
            Get the AviStream app
          </p>
          <p className="text-xs text-white/50 mt-0.5">
            Better experience — download free
          </p>
        </div>
      </div>

      <a
        href={STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
        style={{ background: "#e02020", color: "#fff" }}
      >
        Download
      </a>
    </div>
  );
}
