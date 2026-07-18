import { useNetworkStatus } from "@/hooks/use-network-status";
import { WifiOff, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Fixed bottom banner shown when the device loses internet.
 * Fades in/out smoothly; auto-disappears 3 s after reconnection.
 */
export function OfflineBanner() {
  const status   = useNetworkStatus();
  const [visible, setVisible] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "offline") {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setReconnected(false);
      setWasOffline(true);
      setVisible(true);
    } else if (status === "online" && wasOffline) {
      setReconnected(true);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
        setReconnected(false);
        setWasOffline(false);
      }, 3000);
    }
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [status, wasOffline]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 px-4 py-3
                 animate-in slide-in-from-bottom-2 duration-300"
      style={{
        background: reconnected ? "rgba(22,163,74,0.96)" : "rgba(220,38,38,0.96)",
        backdropFilter: "blur(12px)",
        borderTop: reconnected
          ? "1px solid rgba(134,239,172,0.3)"
          : "1px solid rgba(252,165,165,0.3)",
      }}
    >
      <div className="flex items-center gap-2.5">
        {reconnected ? (
          <RefreshCw className="w-4 h-4 text-white flex-shrink-0" />
        ) : (
          <WifiOff className="w-4 h-4 text-white flex-shrink-0" />
        )}
        <div>
          <p className="text-sm font-bold text-white leading-none">
            {reconnected ? "Back online" : "No internet connection"}
          </p>
          <p className="text-xs text-white/70 mt-0.5">
            {reconnected
              ? "Your connection has been restored."
              : "Check your Wi-Fi or mobile data."}
          </p>
        </div>
      </div>

      {!reconnected && (
        <button
          onClick={() => window.location.reload()}
          className="text-xs font-bold text-white/90 hover:text-white px-3 py-1.5 rounded-full
                     border border-white/30 transition-colors hover:bg-white/10 flex-shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}
