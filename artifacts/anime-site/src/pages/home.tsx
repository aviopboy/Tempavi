import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Play, Flame, Tv, Sparkles, Film, Clock,
  Bookmark, Search, X, Info, ChevronLeft, ChevronRight, PlayCircle,
} from "lucide-react";
import {
  useGetAnimeHome, useSearchAnime, getSearchAnimeQueryKey,
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnimeCard } from "@workspace/api-client-react";
import { useRecentWatched } from "@/hooks/use-recent-watched";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useDebounce } from "@/hooks/use-debounce";
import { useWatchProgress } from "@/hooks/use-watch-progress";

/* ─────────────────────────────────────────
   Featured anime config
───────────────────────────────────────── */
const FEATURED = [
  {
    query: "Naruto Shippuden",
    description:
      "Naruto Uzumaki, a young ninja shunned by his village, carries a powerful demon fox within him. Determined to become Hokage, he fights to protect everyone he loves.",
    genres: ["Action", "Adventure", "Shounen"],
  },
  {
    query: "One Piece",
    description:
      "Monkey D. Luffy sets sail to find the legendary One Piece treasure and become King of the Pirates — joined by a crew of unforgettable misfits.",
    genres: ["Action", "Adventure", "Comedy"],
  },
  {
    query: "Dragon Ball Z",
    description:
      "Goku and his friends defend Earth from increasingly powerful foes — from Saiyans to god-like beings — pushing the limits of power at every turn.",
    genres: ["Action", "Martial Arts", "Shounen"],
  },
  {
    query: "Attack on Titan",
    description:
      "Humanity cowers behind massive walls to survive monstrous Titans. Eren Yeager vows revenge after witnessing the horror they bring — and discovers a truth far darker.",
    genres: ["Action", "Drama", "Dark Fantasy"],
  },
  {
    query: "Demon Slayer",
    description:
      "Tanjiro Kamado trains to become a demon slayer after his family is slaughtered, carrying his demon-turned sister Nezuko on a journey of hope and heartbreak.",
    genres: ["Action", "Supernatural", "Shounen"],
  },
];

/* ─────────────────────────────────────────
   Hero Carousel
───────────────────────────────────────── */
function useFeaturedSlides() {
  const q0 = FEATURED[0].query;
  const q1 = FEATURED[1].query;
  const q2 = FEATURED[2].query;
  const q3 = FEATURED[3].query;
  const q4 = FEATURED[4].query;

  const s0 = useSearchAnime({ q: q0 }, { query: { queryKey: getSearchAnimeQueryKey({ q: q0 }) } });
  const s1 = useSearchAnime({ q: q1 }, { query: { queryKey: getSearchAnimeQueryKey({ q: q1 }) } });
  const s2 = useSearchAnime({ q: q2 }, { query: { queryKey: getSearchAnimeQueryKey({ q: q2 }) } });
  const s3 = useSearchAnime({ q: q3 }, { query: { queryKey: getSearchAnimeQueryKey({ q: q3 }) } });
  const s4 = useSearchAnime({ q: q4 }, { query: { queryKey: getSearchAnimeQueryKey({ q: q4 }) } });

  return [s0, s1, s2, s3, s4].map((s, i) => {
    const item = s.data?.results?.[0];
    return item
      ? { ...FEATURED[i], slug: item.slug, title: item.title, image: item.image }
      : null;
  });
}

type Slide = NonNullable<ReturnType<typeof useFeaturedSlides>[number]>;

function HeroCarousel() {
  const slides = useFeaturedSlides();
  const ready = slides.filter(Boolean) as Slide[];
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);

  const go = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => {
      setIdx(next);
      setFading(false);
    }, 300);
  }, []);

  const prev = () => go((idx - 1 + ready.length) % ready.length);
  const next = () => go((idx + 1) % ready.length);

  useEffect(() => {
    if (ready.length === 0) return;
    const t = setInterval(() => go((idx + 1) % ready.length), 6000);
    return () => clearInterval(t);
  }, [idx, ready.length, go]);

  if (ready.length === 0) {
    return (
      <div className="w-full rounded-2xl overflow-hidden bg-white/5 animate-pulse"
        style={{ height: "420px" }} />
    );
  }

  const slide = ready[idx % ready.length]!;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden select-none"
      style={{ height: "clamp(280px, 45vw, 500px)" }}>

      <div className="absolute inset-0 transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}>
        {slide.image && (
          <img src={slide.image} alt=""
            className="w-full h-full object-cover object-top"
            style={{ filter: "brightness(0.55)" }} />
        )}
      </div>

      <div className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)" }} />
      <div className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 55%)" }} />

      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8 md:pb-10"
        style={{ transition: "opacity 0.3s", opacity: fading ? 0 : 1 }}>

        <div className="flex gap-2 flex-wrap mb-3">
          {slide.genres.map((g) => (
            <Link key={g} href={`/genre/${encodeURIComponent(g)}`}>
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white/80 cursor-pointer hover:bg-white/20 transition-colors"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}>
                {g}
              </span>
            </Link>
          ))}
        </div>

        <h2 className="text-2xl md:text-4xl font-extrabold text-white leading-tight mb-2 drop-shadow-lg"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
          {slide.title}
        </h2>

        <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-xl mb-5 line-clamp-2 md:line-clamp-3">
          {slide.description}
        </p>

        <div className="flex gap-3 flex-wrap">
          <Link href={`/series/${slide.slug}`}>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: "hsl(var(--primary))", boxShadow: "0 4px 20px hsl(var(--primary) / 0.4)" }}>
              <Play className="w-4 h-4 fill-white" />
              Start Watching
            </button>
          </Link>
          <Link href={`/series/${slide.slug}`}>
            <button className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:bg-white/15"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Info className="w-4 h-4" />
              More Info
            </button>
          </Link>
        </div>
      </div>

      <button onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/20 hidden sm:flex"
        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)" }}>
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-white/20 hidden sm:flex"
        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.15)" }}>
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      <div className="absolute bottom-3 right-4 flex gap-1.5 items-center">
        {ready.map((_, i) => (
          <button key={i} onClick={() => go(i)}
            className="rounded-full transition-all"
            style={{
              width: i === idx ? "20px" : "6px",
              height: "6px",
              background: i === idx ? "hsl(var(--primary))" : "rgba(255,255,255,0.35)",
            }} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card / Section components
───────────────────────────────────────── */
function Card({ anime }: { anime: AnimeCard }) {
  return (
    <Link href={`/series/${anime.slug}`}>
      <div className="group relative rounded-lg overflow-hidden bg-secondary cursor-pointer transition-transform duration-200 hover:-translate-y-1"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
        <div className="aspect-[2/3] overflow-hidden">
          {anime.image
            ? <img src={anime.image} alt={anime.title}
                className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-75" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center bg-secondary">
                <Tv className="w-8 h-8 text-muted-foreground" />
              </div>}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-3/4 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "hsl(var(--primary))" }}>
            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
          </div>
        </div>
        <div className="p-2">
          <p className="text-xs font-semibold text-white/80 truncate leading-tight">{anime.title}</p>
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden">
      <Skeleton className="aspect-[2/3] w-full bg-white/5" />
      <div className="p-2"><Skeleton className="h-3 w-3/4 bg-white/5" /></div>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-[3px] h-5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <span className="text-primary">{icon}</span>{title}
      </h2>
    </div>
  );
}

function useHorizScroll() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;
      if (el.scrollWidth <= el.clientWidth) return;
      const atStart = el.scrollLeft === 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (!atStart && !atEnd) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 2;
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);
  return ref;
}

const GRID = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3";

function GridSection({ title, icon, items, loading }: {
  title: string; icon: React.ReactNode; items: AnimeCard[]; loading: boolean;
}) {
  return (
    <section>
      <SectionHeader title={title} icon={icon} />
      <div className={GRID}>
        {loading ? Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />) : items.map((a) => <Card key={a.slug} anime={a} />)}
      </div>
    </section>
  );
}

function ScrollSection({ title, icon, items, loading }: {
  title: string; icon: React.ReactNode; items: AnimeCard[]; loading: boolean;
}) {
  const rowRef = useHorizScroll();
  return (
    <section>
      <SectionHeader title={title} icon={icon} />
      <div ref={rowRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="flex-shrink-0 w-[130px]"><CardSkeleton /></div>)
          : items.map((a) => <div key={a.slug} className="flex-shrink-0 w-[130px]"><Card anime={a} /></div>)}
      </div>
    </section>
  );
}

function BookmarkCard({ title, image, episodeId, episodeTitle }: {
  slug: string; title: string; image: string | null; episodeId: string; episodeTitle: string;
}) {
  return (
    <Link href={`/watch/${episodeId}`}>
      <div className="group flex-shrink-0 w-[160px] rounded-xl overflow-hidden cursor-pointer transition-transform hover:-translate-y-1"
        style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
        <div className="w-full aspect-[16/9] overflow-hidden relative bg-black/40">
          {image
            ? <img src={image} alt={title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Tv className="w-6 h-6 text-white/20" /></div>}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "hsl(var(--primary))" }}>
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            </div>
          </div>
        </div>
        <div className="p-2.5 space-y-0.5">
          <p className="text-xs font-semibold text-white/90 truncate">{title}</p>
          <p className="text-[10px] text-muted-foreground truncate">{episodeTitle}</p>
        </div>
      </div>
    </Link>
  );
}

/* ─── Continue Watching Card ─── */
function ContinueWatchingCard({ entry }: { entry: ReturnType<typeof useWatchProgress>["inProgress"][number] }) {
  const pct = Math.min(1, entry.position / entry.duration);
  const minsLeft = Math.max(0, Math.round((entry.duration - entry.position) / 60));

  return (
    <Link href={`/watch/${entry.episodeId}`}>
      <div className="group flex-shrink-0 w-[200px] rounded-xl overflow-hidden cursor-pointer transition-transform hover:-translate-y-1"
        style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
        {/* Thumbnail */}
        <div className="w-full aspect-[16/9] overflow-hidden relative bg-black/40">
          {entry.seriesImage
            ? <img src={entry.seriesImage} alt={entry.seriesTitle}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Tv className="w-6 h-6 text-white/20" /></div>}
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "hsl(var(--primary))" }}>
              <Play className="w-4 h-4 fill-white text-white ml-0.5" />
            </div>
          </div>
          {/* Time left badge */}
          {minsLeft > 0 && (
            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              style={{ background: "rgba(0,0,0,0.75)", color: "rgba(255,255,255,0.8)" }}>
              {minsLeft}m left
            </div>
          )}
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div className="h-full transition-all" style={{ width: `${pct * 100}%`, background: "hsl(var(--primary))" }} />
          </div>
        </div>
        <div className="p-2.5 space-y-0.5">
          <p className="text-xs font-semibold text-white/90 truncate">{entry.seriesTitle}</p>
          <p className="text-[10px] text-muted-foreground truncate">S{entry.season} E{entry.episodeNum}</p>
        </div>
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────
   Main Home Page
───────────────────────────────────────── */
export default function Home() {
  const { data: homeData, isLoading } = useGetAnimeHome();
  const { items: recentItems, refresh } = useRecentWatched();
  const { items: bookmarkItems } = useBookmarks();
  const { inProgress, refresh: refreshProgress } = useWatchProgress();

  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const debouncedQ = useDebounce(query, 350);
  const isSearching = debouncedQ.length > 1;

  const { data: searchData, isLoading: searchLoading } = useSearchAnime(
    { q: debouncedQ },
    { query: { enabled: isSearching, queryKey: getSearchAnimeQueryKey({ q: debouncedQ }) } }
  );

  useEffect(() => {
    refresh();
    refreshProgress();
  }, [refresh, refreshProgress]);

  const freshDrops = homeData?.data?.fresh_drops ?? [];
  const onAir = homeData?.data?.on_air ?? [];
  const newArrivals = homeData?.data?.new_arrivals ?? [];
  const movies = homeData?.data?.movies ?? [];
  const searchResults = searchData?.results ?? [];

  const recentCards: AnimeCard[] = recentItems.map((r) => ({
    slug: r.slug, title: r.title, image: r.image, url: null,
  }));

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10">

        {/* Search bar */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim().length > 1) {
                setLocation(`/anime?q=${encodeURIComponent(query.trim())}`);
                setQuery("");
              }
            }}
            placeholder="Search anime, movies..."
            className="w-full pl-11 pr-10 py-3.5 text-sm rounded-2xl outline-none transition-colors"
            style={{
              background: "hsl(var(--secondary))",
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--foreground))",
              fontSize: "16px",
            }}
          />
          {query && (
            <button onClick={() => setQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {isSearching ? (
          <section>
            <SectionHeader title={`Results for "${debouncedQ}"`} icon={<Search className="w-4 h-4" />} />
            {searchLoading
              ? <div className={GRID}>{Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}</div>
              : searchResults.length > 0
                ? <div className={GRID}>{searchResults.map((a) => <Card key={a.slug} anime={a} />)}</div>
                : <div className="py-20 text-center text-muted-foreground">No results for &quot;{debouncedQ}&quot;</div>}
          </section>
        ) : (
          <>
            {/* ── Hero carousel ── */}
            <HeroCarousel />

            {/* ── Continue Watching ── */}
            {inProgress.length > 0 && (
              <section>
                <SectionHeader title="Continue Watching" icon={<PlayCircle className="w-4 h-4" />} />
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {inProgress.map((entry) => (
                    <ContinueWatchingCard key={entry.episodeId} entry={entry} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Bookmarks ── */}
            {bookmarkItems.length > 0 && (
              <section>
                <SectionHeader title="Bookmarks" icon={<Bookmark className="w-4 h-4" />} />
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {bookmarkItems.map((b) => (
                    <BookmarkCard key={b.id} slug={b.seriesSlug} title={b.seriesTitle}
                      image={b.seriesImage} episodeId={b.episodeId} episodeTitle={b.episodeTitle} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Recently Watched ── */}
            {recentCards.length > 0 && (
              <ScrollSection title="Recently Watched" icon={<Clock className="w-4 h-4" />} items={recentCards} loading={false} />
            )}

            {/* ── Fresh Drops ── */}
            <GridSection title="Fresh Drops" icon={<Flame className="w-4 h-4" />} items={freshDrops} loading={isLoading} />

            {/* ── Trending ── */}
            <ScrollSection title="Trending Now" icon={<Sparkles className="w-4 h-4" />} items={onAir} loading={isLoading} />

            {/* ── Popular ── */}
            <ScrollSection title="All Time Popular" icon={<Tv className="w-4 h-4" />} items={newArrivals} loading={isLoading} />

            {/* ── Movies ── */}
            {(isLoading || movies.length > 0) && (
              <ScrollSection title="Anime Movies" icon={<Film className="w-4 h-4" />} items={movies} loading={isLoading} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
