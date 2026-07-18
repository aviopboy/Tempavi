import { useState, useEffect } from "react";

export type NetworkStatus = "online" | "offline" | "unknown";

/**
 * Tracks real-time network connectivity.
 * Uses the browser's navigator.onLine + online/offline events.
 * On Capacitor (Android), @capacitor/network events are also wired in.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(
    typeof navigator !== "undefined"
      ? navigator.onLine ? "online" : "offline"
      : "unknown"
  );

  useEffect(() => {
    const goOnline  = () => setStatus("online");
    const goOffline = () => setStatus("offline");

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);

    // Capacitor Network plugin (available when running as APK)
    let removeCapacitorListener: (() => void) | undefined;
    (async () => {
      try {
        const { Network } = await import("@capacitor/network");
        const status = await Network.getStatus();
        setStatus(status.connected ? "online" : "offline");
        const handle = await Network.addListener("networkStatusChange", (s) => {
          setStatus(s.connected ? "online" : "offline");
        });
        removeCapacitorListener = () => handle.remove();
      } catch {
        // Not running in Capacitor — browser events cover it
      }
    })();

    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
      removeCapacitorListener?.();
    };
  }, []);

  return status;
}
