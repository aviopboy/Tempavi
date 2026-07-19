import { useState } from "react";
import { useUser, useClerk, Show } from "@clerk/react";
import { useLocation, Link } from "wouter";
import {
  User, Mail, Shield, LogOut, ChevronRight, Camera,
  Edit2, Check, X, AlertTriangle, Trash2, ArrowLeft,
  Lock, Smartphone, Chrome, Github, Eye, EyeOff,
  BookOpen, Clock, Star, Search, Tv, Bookmark,
} from "lucide-react";
import { useUserData } from "@/hooks/use-user-data";
import { useWatchProgress } from "@/hooks/use-watch-progress";
import { useBookmarks } from "@/hooks/use-bookmarks";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 80 }: { user: ReturnType<typeof useUser>["user"]; size?: number }) {
  const firstName = (user?.unsafeMetadata?.firstName as string) || user?.firstName || "";
  const lastName = (user?.unsafeMetadata?.lastName as string) || user?.lastName || "";
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "?";

  if (user?.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt="Profile"
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
        background: "linear-gradient(135deg, #FF6B35 0%, #e55a25 100%)",
      }}
    >
      {initials}
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────────────────────
function EditableField({
  label, value, onSave, type = "text", placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  type?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (val === value) { setEditing(false); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(val);
      setEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setVal(value);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="py-4 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            {label}
          </p>
          {editing ? (
            <input
              autoFocus
              type={type}
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              placeholder={placeholder}
              className="w-full bg-transparent text-white text-sm outline-none border-b pb-0.5 transition-colors"
              style={{ borderColor: "hsl(var(--primary))" }}
            />
          ) : (
            <p className="text-sm text-white/80 truncate">{value || <span className="text-white/30 italic">Not set</span>}</p>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
        {editing ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={save} disabled={saving}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-green-500/20">
              <Check className="w-3.5 h-3.5 text-green-400" />
            </button>
            <button onClick={cancel}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10">
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
          </div>
        ) : (
          <button onClick={() => { setEditing(true); setVal(value); }}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: "hsl(var(--primary))" }}>
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(var(--primary) / 0.12)" }}>
          <Icon className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
        </div>
        <h2 className="text-sm font-bold text-white">{title}</h2>
      </div>
      <div className="px-5">{children}</div>
    </div>
  );
}

// ── Row link ──────────────────────────────────────────────────────────────────
function RowLink({ icon: Icon, label, sublabel, onClick, danger }: {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 py-3.5 border-b last:border-0 transition-colors hover:bg-white/[0.02] text-left"
      style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <Icon className="w-4 h-4 flex-shrink-0" style={{ color: danger ? "#ef4444" : "rgba(255,255,255,0.4)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: danger ? "#ef4444" : "rgba(255,255,255,0.85)" }}>{label}</p>
        {sublabel && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{sublabel}</p>}
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
    </button>
  );
}

// ── Connected account badge ───────────────────────────────────────────────────
function ConnectedAccountBadge({ provider, identifier }: { provider: string; identifier?: string }) {
  const icons: Record<string, React.ElementType> = {
    google: Chrome,
    github: Github,
    oauth_google: Chrome,
    oauth_github: Github,
  };
  const labels: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    oauth_google: "Google",
    oauth_github: "GitHub",
  };
  const Icon = icons[provider] ?? Shield;
  const label = labels[provider] ?? provider;

  return (
    <div className="flex items-center gap-2.5 py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <Icon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80">{label}</p>
        {identifier && <p className="text-xs text-white/35 truncate">{identifier}</p>}
      </div>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
        style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
        Connected
      </span>
    </div>
  );
}

// ── Danger zone ───────────────────────────────────────────────────────────────
function DangerZone({ onDeleteAccount, error }: { onDeleteAccount: () => void; error?: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [input, setInput] = useState("");

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "hsl(var(--card))", border: "1px solid rgba(239,68,68,0.2)" }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10">
          <AlertTriangle className="w-4 h-4 text-red-400" />
        </div>
        <h2 className="text-sm font-bold text-red-400">Danger Zone</h2>
      </div>
      <div className="px-5 py-4">
        {!confirming ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">Delete account</p>
              <p className="text-xs text-white/35 mt-0.5">Permanently remove your account and all your data</p>
            </div>
            <button onClick={() => setConfirming(true)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
              Delete
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-white/70">Type <strong className="text-white">DELETE</strong> to confirm permanent deletion:</p>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type DELETE"
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: "#1c1c22", border: "1px solid rgba(239,68,68,0.4)" }}
            />
            <div className="flex gap-2">
              <button
                onClick={onDeleteAccount}
                disabled={input !== "DELETE"}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
                style={{ background: "#ef4444", color: "#fff" }}>
                <Trash2 className="w-3 h-3" /> Permanently Delete
              </button>
              <button onClick={() => { setConfirming(false); setInput(""); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors text-white/50 hover:text-white/80">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Account() {
  const { user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const [, setLocation] = useLocation();

  function handleSignOut() {
    signOut({ redirectUrl: basePath || "/" });
  }

  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleteError(null);
    try {
      await user?.delete();
      setLocation("/");
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete account. Please try again.");
    }
  }

  // Not signed in → redirect to sign-in
  if (isLoaded && !user) {
    setLocation("/sign-in");
    return null;
  }

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const externalAccounts = user?.externalAccounts ?? [];
  const { searchHistory, clearWatchHistory, clearSearchHistory, clearBookmarks } = useUserData();
  const { entries: watchEntries } = useWatchProgress();
  const { items: bookmarkItems } = useBookmarks();

  return (
    <Show when="signed-in">
      <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
          style={{ background: "rgba(6,6,8,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <span className="text-base font-bold text-white">Account</span>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

          {/* Hero card */}
          <div className="rounded-2xl overflow-hidden relative"
            style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Gradient accent */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 100% 80% at 50% -30%, rgba(255,107,53,0.08) 0%, transparent 70%)" }} />
            <div className="relative px-6 py-8 flex flex-col items-center text-center gap-4">
              <div className="relative">
                {isLoaded ? (
                  <Avatar user={user} size={88} />
                ) : (
                  <div className="w-[88px] h-[88px] rounded-full bg-white/10 animate-pulse" />
                )}
                <button
                  onClick={() => openUserProfile()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
                  style={{ background: "hsl(var(--primary))" }}>
                  <Camera className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              {isLoaded ? (
                <>
                  <div>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">
                      {[(user?.unsafeMetadata?.firstName as string) || user?.firstName, (user?.unsafeMetadata?.lastName as string) || user?.lastName].filter(Boolean).join(" ") || "Your Account"}
                    </h1>
                    <p className="text-sm text-white/40 mt-0.5">{primaryEmail}</p>
                  </div>
                  <p className="text-xs text-white/30">Manage your AviStream account</p>
                </>
              ) : (
                <div className="space-y-2 w-full">
                  <div className="h-6 w-48 rounded-lg bg-white/10 animate-pulse mx-auto" />
                  <div className="h-4 w-32 rounded-lg bg-white/10 animate-pulse mx-auto" />
                </div>
              )}
            </div>
          </div>

          {/* Personal info */}
          <SectionCard title="Personal info" icon={User}>
            <EditableField
              label="First name"
              value={((user?.unsafeMetadata?.firstName as string) || user?.firstName) ?? ""}
              placeholder="Enter first name"
              onSave={async (v) => {
                await user!.update({
                  unsafeMetadata: { ...user!.unsafeMetadata, firstName: v },
                });
              }}
            />
            <EditableField
              label="Last name"
              value={((user?.unsafeMetadata?.lastName as string) || user?.lastName) ?? ""}
              placeholder="Enter last name"
              onSave={async (v) => {
                await user!.update({
                  unsafeMetadata: { ...user!.unsafeMetadata, lastName: v },
                });
              }}
            />
            <div className="py-4 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>Email</p>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-white/80 truncate">{primaryEmail}</p>
                <button
                  onClick={() => openUserProfile()}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                  style={{ color: "hsl(var(--primary))" }}>
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Security */}
          <SectionCard title="Security" icon={Shield}>
            <RowLink
              icon={Lock}
              label="Change password"
              sublabel="Update your account password"
              onClick={() => openUserProfile()}
            />
            <RowLink
              icon={Smartphone}
              label="Two-factor authentication"
              sublabel="Add an extra layer of security"
              onClick={() => openUserProfile()}
            />
            {externalAccounts.length > 0 && (
              <div className="py-3 border-b last:border-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Connected accounts
                </p>
                {externalAccounts.map((acc) => (
                  <ConnectedAccountBadge
                    key={acc.id}
                    provider={acc.provider}
                    identifier={acc.emailAddress}
                  />
                ))}
              </div>
            )}
            {externalAccounts.length === 0 && (
              <RowLink
                icon={Chrome}
                label="Connect Google"
                sublabel="Sign in faster with your Google account"
                onClick={() => openUserProfile()}
              />
            )}
          </SectionCard>

          {/* Watch History */}
          <SectionCard title="Watch history" icon={BookOpen}>
            <div className="py-3 flex items-center justify-between">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {watchEntries.length} episode{watchEntries.length !== 1 ? "s" : ""} watched
              </p>
              {watchEntries.length > 0 && (
                <button onClick={clearWatchHistory}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "rgba(239,68,68,0.65)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(239,68,68,0.65)")}>
                  Clear all
                </button>
              )}
            </div>
            {watchEntries.slice(0, 6).map((e) => (
              <Link key={e.episodeId} href={`/watch/${e.episodeId}?series=${e.seriesSlug}`}>
                <div className="flex items-center gap-3 py-2.5 border-t -mx-5 px-5 cursor-pointer transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {e.seriesImage ? (
                    <img src={e.seriesImage} alt="" className="w-9 h-12 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-12 rounded-md flex items-center justify-center flex-shrink-0 bg-white/10">
                      <Tv className="w-4 h-4 text-white/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{e.seriesTitle}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                      S{e.season} · Ep {e.episodeNum}
                    </p>
                    <div className="mt-1.5 h-1 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(100, Math.round((e.position / e.duration) * 100))}%`,
                        background: "hsl(var(--primary))",
                      }} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {watchEntries.length === 0 && (
              <p className="py-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>No watch history yet</p>
            )}
          </SectionCard>

          {/* Search History */}
          <SectionCard title="Search history" icon={Search}>
            <div className="py-3 flex items-center justify-between">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {searchHistory.length} saved search{searchHistory.length !== 1 ? "es" : ""}
              </p>
              {searchHistory.length > 0 && (
                <button onClick={clearSearchHistory}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "rgba(239,68,68,0.65)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(239,68,68,0.65)")}>
                  Clear all
                </button>
              )}
            </div>
            {searchHistory.length > 0 ? (
              <div className="pb-4 flex flex-wrap gap-2">
                {searchHistory.map((q) => (
                  <Link key={q} href={`/anime?q=${encodeURIComponent(q)}`}>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all hover:border-white/20"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.65)",
                      }}>
                      <Clock className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
                      {q}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>No search history yet</p>
            )}
          </SectionCard>

          {/* Bookmarks */}
          <SectionCard title="Bookmarks" icon={Bookmark}>
            <div className="py-3 flex items-center justify-between">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {bookmarkItems.length} bookmark{bookmarkItems.length !== 1 ? "s" : ""}
              </p>
              {bookmarkItems.length > 0 && (
                <button onClick={clearBookmarks}
                  className="text-xs font-semibold transition-colors"
                  style={{ color: "rgba(239,68,68,0.65)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(239,68,68,0.65)")}>
                  Clear all
                </button>
              )}
            </div>
            {bookmarkItems.slice(0, 5).map((b) => (
              <Link key={b.id} href={`/watch/${b.episodeId}?series=${b.seriesSlug}`}>
                <div className="flex items-center gap-3 py-2.5 border-t -mx-5 px-5 cursor-pointer transition-colors hover:bg-white/[0.03]"
                  style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {b.seriesImage ? (
                    <img src={b.seriesImage} alt="" className="w-9 h-12 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-12 rounded-md flex items-center justify-center flex-shrink-0 bg-white/10">
                      <Tv className="w-4 h-4 text-white/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{b.seriesTitle}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      S{b.season} · Ep {b.episodeNum} · <span className="font-mono">{b.timestamp}</span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {bookmarkItems.length === 0 && (
              <p className="py-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>No bookmarks yet</p>
            )}
          </SectionCard>

          {/* Sign out */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.07)" }}>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5">
                <LogOut className="w-4 h-4 text-white/50" />
              </div>
              <span className="text-sm font-semibold text-white/70">Sign out</span>
              <ChevronRight className="w-4 h-4 text-white/20 ml-auto" />
            </button>
          </div>

          {/* Danger zone */}
          <DangerZone onDeleteAccount={handleDeleteAccount} error={deleteError} />

          <p className="text-center text-xs text-white/20 pb-4">
            AviStream · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </Show>
  );
}
