import { useState, useRef, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { Play, ListVideo, Film, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useGetAnimeSeries, getGetAnimeSeriesQueryKey } from "@workspace/api-client-react";
import type { FlatEpisode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isWatched, getProgressPct } from "@/hooks/use-watch-progress";

type GroupedSeason = { number: string; episodes: FlatEpisode[] };

function groupBySeason(episodes: FlatEpisode[]): GroupedSeason[] {
  const map = new Map<string, GroupedSeason>();
  for (const ep of episodes) {
    const s = ep.season ?? "1";
    if (!map.has(s)) map.set(s, { number: s, episodes: [] });
    map.get(s)!.episodes.push(ep);
  }
  return Array.from(map.values()).sort((a, b) => Number(a.number) - Number(b.number));
}

/* Horizontal scrollable season pills */
function SeasonPicker({
  seasons,
  active,
  onChange,
}: {
  seasons: GroupedSeason[];
  active: string;
  onChange: (s: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only translate vertical wheel to horizontal when there's actually room to scroll
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      const atStart = el.scrollLeft === 0 && e.deltaY < 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
      if (!atStart && !atEnd) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    }
  }, []);

  if (seasons.length <= 1) return null;

  return (
    <div className="relative flex items-center gap-1">
      {seasons.length > 6 && (
        <button
          onClick={() => scroll("left")}
          className="flex-shrink-0 p-1 rounded-full transition-opacity hover:opacity-100 opacity-60"
          style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
          aria-label="Scroll seasons left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      <div
        ref={scrollRef}
        onWheel={onWheel}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-1"
        style={{ scrollbarWidth: "none" }}
      >
        {seasons.map((s) => {
          const isActive = s.number === active;
          return (
            <button
              key={s.number}
              onClick={() => onChange(s.number)}
              aria-pressed={isActive}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
              style={
                isActive
                  ? { background: "hsl(var(--primary))", color: "#fff" }
                  : {
                      background: "hsl(var(--secondary))",
                      color: "hsl(var(--muted-foreground))",
                      border: "1px solid hsl(var(--border))",
                    }
              }
            >
              S{s.number}
              <span className="ml-1 opacity-60">({s.episodes.length})</span>
            </button>
          );
        })}
      </div>
      {seasons.length > 6 && (
        <button
          onClick={() => scroll("right")}
          className="flex-shrink-0 p-1 rounded-full transition-opacity hover:opacity-100 opacity-60"
          style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
          aria-label="Scroll seasons right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function Series() {
  const [, params] = useRoute("/series/:slug");
  const slug = params?.slug ?? "";
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [epPage, setEpPage] = useState(0);
  const EPS_PER_PAGE = 48;

  const { data: seriesResponse, isLoading, isError } = useGetAnimeSeries(slug, {
    query: { enabled: !!slug, queryKey: getGetAnimeSeriesQueryKey(slug) },
  });

  const series = seriesResponse?.data;

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
        <div className="h-[320px] w-full animate-pulse" style={{ background: "hsl(var(--secondary))" }} />
        <div className="max-w-6xl mx-auto px-5 -mt-28 relative z-10 flex gap-6 pb-20">
          <Skeleton className="w-44 flex-shrink-0 bg-white/5" style={{ aspectRatio: "2/3", borderRadius: 12 }} />
          <div className="flex-1 mt-24 space-y-4">
            <Skeleton className="h-10 w-2/3 bg-white/5" />
            <Skeleton className="h-4 w-1/3 bg-white/5" />
            <Skeleton className="h-4 w-full bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !series) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Film className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Couldn&apos;t load this title</h2>
        <p className="text-sm text-muted-foreground max-w-xs">Try watching from the beginning or go back home.</p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href={`/watch/${slug}-1x1`}>
            <Button size="sm" className="gap-2 rounded-full" style={{ background: "hsl(var(--primary))", color: "#fff" }}>
              <Play className="w-3.5 h-3.5 fill-current" /> Try Episode 1
            </Button>
          </Link>
          <Link href="/"><Button variant="ghost" size="sm" className="rounded-full">← Home</Button></Link>
        </div>
      </div>
    );
  }

  const isMovie = series.is_movie === true;
  const moviePlayer = series.movie_players?.[0];
  const seasons = groupBySeason(series.episodes ?? []);
  const firstEp = seasons[0]?.episodes[0];
  const activeSeason = selectedSeason ?? seasons[0]?.number ?? null;
  const activeEpisodes = seasons.find((s) => s.number === activeSeason)?.episodes ?? [];

  const totalPages = Math.ceil(activeEpisodes.length / EPS_PER_PAGE);
  const pageEps = activeEpisodes.slice(epPage * EPS_PER_PAGE, (epPage + 1) * EPS_PER_PAGE);

  function changeSeason(s: string) {
    setSelectedSeason(s);
    setEpPage(0);
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "hsl(var(--background))" }}>
      {/* Banner */}
      <div className="relative h-[320px] md:h-[380px] overflow-hidden"
        style={{ background: "hsl(var(--secondary))" }}>
        {series.thumbnail && (
          <img src={series.thumbnail} alt=""
            className="absolute inset-0 w-full h-full object-cover object-top" />
        )}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(6,6,8,0.95) 0%, rgba(6,6,8,0.55) 55%, transparent 100%)" }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(6,6,8,0.95) 100%)" }} />
      </div>

      {/* Poster + info row */}
      <div className="max-w-6xl mx-auto px-5 -mt-36 md:-mt-44 relative z-10 flex flex-col md:flex-row gap-6">
        {/* Poster */}
        <div className="w-40 md:w-52 flex-shrink-0 mx-auto md:mx-0">
          <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl"
            style={{ border: "2px solid rgba(255,255,255,0.1)", background: "hsl(var(--secondary))" }}>
            {series.thumbnail && (
              <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 md:mt-28 text-center md:text-left space-y-3">
          <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            {isMovie && (
              <span className="px-2 py-0.5 rounded text-xs font-bold"
                style={{ background: "hsl(var(--primary))", color: "#fff" }}>MOVIE</span>
            )}
            {series.episodes && series.episodes.length > 0 && !isMovie && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "hsl(var(--muted-foreground))" }}>
                <ListVideo className="inline w-3 h-3 mr-1 mb-0.5" />
                {series.episodes.length} Episodes
              </span>
            )}
            {series.genres?.map((g) => (
              <Link key={g} href={`/genre/${encodeURIComponent(g)}`}>
                <span className="px-2 py-0.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "hsl(var(--muted-foreground))" }}>
                  {g}
                </span>
              </Link>
            ))}
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            {series.title}
          </h1>

          {series.description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl line-clamp-4">
              {series.description}
            </p>
          )}

          <div className="flex gap-3 justify-center md:justify-start flex-wrap pt-1">
            {isMovie && moviePlayer ? (
              <Link href={`/watch/${slug}`}>
                <Button size="lg" className="rounded-full px-7 gap-2 font-bold"
                  style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                  <Play className="w-4 h-4 fill-white" /> Watch Movie
                </Button>
              </Link>
            ) : firstEp ? (
              <Link href={`/watch/${firstEp.id}`}>
                <Button size="lg" className="rounded-full px-7 gap-2 font-bold"
                  style={{ background: "hsl(var(--primary))", color: "#fff" }}>
                  <Play className="w-4 h-4 fill-white" /> Start Watching
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Episodes section */}
      {!isMovie && (
        <div className="max-w-6xl mx-auto px-5 mt-12">
          {seasons.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 rounded-xl"
              style={{ border: "1px dashed rgba(255,255,255,0.1)" }}>
              No episodes available yet.
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header + season picker */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-[3px] h-5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                  <h2 className="text-lg font-bold">Episodes</h2>
                </div>
                {/* Season pills — always horizontal scroll, fits any count */}
                <SeasonPicker seasons={seasons} active={activeSeason ?? ""} onChange={changeSeason} />
              </div>

              {/* Episode grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {pageEps.map((ep) => {
                  const watched = isWatched(ep.id);
                  const pct = getProgressPct(ep.id);
                  return (
                    <Link key={ep.id} href={`/watch/${ep.id}`}>
                      <div className="group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all relative overflow-hidden"
                        style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--primary) / 0.4)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(var(--border))"; }}>
                        {ep.thumbnail ? (
                          <div className="w-16 h-10 rounded-md overflow-hidden flex-shrink-0 bg-black/20 relative">
                            <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                            {watched && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(255,107,53,0.1)", color: "hsl(var(--primary))" }}>
                            {watched
                              ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                              : <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-muted-foreground mb-0.5">Ep {ep.number}</div>
                          <div className="text-sm font-medium text-white/80 truncate">
                            {ep.title ?? `Episode ${ep.number}`}
                          </div>
                        </div>
                        {/* Progress bar */}
                        {pct > 0.02 && !watched && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
                            <div className="h-full" style={{ width: `${pct * 100}%`, background: "hsl(var(--primary))" }} />
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Episode pagination if many eps */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setEpPage((p) => Math.max(0, p - 1))}
                    disabled={epPage === 0}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="flex gap-1.5">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button key={i} onClick={() => setEpPage(i)}
                        className="w-7 h-7 rounded-full text-xs font-bold transition-all"
                        style={i === epPage
                          ? { background: "hsl(var(--primary))", color: "#fff" }
                          : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setEpPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={epPage === totalPages - 1}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                    style={{ background: "hsl(var(--secondary))", border: "1px solid hsl(var(--border))" }}>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
