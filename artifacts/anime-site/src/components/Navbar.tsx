import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Tv, Settings, User, LogIn, Tag, ChevronDown, Clock } from "lucide-react";
import { useAuth, useUser, useClerk } from "@clerk/react";
import { useSearchAnime, getSearchAnimeQueryKey } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { SettingsModal } from "@/components/SettingsModal";
import { useUserData } from "@/hooks/use-user-data";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/anime", label: "Anime" },
  { href: "/movies", label: "Movies" },
];

const POPULAR_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Isekai", "Mecha", "Mystery", "Romance",
  "Sci-Fi", "Shounen", "Shoujo", "Slice of Life", "Supernatural",
  "Sports", "Thriller", "Martial Arts", "School", "Historical",
];

type SearchResult = { slug: string; image?: string | null; title: string };

type NavbarProps = {
  settingsOpen: boolean;
  onSettingsToggle: () => void;
  onSettingsClose: () => void;
};

// Small avatar for navbar
function NavAvatar() {
  const { user } = useUser();
  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n![0])
    .join("")
    .toUpperCase() || user?.emailAddresses?.[0]?.emailAddress?.[0]?.toUpperCase() || "?";

  if (user?.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt="Profile"
        className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/40"
      />
    );
  }

  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ring-2 ring-primary/40"
      style={{ background: "linear-gradient(135deg, #FF6B35 0%, #e55a25 100%)" }}
    >
      {initials}
    </div>
  );
}

// Genres dropdown for desktop
function GenresDropdown({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer"
        style={{
          color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          background: isActive ? "hsl(var(--primary) / 0.12)" : "transparent",
        }}
      >
        Genres
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-56 rounded-xl overflow-hidden shadow-2xl z-50"
          style={{
            background: "hsl(var(--card))",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="p-2 grid grid-cols-2 gap-0.5">
            {POPULAR_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setLocation(`/genre/${encodeURIComponent(g)}`);
                  setOpen(false);
                }}
                className="text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/8 truncate"
                style={{ color: "hsl(var(--muted-foreground))" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "hsl(var(--muted-foreground))"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar({ settingsOpen, onSettingsToggle, onSettingsClose }: NavbarProps) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileGenresOpen, setMobileGenresOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded } = useAuth();
  const { searchHistory, pushSearch } = useUserData();

  const debouncedQ = useDebounce(query, 350);
  const { data: searchData } = useSearchAnime(
    { q: debouncedQ },
    { query: { enabled: debouncedQ.length > 1, queryKey: getSearchAnimeQueryKey({ q: debouncedQ }) } }
  );
  const results = searchData?.results?.slice(0, 6) ?? [];

  function handleSelect(slug: string) {
    setQuery("");
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setLocation(`/series/${slug}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length > 1) {
      pushSearch(q);
      setLocation(`/anime?q=${encodeURIComponent(q)}`);
      setQuery("");
      setMobileSearchOpen(false);
      setMobileOpen(false);
    }
  }

  function isActive(href: string) {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  }

  const isGenreActive = location.startsWith("/genre");

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center gap-2 px-4 md:px-6"
        style={{
          background: "rgba(6,6,8,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid hsl(var(--border))",
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 select-none mr-2">
          <span className="text-xl font-extrabold tracking-tight" style={{ letterSpacing: "-0.5px" }}>
            <span className="text-primary">Avi</span>
            <span className="text-foreground">Stream</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              <span className="px-3.5 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer"
                style={{
                  color: isActive(l.href) ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  background: isActive(l.href) ? "hsl(var(--primary) / 0.12)" : "transparent",
                }}>
                {l.label}
              </span>
            </Link>
          ))}
          {/* Genres dropdown */}
          <GenresDropdown isActive={isGenreActive} />
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5">
          {/* Desktop search */}
          <div className="hidden md:block relative">
            <DesktopSearch
              query={query}
              setQuery={setQuery}
              results={results}
              debouncedQ={debouncedQ}
              onSelect={handleSelect}
              onSubmit={handleSubmit}
              recentSearches={searchHistory.slice(0, 5)}
              onSearchSelect={(q) => {
                pushSearch(q);
                setLocation(`/anime?q=${encodeURIComponent(q)}`);
              }}
            />
          </div>

          {/* Mobile search toggle */}
          <button
            onClick={() => { setMobileSearchOpen((v) => !v); setMobileOpen(false); }}
            className="p-2 rounded-lg transition-colors md:hidden"
            style={{ color: "hsl(var(--muted-foreground))" }}
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Auth buttons — desktop */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Show account when signed in */}
            {isLoaded && isSignedIn ? (
              <Link href="/account">
                <button
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <NavAvatar />
                  <span className="text-white/70">Account</span>
                </button>
              </Link>
            ) : (
              /* Show sign-in by default (also during Clerk loading) */
              <>
                <Link href="/sign-in">
                  <button
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{ background: "hsl(var(--primary))", color: "#fff" }}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign in</span>
                  </button>
                </Link>
                <Link href="/sign-up">
                  <button
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border"
                    style={{ background: "transparent", borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Register</span>
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Settings */}
          <button
            onClick={onSettingsToggle}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
            style={{ color: settingsOpen ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => { setMobileOpen((v) => !v); setMobileSearchOpen(false); }}
            className="p-2 rounded-lg transition-colors md:hidden"
            style={{ color: "hsl(var(--muted-foreground))" }}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Settings modal */}
      {settingsOpen && <SettingsModal onClose={onSettingsClose} />}

      {/* Mobile search bar */}
      {mobileSearchOpen && (
        <div className="fixed top-[60px] left-0 right-0 z-40 px-4 py-3 md:hidden"
          style={{ background: "rgba(6,6,8,0.98)", backdropFilter: "blur(20px)", borderBottom: "1px solid hsl(var(--border))" }}>
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") { setMobileSearchOpen(false); setQuery(""); } }}
                placeholder="Search anime..."
                className="w-full pl-10 pr-10 py-3 text-sm rounded-xl outline-none"
                style={{
                  background: "hsl(var(--secondary))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--foreground))",
                  fontSize: "16px",
                }}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
          {results.length > 0 && debouncedQ.length > 1 && (
            <div className="mt-2 rounded-xl overflow-hidden overflow-y-auto max-h-[50vh]"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}>
              {results.map((r: SearchResult) => (
                <button key={r.slug} onClick={() => handleSelect(r.slug)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 border-b border-white/5 last:border-0 active:bg-white/10">
                  <div className="w-10 h-14 rounded-md overflow-hidden flex-shrink-0 bg-white/10">
                    {r.image
                      ? <img src={r.image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Tv className="w-4 h-4 text-white/30" /></div>}
                  </div>
                  <span className="text-sm font-medium text-foreground line-clamp-2">{r.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed top-[60px] left-0 right-0 z-40 px-4 pt-3 pb-4 flex flex-col gap-1 md:hidden"
          style={{ background: "hsl(var(--card))", borderBottom: "1px solid hsl(var(--border))" }}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}>
              <span className="block px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                style={{
                  color: isActive(l.href) ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  background: isActive(l.href) ? "hsl(var(--primary) / 0.12)" : "transparent",
                }}>
                {l.label}
              </span>
            </Link>
          ))}

          {/* Genres expandable section */}
          <div>
            <button
              onClick={() => setMobileGenresOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                color: isGenreActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                background: isGenreActive ? "hsl(var(--primary) / 0.12)" : "transparent",
              }}
            >
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4" /> Genres
              </span>
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{ transform: mobileGenresOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {mobileGenresOpen && (
              <div className="mt-1 ml-4 flex flex-wrap gap-1.5 px-2 pb-2">
                {POPULAR_GENRES.map((g) => (
                  <Link key={g} href={`/genre/${encodeURIComponent(g)}`} onClick={() => setMobileOpen(false)}>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all"
                      style={location.startsWith(`/genre/${encodeURIComponent(g)}`)
                        ? { background: "hsl(var(--primary))", color: "#fff" }
                        : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}
                    >
                      {g}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t flex flex-col gap-1" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <button
              onClick={() => { setMobileOpen(false); onSettingsToggle(); }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left"
              style={{ color: "hsl(var(--muted-foreground))" }}>
              <Settings className="w-4 h-4" /> Settings
            </button>

            {/* Signed in: account link */}
            {isLoaded && isSignedIn ? (
              <>
                <Link href="/account" onClick={() => setMobileOpen(false)}>
                  <span className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                    style={{ color: "hsl(var(--muted-foreground))" }}>
                    <NavAvatar /> Account
                  </span>
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); signOut({ redirectUrl: basePath || "/" }); }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left text-red-400/80">
                  <LogIn className="w-4 h-4 rotate-180" /> Sign out
                </button>
              </>
            ) : (
              /* Show sign-in/register by default (also during Clerk loading) */
              <>
                <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                  <span className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer"
                    style={{ color: "hsl(var(--primary))" }}>
                    <LogIn className="w-4 h-4" /> Sign in
                  </span>
                </Link>
                <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
                  <span className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold cursor-pointer"
                    style={{ color: "hsl(var(--muted-foreground))" }}>
                    <User className="w-4 h-4" /> Create account
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── Desktop search bar extracted as a component ──────────────────────────────
function DesktopSearch({
  query, setQuery, results, debouncedQ, onSelect, onSubmit, recentSearches, onSearchSelect,
}: {
  query: string;
  setQuery: (v: string) => void;
  results: SearchResult[];
  debouncedQ: string;
  onSelect: (slug: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  recentSearches?: string[];
  onSearchSelect?: (q: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const showRecent = focused && query.length === 0 && (recentSearches?.length ?? 0) > 0;
  const showResults = focused && results.length > 0 && debouncedQ.length > 1;

  return (
    <form onSubmit={onSubmit} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Search anime..."
          className="w-44 focus:w-60 transition-all duration-200 pl-8 pr-8 py-1.5 text-xs rounded-lg outline-none"
          style={{
            background: "hsl(var(--secondary))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
        />
        {query && (
          <button type="button" onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Recent searches dropdown */}
      {showRecent && (
        <div
          className="absolute top-full right-0 mt-1.5 w-72 rounded-xl overflow-hidden shadow-2xl"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", zIndex: 9999 }}
        >
          <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            Recent searches
          </p>
          {recentSearches!.map((q) => (
            <button key={q} type="button" onClick={() => { setQuery(q); onSearchSelect?.(q); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 border-t border-white/5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0 text-white/25" />
              <span className="text-xs font-medium text-white/70 truncate">{q}</span>
            </button>
          ))}
        </div>
      )}

      {/* Live search results dropdown */}
      {showResults && (
        <div
          className="absolute top-full right-0 mt-1.5 w-72 rounded-xl overflow-hidden overflow-y-auto max-h-80 shadow-2xl"
          style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", zIndex: 9999 }}
        >
          {results.map((r) => (
            <button key={r.slug} onClick={() => onSelect(r.slug)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 border-b border-white/5 last:border-0">
              <div className="w-8 h-11 rounded-md overflow-hidden flex-shrink-0 bg-white/10">
                {r.image
                  ? <img src={r.image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><Tv className="w-3 h-3 text-white/30" /></div>}
              </div>
              <span className="text-xs font-medium text-foreground line-clamp-2">{r.title}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
