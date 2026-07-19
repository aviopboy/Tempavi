import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, Palette, User, Check, Image, FolderOpen,
  LogIn, ChevronRight, Shield, LogOut,
} from "lucide-react";
import { useUser, useClerk, Show } from "@clerk/react";
import { Link } from "wouter";
import { ACCENT_COLORS, BG_PRESETS, useThemeContext } from "@/hooks/use-theme";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Tab = "appearance" | "account";

// ── Small avatar for Settings panel ─────────────────────────────────────────
function MiniAvatar() {
  const { user } = useUser();
  const firstName = (user?.unsafeMetadata?.firstName as string) || user?.firstName || "";
  const lastName = (user?.unsafeMetadata?.lastName as string) || user?.lastName || "";
  const initials = [firstName, lastName]
    .filter(Boolean).map((n) => n[0]).join("").toUpperCase()
    || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "?";

  if (user?.imageUrl) {
    return <img src={user.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover" />;
  }
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
      style={{ background: "linear-gradient(135deg, #FF6B35 0%, #e55a25 100%)" }}>
      {initials}
    </div>
  );
}

// ── Account tab content ───────────────────────────────────────────────────────
function AccountTab({ onClose }: { onClose: () => void }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="space-y-4">
      {/* Signed-in state */}
      <Show when="signed-in">
        {/* Profile card */}
        <Link href="/account" onClick={onClose}>
          <div className="flex items-center gap-3.5 p-4 rounded-2xl cursor-pointer transition-all hover:bg-white/5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {isLoaded ? <MiniAvatar /> : (
              <div className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {[(user?.unsafeMetadata?.firstName as string) || user?.firstName, (user?.unsafeMetadata?.lastName as string) || user?.lastName].filter(Boolean).join(" ") || "Your Account"}
              </p>
              <p className="text-xs text-white/40 truncate mt-0.5">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-white/20" />
          </div>
        </Link>

        {/* Quick links */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
          <Link href="/account" onClick={onClose}>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 border-b text-left"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <User className="w-4 h-4 text-white/40" />
              <span className="text-white/70 font-medium">Personal info</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto" />
            </button>
          </Link>
          <Link href="/account" onClick={onClose}>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 text-left">
              <Shield className="w-4 h-4 text-white/40" />
              <span className="text-white/70 font-medium">Security</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20 ml-auto" />
            </button>
          </Link>
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors hover:bg-red-500/10"
          style={{ border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.8)" }}>
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </Show>

      {/* Signed-out state */}
      <Show when="signed-out">
        <div className="flex flex-col items-center text-center gap-5 py-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--primary) / 0.1)", border: "2px solid hsl(var(--primary) / 0.2)" }}>
            <User className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white mb-1">Sign in to AviStream</h3>
            <p className="text-sm text-white/40 leading-relaxed">
              Track your watch history, sync bookmarks, and manage your account.
            </p>
          </div>
          <div className="flex flex-col w-full gap-2">
            <Link href="/sign-in" onClick={onClose}>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                <LogIn className="w-4 h-4" /> Sign in
              </button>
            </Link>
            <Link href="/sign-up" onClick={onClose}>
              <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-white/5"
                style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Create account
              </button>
            </Link>
          </div>
        </div>
      </Show>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("appearance");
  const { settings, setAccent, setBgPreset, setBgImage } = useThemeContext();
  const [urlInput, setUrlInput] = useState(
    settings.bgPreset === "custom" && !settings.bgImage.startsWith("data:") ? settings.bgImage : ""
  );
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function applyCustomUrl() {
    const v = urlInput.trim();
    if (!v) return;
    setBgPreset("custom");
    setBgImage(v);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) { setBgPreset("custom"); setBgImage(dataUrl); setUrlInput(""); }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return createPortal(
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center sm:justify-end"
      onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

      <div
        className="relative w-full sm:w-[360px] sm:h-full sm:max-h-full flex flex-col overflow-hidden rounded-t-2xl sm:rounded-none sm:rounded-l-2xl"
        style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.08)", zIndex: 1 }}
        onClick={(e) => e.stopPropagation()}>

        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <button onClick={onClose}
            className="sm:hidden flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: "hsl(var(--primary))" }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </button>
          <span className="text-base font-bold text-white">Settings</span>
          <button onClick={onClose}
            className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center transition-colors hover:bg-white/10">
            <X className="w-4 h-4 text-white/50" />
          </button>
          <div className="sm:hidden w-14" />
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          {(["appearance", "account"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors capitalize"
              style={{
                color: tab === t ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                borderBottom: tab === t ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                marginBottom: "-1px",
              }}>
              {t === "appearance" ? <Palette className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7">

          {tab === "appearance" && (
            <>
              {/* Accent color */}
              <section>
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Accent Color</p>
                <div className="grid grid-cols-4 gap-2.5">
                  {ACCENT_COLORS.map((c) => {
                    const active = settings.accent === c.hsl;
                    return (
                      <button key={c.name} onClick={() => setAccent(c.hsl)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
                        style={{
                          background: active ? `${c.hex}18` : "rgba(255,255,255,0.04)",
                          border: active ? `2px solid ${c.hex}` : "2px solid transparent",
                        }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ background: c.hex }}>
                          {active && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-[10px] text-white/60 font-medium">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Background */}
              <section>
                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Background</p>
                <div className="grid grid-cols-3 gap-2">
                  {BG_PRESETS.filter((b) => b.id !== "custom").map((b) => {
                    const active = settings.bgPreset === b.id;
                    return (
                      <button key={b.id} onClick={() => { setBgPreset(b.id); setBgImage(""); }}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
                        style={{
                          border: active ? "2px solid hsl(var(--primary))" : "2px solid rgba(255,255,255,0.08)",
                          background: active ? "hsl(var(--primary) / 0.08)" : "rgba(255,255,255,0.03)",
                        }}>
                        <div className="w-full aspect-video rounded-lg overflow-hidden"
                          style={{ background: b.preview }} />
                        <span className="text-[10px] text-white/60 font-medium">{b.label}</span>
                        {active && <Check className="w-3 h-3" style={{ color: "hsl(var(--primary))" }} />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom image */}
                <div className="mt-3 rounded-xl overflow-hidden"
                  style={{
                    border: settings.bgPreset === "custom" ? "2px solid hsl(var(--primary))" : "2px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}>
                  <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                    <Image className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
                    <span className="text-xs font-semibold text-white/70">Custom Background</span>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  <button onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors hover:bg-white/5 border-b"
                    style={{ color: "hsl(var(--primary))", borderColor: "rgba(255,255,255,0.07)" }}>
                    <FolderOpen className="w-3.5 h-3.5" />
                    Choose from file
                    {settings.bgPreset === "custom" && settings.bgImage.startsWith("data:") && (
                      <span className="text-white/40 font-normal">(image loaded)</span>
                    )}
                  </button>
                  <div className="flex gap-2 p-3">
                    <input ref={urlRef} value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyCustomUrl(); }}
                      placeholder="Or paste image URL…"
                      className="flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/20 min-w-0" />
                    <button onClick={applyCustomUrl}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
                      style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                      Apply
                    </button>
                  </div>
                  {settings.bgPreset === "custom" && settings.bgImage && (
                    <button onClick={() => { setBgPreset("dark"); setBgImage(""); setUrlInput(""); }}
                      className="w-full py-2 text-xs text-white/30 hover:text-white transition-colors border-t text-center"
                      style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                      Remove custom background
                    </button>
                  )}
                </div>
              </section>
            </>
          )}

          {tab === "account" && <AccountTab onClose={onClose} />}
        </div>
      </div>
    </div>,
    document.body
  );
}
