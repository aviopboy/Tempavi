import { useState, useEffect, createContext, useContext } from "react";

export type AccentColor = { name: string; hsl: string; hex: string };
export type BgPreset = { id: string; label: string; hsl: string; preview: string };

export const ACCENT_COLORS: AccentColor[] = [
  { name: "Orange",  hsl: "16 100% 60%",  hex: "#ff6b35" },
  { name: "Blue",    hsl: "213 90% 58%",  hex: "#2196f3" },
  { name: "Purple",  hsl: "270 76% 65%",  hex: "#9c54e8" },
  { name: "Green",   hsl: "142 71% 45%",  hex: "#27c166" },
  { name: "Red",     hsl: "0 85% 58%",    hex: "#f33a3a" },
  { name: "Pink",    hsl: "330 90% 65%",  hex: "#ff4d94" },
  { name: "Cyan",    hsl: "188 100% 44%", hex: "#00c2cc" },
  { name: "Gold",    hsl: "38 100% 54%",  hex: "#ffb300" },
];

export const BG_PRESETS: BgPreset[] = [
  { id: "dark",   label: "Dark",         hsl: "240 15% 2.7%", preview: "#060608" },
  { id: "amoled", label: "AMOLED Black", hsl: "0 0% 0%",      preview: "#000000" },
  { id: "navy",   label: "Navy",         hsl: "220 40% 6%",   preview: "#060f1e" },
  { id: "deep",   label: "Deep Purple",  hsl: "270 30% 5%",   preview: "#0a0610" },
  { id: "forest", label: "Forest",       hsl: "150 25% 5%",   preview: "#060e09" },
  { id: "custom", label: "Custom Image", hsl: "",             preview: "" },
];

export type ThemeSettings = {
  accent: string;
  bgPreset: string;
  bgImage: string;
};

const STORAGE_KEY = "avistream_theme";
const DEFAULT: ThemeSettings = { accent: "16 100% 60%", bgPreset: "dark", bgImage: "" };

function load(): ThemeSettings {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r) as ThemeSettings; } catch { /* ignore */ }
  return DEFAULT;
}

function setGlobalBgStyle(imageUrl: string) {
  const STYLE_ID = "avistream-bg-override";
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  if (imageUrl) {
    const safe = imageUrl.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    el.textContent = `
      body {
        background-image: url('${safe}') !important;
        background-size: cover !important;
        background-position: center !important;
        background-attachment: fixed !important;
        background-repeat: no-repeat !important;
        background-color: transparent !important;
      }
      .min-h-screen {
        background: rgba(6,6,8,0.82) !important;
      }
    `;
  } else {
    el.textContent = "";
  }
}

export function applyTheme(s: ThemeSettings) {
  const root = document.documentElement;
  root.style.setProperty("--primary", s.accent);
  root.style.setProperty("--ring", s.accent);
  root.style.setProperty("--accent", s.accent);
  root.style.setProperty("--primary-border", s.accent);
  root.style.setProperty("--accent-border", s.accent);

  const DARK_BG = "240 15% 2.7%";
  const preset = BG_PRESETS.find((b) => b.id === s.bgPreset);

  if (s.bgPreset === "custom" && s.bgImage) {
    root.style.setProperty("--background", DARK_BG);
    setGlobalBgStyle(s.bgImage);
  } else {
    setGlobalBgStyle("");
    root.style.setProperty("--background", preset?.hsl ?? DARK_BG);
  }
}

export function useTheme() {
  const [settings, setSettings] = useState<ThemeSettings>(load);

  useEffect(() => {
    applyTheme(settings);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  useEffect(() => { applyTheme(load()); }, []);

  return {
    settings,
    setAccent: (hsl: string) => setSettings((s) => ({ ...s, accent: hsl })),
    setBgPreset: (id: string) => setSettings((s) => ({ ...s, bgPreset: id })),
    setBgImage: (url: string) => setSettings((s) => ({ ...s, bgImage: url })),
  };
}

export type ThemeContextValue = ReturnType<typeof useTheme>;
export const ThemeContext = createContext<ThemeContextValue | null>(null);
export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used inside ThemeProvider");
  return ctx;
}
