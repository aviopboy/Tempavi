import { useState } from "react";
import { Smartphone, X } from "lucide-react";

const STORE_URL = "https://aviappstore.netlify.app";

const isNativeApp = typeof (window as any).Capacitor !== "undefined";
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Shows a dismissible top banner on mobile browsers suggesting the app.
 * Hidden inside the installed app and on desktop.
 */
export function SmartAppBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (isNativeApp || !isMobile || dismissed) return null;

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
          style={{ background: "rgba(224,32,32,0.15)", border: "1px solid rgba(224,32,32,0.3)" }}
        >
          <Smartphone className="w-4 h-4" style={{ color: "#e02020" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-none">Get the AviStream app</p>
          <p className="text-xs text-white/50 mt-0.5">Better experience — download free</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: "#e02020", color: "#fff" }}
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
