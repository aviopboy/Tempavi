import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRoute, Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Loader2,
  AlertCircle, Play, Tv, Captions, Bookmark, Trash2, Plus, X, Clock, Pencil, Check,
  CheckCircle2, SkipForward, Link2,
} from "lucide-react";
import {
  useGetAnimeEpisode, getGetAnimeEpisodeQueryKey,
  useSearchAnime, getSearchAnimeQueryKey,
  useGetAnimeSeries, getGetAnimeSeriesQueryKey,
} from "@workspace/api-client-react";
import type { AnimeCard, FlatEpisode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { addRecentWatched } from "@/hooks/use-recent-watched";
import { useBookmarks } from "@/hooks/use-bookmarks";
import type { Bookmark as BookmarkType } from "@/hooks/use-bookmarks";
import { useUserData } from "@/hooks/use-user-data";
import {
  saveProgress, getProgress, markWatched,
  DEFAULT_DURATION, WATCHED_THRESHOLD, isWatched, getProgressPct,
} from "@/hooks/use-watch-progress";

type AudioLang = "japanese" | "english" | "hindi" | "tamil" | "malayalam";
const LANG_KEY = "avistream_audio";
const SUB_KEY = "avistream_sub";

const LANGUAGES: { value: AudioLang; label: string }[] = [
  { value: "japanese", label: "Japanese" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "tamil", label: "Tamil" },
  { value: "malayalam", label: "Malayalam" },
];

/* ─── Timestamp helpers ─── */
function parseTimestamp(s: string): string {
  const cleaned = s.replace(/[^\d:]/g, "");
  const parts = cleaned.split(":").map(Number);
  if (parts.length === 1) {
    const m = parts[0] ?? 0;
    return `${m}:00`;
  }
  const [m = 0, sec = 0] = parts;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Parse "14m32s", "14:32", or "872" (raw seconds) into "14:32" */
function parseShareTimestamp(t: string): string {
  const mMatch = t.match(/^(\d+)m(\d+)s$/);
  if (mMatch) return `${mMatch[1]}:${(mMatch[2] ?? "0").padStart(2, "0")}`;
  const colonMatch = t.match(/^(\d+):(\d+)$/);
  if (colonMatch) return `${colonMatch[1]}:${(colonMatch[2] ?? "0").padStart(2, "0")}`;
  const secsMatch = t.match(/^(\d+)$/);
  if (secsMatch) return formatSeconds(parseInt(secsMatch[1] ?? "0"));
  return t;
}

/** "14:32" → "14m32s" for URL encoding */
function toShareParam(ts: string): string {
  return ts.replace(":", "m") + "s";
}

/* ─── Bookmark Panel ─── */
function BookmarkPanel({
  episodeId, seriesSlug, seriesTitle, seriesImage, episodeTitle, season, episodeNum,
  anchorRect, onPlay, onClose,
}: {
  episodeId: string; seriesSlug: string; seriesTitle: string; seriesImage: string | null;
  episodeTitle: string; season: string; episodeNum: string;
  anchorRect: DOMRect | null;
  onPlay: (timestamp: string) => void;
  onClose: () => void;
}) {
  const { items, addBookmark, removeBookmark, updateBookmark } = useBookmarks();
  const { pushBookmark, removeBookmark: cloudRemove, updateBookmark: cloudUpdate } = useUserData();
  const epBookmarks = items.filter((b) => b.episodeId === episodeId);

  const [adding, setAdding] = useState(false);
  const [tsInput, setTsInput] = useState("0:00");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 50);
  }, [adding]);

  const handleAdd = () => {
    const ts = parseTimestamp(tsInput.trim() || "0:00");
    const newBookmark = addBookmark({ episodeId, seriesSlug, seriesTitle, seriesImage, episodeTitle, season, episodeNum, timestamp: ts });
    pushBookmark(newBookmark);
    setAdding(false);
    setTsInput("0:00");
  };

  const copyShareLink = (ts: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("t", toShareParam(ts));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {/* ignore */});
  };

  const top = anchorRect ? anchorRect.bottom + 8 : 64;
  const right = anchorRect ? window.innerWidth - anchorRect.right : 16;

  return createPortal(
    <div
      data-bookmark-panel
      onMouseDown={(e) => e.stopPropagation()}
      className="w-72 rounded-2xl border overflow-hidden shadow-2xl"
      style={{
        position: "fixed", top, right, zIndex: 9999,
        background: "hsl(var(--card))", borderColor: "rgba(255,255,255,0.1)",
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2">
          <Bookmark className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
          <span className="text-sm font-semibold text-white">Bookmarks</span>
        </div>
        <div className="flex items-center gap-1">
          {!adding && (
            <button onClick={() => setAdding(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              title="Add bookmark at timestamp">
              <Plus className="w-3.5 h-3.5 text-white/60 hover:text-white" />
            </button>
          )}
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10">
            <X className="w-3.5 h-3.5 text-white/40 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
          <input
            ref={inputRef}
            value={tsInput}
            onChange={(e) => setTsInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="e.g. 12:34"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25 min-w-0"
          />
          <button onClick={() => setAdding(false)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors px-1">
            Cancel
          </button>
          <button onClick={handleAdd}
            className="text-xs font-semibold px-2.5 py-1 rounded-full transition-colors"
            style={{ background: "hsl(var(--primary))", color: "#fff" }}>
            Save
          </button>
        </div>
      )}

      {/* Bookmark list */}
      <div className="max-h-64 overflow-y-auto scrollbar-none">
        {epBookmarks.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Bookmark className="w-7 h-7 mx-auto text-white/15" />
            <p className="text-xs text-white/30">No bookmarks yet.</p>
            <button onClick={() => setAdding(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}>
              + Add first bookmark
            </button>
          </div>
        ) : (
          <div className="py-1">
            {epBookmarks.map((b) => (
              <BookmarkRow key={b.id} bookmark={b}
                onPlay={() => onPlay(b.timestamp)}
                onDelete={() => { removeBookmark(b.id); cloudRemove(b.id); }}
                onEdit={(ts) => { updateBookmark(b.id, ts); cloudUpdate(b.id, ts); }}
                onShare={() => copyShareLink(b.timestamp)} />
            ))}
          </div>
        )}
      </div>

      {/* Share hint or episode label */}
      <div className="px-4 py-2 border-t flex items-center justify-between gap-2" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <p className="text-[10px] text-white/25 truncate">{episodeTitle}</p>
        {copied && <span className="text-[10px] text-green-400 flex-shrink-0">Link copied!</span>}
      </div>
    </div>,
    document.body
  );
}

function BookmarkRow({ bookmark, onPlay, onDelete, onEdit, onShare }: {
  bookmark: BookmarkType; onPlay: () => void; onDelete: () => void; onEdit: (ts: string) => void; onShare: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tsInput, setTsInput] = useState(bookmark.timestamp);
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) setTimeout(() => editRef.current?.focus(), 30);
  }, [editing]);

  const commitEdit = () => {
    const ts = parseTimestamp(tsInput.trim() || bookmark.timestamp);
    onEdit(ts);
    setTsInput(ts);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(255,255,255,0.04)" }}>
        <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
        <input
          ref={editRef}
          value={tsInput}
          onChange={(e) => setTsInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(false); }}
          className="flex-1 bg-transparent text-sm font-mono font-semibold text-white outline-none min-w-0"
        />
        <button onClick={() => setEditing(false)}
          className="text-xs text-white/30 hover:text-white/60 transition-colors px-1">
          Cancel
        </button>
        <button onClick={commitEdit}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "hsl(var(--primary))" }}>
          <Check className="w-3 h-3 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
        <Clock className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-mono font-semibold text-white">{bookmark.timestamp}</p>
        <p className="text-[10px] text-white/35">
          {new Date(bookmark.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </p>
      </div>
      <button onClick={onPlay}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-110"
        style={{ background: "hsl(var(--primary))" }}
        title="Play from this timestamp">
        <Play className="w-3 h-3 fill-white text-white ml-0.5" />
      </button>
      <button onClick={onShare}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
        style={{ opacity: 0.45 }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
        title="Copy shareable link to this timestamp">
        <Link2 className="w-3 h-3 text-white" />
      </button>
      <button onClick={() => { setTsInput(bookmark.timestamp); setEditing(true); }}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
        style={{ opacity: 0.45 }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
        title="Edit timestamp">
        <Pencil className="w-3 h-3 text-white" />
      </button>
      <button onClick={onDelete}
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-red-500/20"
        style={{ opacity: 0.45 }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
        title="Delete bookmark">
        <Trash2 className="w-3 h-3 text-red-400" />
      </button>
    </div>
  );
}

/* ─── Language Bar ─── */
function LanguageBar({ audio, sub, onAudio, onSub }: {
  audio: AudioLang; sub: boolean; onAudio: (l: AudioLang) => void; onSub: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {LANGUAGES.map((lang) => (
        <button key={lang.value} onClick={() => onAudio(lang.value)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            audio === lang.value
              ? "text-white border-primary"
              : "bg-white/5 text-white/50 border-white/10 hover:text-white hover:border-white/25 hover:bg-white/10"
          }`}
          style={audio === lang.value ? { background: "hsl(var(--primary))" } : {}}>
          {lang.label}
        </button>
      ))}
      <button onClick={() => onSub(!sub)}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
          sub ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10"
        }`}>
        <Captions className="w-3.5 h-3.5" /> Sub
      </button>
    </div>
  );
}

/* ─── Recommendation Card ─── */
function RecCard({ anime }: { anime: AnimeCard }) {
  return (
    <Link href={`/series/${anime.slug}`}>
      <div className="group flex-shrink-0 w-28 space-y-1.5">
        <div className="w-28 aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/5 group-hover:border-primary/40 transition-all group-hover:scale-[1.04]">
          {anime.image
            ? <img src={anime.image} alt={anime.title} className="w-full h-full object-cover group-hover:opacity-75 transition-opacity" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Tv className="w-6 h-6 text-white/20" /></div>}
        </div>
        <p className="text-xs text-white/50 group-hover:text-white/90 transition-colors line-clamp-2 leading-snug text-center">{anime.title}</p>
      </div>
    </Link>
  );
}

/* ─── Episode Item ─── */
function EpisodeItem({ ep, isActive, onClick }: { ep: FlatEpisode; isActive: boolean; onClick: () => void }) {
  const watched = isWatched(ep.id);
  const pct = getProgressPct(ep.id);

  return (
    <button onClick={onClick}
      className={`group w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative overflow-hidden ${
        isActive ? "border-primary/40 text-white" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-primary/20 text-white/70 hover:text-white"
      }`}
      style={isActive ? { background: "hsl(var(--primary) / 0.2)" } : {}}>
      {ep.thumbnail ? (
        <div className="w-16 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 relative">
          <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
          {isActive && <div className="absolute inset-0 bg-primary/30 flex items-center justify-center"><Play className="w-3 h-3 fill-white text-white" /></div>}
          {watched && !isActive && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            </div>
          )}
        </div>
      ) : (
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? "text-white" : "bg-white/10 text-white/40 group-hover:text-primary"}`}
          style={isActive ? { background: "hsl(var(--primary))" } : {}}>
          {watched ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Play className="w-3 h-3 ml-0.5 fill-current" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">Ep {ep.number}</div>
        <div className="text-sm font-medium truncate">{ep.title ?? `Episode ${ep.number}`}</div>
      </div>
      {/* Progress bar at bottom of card */}
      {pct > 0.02 && !watched && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <div className="h-full transition-all" style={{ width: `${pct * 100}%`, background: "hsl(var(--primary))" }} />
        </div>
      )}
    </button>
  );
}

/* ─── Next Episode Overlay ─── */
function NextEpisodeOverlay({
  nextId, nextTitle, countdown,
  onSkip, onCancel,
}: {
  nextId: string; nextTitle: string; countdown: number;
  onSkip: () => void; onCancel: () => void;
}) {
  const circumference = 2 * Math.PI * 18;
  const offset = circumference * (1 - countdown / 5);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-2xl shadow-2xl"
        style={{ background: "hsl(var(--card))", border: "1px solid rgba(255,255,255,0.12)" }}>
        {/* Countdown ring */}
        <div className="relative w-10 h-10 flex-shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle cx="20" cy="20" r="18" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{countdown}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/40 mb-0.5">Up Next</p>
          <p className="text-sm font-semibold text-white truncate max-w-[180px]">{nextTitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-all">
            Cancel
          </button>
          <button onClick={onSkip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:scale-105"
            style={{ background: "hsl(var(--primary))" }}>
            <SkipForward className="w-3.5 h-3.5" /> Play now
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Watch Page ─── */
export default function Watch() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/watch/:episodeId");
  const baseEpisodeId = params?.episodeId ?? "";

  // Auth guard — must be registered + onboarded to watch
  const { user, isLoaded: authLoaded } = useUser();

  const slugMatch = baseEpisodeId.match(/^(.*?)-(\d+)x(\d+)$/);
  const isMovie = !slugMatch;
  const seriesSlug = isMovie ? baseEpisodeId : (slugMatch?.[1] ?? "");
  const currentSeason = slugMatch?.[2] ?? "1";
  const episodeNum = slugMatch?.[3] ?? "1";
  const recKeyword = seriesSlug.split("-")[0] ?? "";

  const [audioLang, setAudioLang] = useState<AudioLang>(() => {
    try { return (localStorage.getItem(LANG_KEY) as AudioLang) ?? "japanese"; } catch { return "japanese"; }
  });
  const [subEnabled, setSubEnabled] = useState(() => {
    try { return localStorage.getItem(SUB_KEY) !== "false"; } catch { return true; }
  });
  const [bookmarkOpen, setBookmarkOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const bookmarkBtnRef = useRef<HTMLButtonElement>(null);

  // Detect mobile landscape so the player covers the full screen.
  // `hover: none` is the reliable proxy for touchscreen devices — desktops always have hover.
  const [mobileLandscape, setMobileLandscape] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape) and (hover: none)");
    const update = (e: MediaQueryList | MediaQueryListEvent) => setMobileLandscape(e.matches);
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auto-resume state
  const [resumeFrom, setResumeFrom] = useState<string | null>(null);

  // Next episode countdown
  const [nextEpCountdown, setNextEpCountdown] = useState<number | null>(null);

  const [seekHint, setSeekHint] = useState<string | null>(null);

  // Progress tracking refs (wall-clock elapsed time)
  const positionRef = useRef(0);
  const lastSavePositionRef = useRef(0);
  const playerStartedRef = useRef(false);

  useEffect(() => { try { localStorage.setItem(LANG_KEY, audioLang); } catch { /**/ } }, [audioLang]);
  useEffect(() => { try { localStorage.setItem(SUB_KEY, String(subEnabled)); } catch { /**/ } }, [subEnabled]);

  // Auth guard — redirect if not signed in or not yet onboarded
  useEffect(() => {
    if (!authLoaded) return;
    // Store base-relative path so onboarding can pass it to wouter's setLocation
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const fullPath = window.location.pathname + window.location.search;
    const dest = base && fullPath.startsWith(base) ? fullPath.slice(base.length) || "/" : fullPath;
    if (!user) {
      sessionStorage.setItem("avistream_next", dest);
      setLocation("/sign-up");
    } else if (!user.unsafeMetadata?.onboardingComplete) {
      sessionStorage.setItem("avistream_next", dest);
      setLocation("/onboarding");
    }
  }, [authLoaded, user, setLocation]);

  // Close bookmark panel on outside click
  useEffect(() => {
    if (!bookmarkOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const inBtn = bookmarkBtnRef.current?.contains(target);
      const inPanel = target.closest("[data-bookmark-panel]");
      if (!inBtn && !inPanel) setBookmarkOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bookmarkOpen]);

  // Parse ?t= shareable timestamp from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    if (t) setSeekHint(parseShareTimestamp(t));
  }, [baseEpisodeId]);

  // Auto-dismiss seek hint after 6s
  useEffect(() => {
    if (!seekHint) return;
    const timer = setTimeout(() => setSeekHint(null), 6000);
    return () => clearTimeout(timer);
  }, [seekHint]);

  const openBookmarks = () => {
    setAnchorRect(bookmarkBtnRef.current?.getBoundingClientRect() ?? null);
    setBookmarkOpen((v) => !v);
  };

  const isDub = audioLang !== "japanese";
  const episodeId = isDub ? `${baseEpisodeId}--dub` : baseEpisodeId;

  // Only fetch once auth is confirmed — prevents leaking episode data to unauthed users
  const isAuthorized = authLoaded && !!user && !!user.unsafeMetadata?.onboardingComplete;

  const { data: episodeResponse, isLoading: epLoading, isError: epError } = useGetAnimeEpisode(episodeId, {
    query: { enabled: isAuthorized && !isMovie && !!episodeId, queryKey: getGetAnimeEpisodeQueryKey(episodeId) },
  });
  const { data: seriesData, isLoading: seriesLoading } = useGetAnimeSeries(seriesSlug, {
    query: { enabled: isAuthorized && !!seriesSlug, queryKey: getGetAnimeSeriesQueryKey(seriesSlug) },
  });
  const { data: recData } = useSearchAnime(
    { q: recKeyword },
    { query: { enabled: isAuthorized && recKeyword.length >= 2, queryKey: getSearchAnimeQueryKey({ q: recKeyword }) } }
  );

  const { items: bookmarkItems } = useBookmarks();
  const epBookmarkCount = bookmarkItems.filter((b) => b.episodeId === baseEpisodeId).length;
  const { pushProgress } = useUserData();
  const pushProgressRef = useRef(pushProgress);
  useEffect(() => { pushProgressRef.current = pushProgress; }, [pushProgress]);

  const episode = episodeResponse?.data;
  const seriesInfo = seriesData?.data;
  const moviePlayerUrl = isMovie ? seriesInfo?.movie_players?.[0] ?? null : null;
  const bgImage = seriesInfo?.thumbnail ?? null;
  const episodeTitle = isMovie
    ? (seriesInfo?.title ?? "Movie")
    : `Season ${currentSeason} Ep ${episodeNum}`;

  const isLoading = isMovie ? seriesLoading : epLoading;
  const playerUrl = isMovie ? moviePlayerUrl : episode?.video_player ?? null;
  const showError = !isLoading && !playerUrl;
  const dubUnavailable = !isMovie && isDub && (epError || !episode?.video_player);

  const seasonEpisodes: FlatEpisode[] = (seriesInfo?.episodes ?? []).filter((ep) => ep.season === currentSeason);
  const recommendations = (recData?.results ?? []).filter((r) => r.slug !== seriesSlug).slice(0, 12);

  // Add to recent watched
  useEffect(() => {
    if (seriesInfo && seriesSlug) {
      addRecentWatched({ slug: seriesSlug, title: seriesInfo.title, image: seriesInfo.thumbnail ?? null });
    }
  }, [seriesInfo, seriesSlug]);

  // Auto-resume: check saved progress on episode load
  useEffect(() => {
    if (!baseEpisodeId || isMovie) return;
    setResumeFrom(null); // reset on episode change
    const prog = getProgress(baseEpisodeId);
    if (prog && prog.position > 30 && prog.position / prog.duration < WATCHED_THRESHOLD) {
      setResumeFrom(formatSeconds(prog.position));
    }
  }, [baseEpisodeId, isMovie]);

  // Track elapsed watch time and save progress every 10s
  useEffect(() => {
    if (!playerUrl || !baseEpisodeId || !seriesInfo || isMovie) return;

    const existing = getProgress(baseEpisodeId);
    positionRef.current = existing?.position ?? 0;
    lastSavePositionRef.current = positionRef.current;
    playerStartedRef.current = true;

    // Capture metadata values at effect-start time so the closure is stable
    const title = seriesInfo.title;
    const image = seriesInfo.thumbnail ?? null;

    let lastTick = Date.now();

    const doSave = () => {
      const entry = {
        episodeId: baseEpisodeId,
        seriesSlug,
        seriesTitle: title,
        seriesImage: image,
        season: currentSeason,
        episodeNum,
        episodeTitle,
        position: positionRef.current,
        duration: DEFAULT_DURATION,
      };
      saveProgress(entry);
      pushProgressRef.current({ ...entry, savedAt: Date.now() });
      lastSavePositionRef.current = positionRef.current;
    };

    const interval = setInterval(() => {
      const now = Date.now();
      if (!document.hidden) {
        positionRef.current += (now - lastTick) / 1000;
      }
      lastTick = now;
      // Save every ~10 seconds of accumulated elapsed time
      if (positionRef.current - lastSavePositionRef.current >= 10) {
        doSave();
      }
    }, 1000);

    const handleVisibility = () => { lastTick = Date.now(); };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      // Final save on unmount
      if (playerStartedRef.current) doSave();
    };
  // Include seriesInfo so the effect re-fires if series data arrives after the player URL
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerUrl, baseEpisodeId, seriesInfo]);

  // Next episode countdown tick
  useEffect(() => {
    if (nextEpCountdown === null) return;
    if (nextEpCountdown <= 0) {
      if (episode?.next_episode_id) goToEpisode(episode.next_episode_id);
      setNextEpCountdown(null);
      return;
    }
    const t = setTimeout(() => setNextEpCountdown((n) => (n ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextEpCountdown]);

  const goToEpisode = useCallback((id: string) => {
    setNextEpCountdown(null);
    setLocation(`/watch/${id}`);
  }, [setLocation]);

  const handleBookmarkPlay = (timestamp: string) => {
    setBookmarkOpen(false);
    setSeekHint(timestamp);
    // Update URL so it's shareable at this timestamp
    const url = new URL(window.location.href);
    url.searchParams.set("t", toShareParam(timestamp));
    window.history.replaceState(null, "", url.toString());
  };

  const handleMarkDone = () => {
    markWatched(baseEpisodeId, {
      episodeId: baseEpisodeId,
      seriesSlug,
      seriesTitle: seriesInfo?.title ?? "",
      seriesImage: seriesInfo?.thumbnail ?? null,
      season: currentSeason,
      episodeNum,
      episodeTitle,
      duration: DEFAULT_DURATION,
    });
    if (episode?.next_episode_id) {
      setNextEpCountdown(5);
    }
  };

  const nextEp = episode?.next_episode_id
    ? seasonEpisodes.find((e) => e.id === episode.next_episode_id)
    : null;
  const nextEpTitle = nextEp
    ? (nextEp.title ?? `Episode ${nextEp.number}`)
    : `Episode ${parseInt(episodeNum) + 1}`;

  // Block render until Clerk has resolved — prevents flash of protected UI
  if (!authLoaded || !isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col relative overflow-hidden">
      {/* Blurred anime background */}
      {bgImage && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <img src={bgImage} alt="" className="w-full h-full object-cover opacity-10"
            style={{ filter: "blur(40px)", transform: "scale(1.1)" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 px-4 md:px-6 py-4 flex items-center gap-3">
        <Link href={seriesSlug ? `/series/${seriesSlug}` : "/"}>
          <Button variant="ghost" className="gap-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Back</span>
          </Button>
        </Link>
        {seriesInfo && (
          <span className="text-sm font-semibold text-white/70 truncate max-w-[160px] md:max-w-xs">
            {seriesInfo.title}
          </span>
        )}
        {!isMovie && (
          <span className="text-xs text-white/30 hidden sm:block flex-shrink-0">{episodeTitle}</span>
        )}

        {/* Bookmark button with panel */}
        {!isMovie && (
          <div className="ml-auto">
            <button
              ref={bookmarkBtnRef}
              onClick={openBookmarks}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
              style={bookmarkOpen || epBookmarkCount > 0
                ? { background: "hsl(var(--primary) / 0.15)", borderColor: "hsl(var(--primary) / 0.4)", color: "hsl(var(--primary))" }
                : { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bookmarks</span>
              {epBookmarkCount > 0 && (
                <span className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: "hsl(var(--primary))" }}>
                  {epBookmarkCount}
                </span>
              )}
            </button>

            {bookmarkOpen && seriesInfo && (
              <BookmarkPanel
                episodeId={baseEpisodeId}
                seriesSlug={seriesSlug}
                seriesTitle={seriesInfo.title}
                seriesImage={seriesInfo.thumbnail ?? null}
                episodeTitle={episodeTitle}
                season={currentSeason}
                episodeNum={episodeNum}
                anchorRect={anchorRect}
                onPlay={handleBookmarkPlay}
                onClose={() => setBookmarkOpen(false)}
              />
            )}
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 pb-16 flex flex-col gap-0">

        {/* Auto-resume banner */}
        {resumeFrom && !seekHint && (
          <div className="w-full mb-3 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.25)" }}>
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
            <p className="text-sm text-white flex-1">
              Continue from <span className="font-mono font-bold" style={{ color: "hsl(var(--primary))" }}>{resumeFrom}</span>?
            </p>
            <button
              onClick={() => { setSeekHint(resumeFrom); setResumeFrom(null); }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105"
              style={{ background: "hsl(var(--primary))", color: "#fff" }}>
              Resume
            </button>
            <button onClick={() => setResumeFrom(null)} className="text-white/30 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Player */}
        <div className="w-full">
          {isLoading ? (
            <div className="w-full aspect-video bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: "hsl(var(--primary) / 0.6)" }} />
              <p className="text-sm text-white/30">Loading player...</p>
            </div>
          ) : showError ? (
            <div className="w-full aspect-video bg-white/5 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <AlertCircle className="w-12 h-12 text-white/20" />
              <h2 className="text-lg font-semibold text-white">
                {dubUnavailable ? `${LANGUAGES.find(l => l.value === audioLang)?.label} audio not available` : "Video unavailable"}
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                {dubUnavailable ? "Try Japanese or switch to Sub." : "Player link couldn't be loaded. Try another episode."}
              </p>
              {dubUnavailable && (
                <Button variant="outline" size="sm" className="border-white/20 hover:bg-white/10" onClick={() => setAudioLang("japanese")}>
                  Switch to Japanese
                </Button>
              )}
            </div>
          ) : (
            <div
              className={
                mobileLandscape
                  ? "fixed inset-0 z-[100] bg-black"
                  // -mx-4 md:mx-0 breaks out of the container's px-4 padding so the player
                  // is truly edge-to-edge on mobile; md and up keep the normal layout
                  : "w-full -mx-4 md:mx-0 overflow-hidden bg-black"
              }
            >
              <div className={mobileLandscape ? "w-full h-full" : "aspect-video w-full"}>
                {/* sandbox without allow-popups blocks new-tab/window ads from the player */}
                <iframe
                  src={playerUrl!}
                  allow="fullscreen; autoplay"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
                  className="w-full h-full border-0"
                  title="Player"
                />
              </div>
            </div>
          )}
        </div>

        {/* Seek hint banner */}
        {seekHint && (
          <div className="w-full mt-3 flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.3)" }}>
            <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
            <p className="text-sm text-white flex-1">
              Seek the video to <span className="font-mono font-bold" style={{ color: "hsl(var(--primary))" }}>{seekHint}</span> to continue from your bookmark.
            </p>
            <button onClick={() => setSeekHint(null)} className="text-white/30 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Prev / Next / Mark Done (episodes only) */}
        {!isMovie && (
          <div className="w-full mt-4 flex items-center justify-between gap-3 px-1">
            <Button variant="ghost" className="gap-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full disabled:opacity-20"
              disabled={!episode?.prev_episode_id || epLoading}
              onClick={() => episode?.prev_episode_id && goToEpisode(episode.prev_episode_id)}>
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Previous</span>
            </Button>

            {/* Mark as Done */}
            {playerUrl && (
              <button
                onClick={handleMarkDone}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border hover:scale-105"
                style={isWatched(baseEpisodeId)
                  ? { background: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.3)", color: "rgb(74,222,128)" }
                  : { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isWatched(baseEpisodeId) ? "Watched" : "Mark done"}</span>
              </button>
            )}

            <Button variant="ghost" className="gap-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-full disabled:opacity-20"
              disabled={!episode?.next_episode_id || epLoading}
              onClick={() => episode?.next_episode_id && goToEpisode(episode.next_episode_id)}>
              <span className="hidden sm:inline text-sm">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Language bar */}
        <div className="w-full mt-4 py-3 px-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <LanguageBar audio={audioLang} sub={subEnabled} onAudio={setAudioLang} onSub={setSubEnabled} />
        </div>

        {/* Episode list */}
        {!isMovie && seasonEpisodes.length > 0 && (
          <div className="w-full mt-8 space-y-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Season {currentSeason} — Episodes</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-none">
              {seasonEpisodes.map((ep) => (
                <EpisodeItem key={ep.id} ep={ep} isActive={ep.id === baseEpisodeId} onClick={() => goToEpisode(ep.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="w-full mt-10 space-y-4">
            <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">You Might Also Like</h2>
            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-none">
              {recommendations.map((anime) => <RecCard key={anime.slug} anime={anime} />)}
            </div>
          </div>
        )}
      </main>

      {/* Next Episode Overlay */}
      {nextEpCountdown !== null && episode?.next_episode_id && (
        <NextEpisodeOverlay
          nextId={episode.next_episode_id}
          nextTitle={nextEpTitle}
          countdown={nextEpCountdown}
          onSkip={() => goToEpisode(episode.next_episode_id!)}
          onCancel={() => setNextEpCountdown(null)}
        />
      )}
    </div>
  );
}
