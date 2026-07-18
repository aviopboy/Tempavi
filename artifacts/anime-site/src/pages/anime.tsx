import { useState, useEffect } from "react";
import { useSearch, Link } from "wouter";
import { Tv } from "lucide-react";
import {
  useGetAnimeHome,
  useSearchAnime,
  getSearchAnimeQueryKey,
} from "@workspace/api-client-react";
import type { AnimeCard } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

function Card({ anime }: { anime: AnimeCard }) {
  return (
    <Link href={`/series/${anime.slug}`}>
      <div className="group relative rounded-lg overflow-hidden bg-secondary cursor-pointer transition-transform duration-200 hover:-translate-y-1"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>
        <div className="aspect-[2/3] overflow-hidden">
          {anime.image ? (
            <img src={anime.image} alt={anime.title}
              className="w-full h-full object-cover group-hover:opacity-75 transition-opacity duration-200"
              loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <Tv className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-xs font-semibold text-white/80 truncate">{anime.title}</p>
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

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-[3px] h-5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
  );
}

const GRID = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3";

export default function Anime() {
  const searchStr = useSearch();
  const searchParam = new URLSearchParams(searchStr).get("q") ?? "";
  const [query, setQuery] = useState(searchParam);
  const debouncedQ = useDebounce(query, 350);
  const isSearching = debouncedQ.length > 1;

  const { data: homeData, isLoading: homeLoading } = useGetAnimeHome();
  const { data: searchData, isLoading: searchLoading } = useSearchAnime(
    { q: debouncedQ },
    { query: { enabled: isSearching, queryKey: getSearchAnimeQueryKey({ q: debouncedQ }) } }
  );

  useEffect(() => { setQuery(searchParam); }, [searchParam]);

  const freshDrops = homeData?.data?.fresh_drops ?? [];
  const onAir = homeData?.data?.on_air ?? [];
  const newArrivals = homeData?.data?.new_arrivals ?? [];

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-10">
        {isSearching ? (
          <section>
            <SectionHeader title={`Results for "${debouncedQ}"`} />
            {searchLoading ? (
              <div className={GRID}>{Array.from({ length: 12 }).map((_, i) => <CardSkeleton key={i} />)}</div>
            ) : searchData?.results && searchData.results.length > 0 ? (
              <div className={GRID}>{searchData.results.map((a) => <Card key={a.slug} anime={a} />)}</div>
            ) : (
              <div className="py-20 text-center text-muted-foreground">No results for &quot;{debouncedQ}&quot;</div>
            )}
          </section>
        ) : (
          <>
            <section>
              <SectionHeader title="Fresh Drops" />
              <div className={GRID}>
                {homeLoading ? Array.from({ length: 18 }).map((_, i) => <CardSkeleton key={i} />) : freshDrops.map((a) => <Card key={a.slug} anime={a} />)}
              </div>
            </section>
            {(homeLoading || onAir.length > 0) && (
              <section>
                <SectionHeader title="On Air" />
                <div className={GRID}>
                  {homeLoading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) : onAir.map((a) => <Card key={a.slug} anime={a} />)}
                </div>
              </section>
            )}
            {(homeLoading || newArrivals.length > 0) && (
              <section>
                <SectionHeader title="New Arrivals" />
                <div className={GRID}>
                  {homeLoading ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />) : newArrivals.map((a) => <Card key={a.slug} anime={a} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
