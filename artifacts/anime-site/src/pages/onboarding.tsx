import { useState, useEffect } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { User, AtSign, ChevronRight, Loader2, Check } from "lucide-react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function validate(firstName: string, lastName: string, username: string) {
  if (!firstName.trim()) return "First name is required.";
  if (!lastName.trim()) return "Last name is required.";
  if (!username.trim()) return "Username is required.";
  if (!USERNAME_RE.test(username))
    return "Username must be 3–20 characters: letters, numbers, underscores only.";
  return null;
}

export default function Onboarding() {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill if Clerk already has values
  useEffect(() => {
    if (user) {
      if (user.firstName) setFirstName(user.firstName);
      if (user.lastName) setLastName(user.lastName);
      const saved = user.unsafeMetadata?.username as string | undefined;
      if (saved) setUsername(saved);
    }
  }, [user]);

  // Skip onboarding if already complete
  useEffect(() => {
    if (isLoaded && user?.unsafeMetadata?.onboardingComplete) {
      const next = sessionStorage.getItem("avistream_next") || "/";
      sessionStorage.removeItem("avistream_next");
      setLocation(next);
    }
  }, [isLoaded, user, setLocation]);

  // Redirect to sign-up if not signed in
  useEffect(() => {
    if (isLoaded && !user) {
      setLocation("/sign-up");
    }
  }, [isLoaded, user, setLocation]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate(firstName, lastName, username);
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      await user!.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: {
          ...user!.unsafeMetadata,
          username: username.trim().toLowerCase(),
          onboardingComplete: true,
        },
      });
      const next = sessionStorage.getItem("avistream_next") || "/";
      sessionStorage.removeItem("avistream_next");
      setLocation(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "#060608" }}>
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-12 relative"
      style={{ background: "linear-gradient(135deg, #060608 0%, #0f0f14 50%, #060608 100%)" }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255,107,53,0.08) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <a href={basePath || "/"} className="flex items-center gap-2 mb-8 justify-center select-none">
          <span className="text-2xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.5px" }}>
            <span style={{ color: "#FF6B35" }}>Avi</span>
            <span className="text-white">Stream</span>
          </span>
        </a>

        {/* Card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "#0d0d10", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,107,53,0.1)", border: "2px solid rgba(255,107,53,0.2)" }}>
              <User className="w-7 h-7" style={{ color: "#FF6B35" }} />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">Set up your profile</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Just a few details to get started — takes 10 seconds.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Alex"
                  autoComplete="given-name"
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none transition-colors placeholder:text-white/20"
                  style={{
                    background: "#1c1c22",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,107,53,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Rivera"
                  autoComplete="family-name"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none transition-colors placeholder:text-white/20"
                  style={{
                    background: "#1c1c22",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,107,53,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                style={{ color: "rgba(255,255,255,0.45)" }}>
                Username
              </label>
              <div className="relative">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  style={{ color: "rgba(255,255,255,0.25)" }} />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="alexrivera"
                  autoComplete="username"
                  maxLength={20}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-white outline-none transition-colors placeholder:text-white/20"
                  style={{
                    background: "#1c1c22",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(255,107,53,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                {USERNAME_RE.test(username) && (
                  <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                3–20 chars · letters, numbers, underscores
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
              style={{ background: "#FF6B35", color: "#fff" }}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Start watching <ChevronRight className="w-4 h-4" /></>
              )}
            </button>

            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              You can change these anytime in your account settings.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
