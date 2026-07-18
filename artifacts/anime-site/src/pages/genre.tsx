import { useRoute, Link } from "wouter";
import { Tag, Tv, Play, ArrowLeft } from "lucide-react";
import { useSearchAnime, getSearchAnimeQueryKey } from "@workspace/api-client-react";
import type { AnimeCard } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

/* Popular genre list for quick navigation */
const POPULAR_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy",
  "Horror", "Isekai", "Mecha", "Mystery", "Romance",
  "Sci-Fi", "Shounen", "Shoujo", "Slice of Life", "Supernatural",
  "Sports", "Thriller", "Martial Arts", "School", "Historical",
];

function AnimeCard({ anime }: { anime: AnimeCard }) {
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

export default function Genre() {
  const [, params] = useRoute("/genre/:name");
  const genre = decodeURIComponent(params?.name ?? "");

  const { data, isLoading } = useSearchAnime(
    { q: genre },
    { query: { enabled: genre.length > 0, queryKey: getSearchAnimeQueryKey({ q: genre }) } }
  );

  const results = data?.results ?? [];

  return (
    <div className="min-h-screen pb-20" style={{ background: "hsl(var(--background))" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </Link>
          <span className="text-white/20">/</span>
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 rounded-full" style={{ background: "hsl(var(--primary))" }} />
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Tag className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
              {genre}
            </h1>
          </div>
        </div>

        {/* Genre quick-nav */}
        <div className="flex flex-wrap gap-2">
          {POPULAR_GENRES.map((g) => (
            <Link key={g} href={`/genre/${encodeURIComponent(g)}`}>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all"
                style={g === genre
                  ? { background: "hsl(var(--primary))", color: "#fff" }
                  : { background: "hsl(var(--secondary))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }}>
                {g}
              </span>
            </Link>
          ))}
        </div>

        {/* Results */}
        <section>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 18 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : results.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <Tag className="w-10 h-10 mx-auto text-white/15" />
              <p className="text-muted-foreground">No anime found for &quot;{genre}&quot;</p>
              <p className="text-xs text-white/30">Try a different genre from the list above.</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-white/30 mb-4">{results.length} titles found</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {results.map((a) => <AnimeCard key={a.slug} anime={a} />)}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
