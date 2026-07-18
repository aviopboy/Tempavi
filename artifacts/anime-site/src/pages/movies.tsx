import { Link } from "wouter";
import { Film, Tv } from "lucide-react";
import { useGetAnimeHome } from "@workspace/api-client-react";
import type { AnimeCard } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

function MovieCard({ anime }: { anime: AnimeCard }) {
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
        <div className="absolute top-2 left-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{ background: "hsl(var(--primary))", color: "#fff" }}>
            MOVIE
          </span>
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

export default function Movies() {
  const { data: homeData, isLoading } = useGetAnimeHome();
  const movies = homeData?.data?.movies ?? [];

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-[3px] h-6 rounded-full" style={{ background: "hsl(var(--primary))" }} />
          <Film className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold">Anime Movies</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {isLoading
            ? Array.from({ length: 18 }).map((_, i) => <CardSkeleton key={i} />)
            : movies.length > 0
              ? movies.map((a) => <MovieCard key={a.slug} anime={a} />)
              : <p className="col-span-full text-center text-muted-foreground py-20">No movies found.</p>
          }
        </div>
      </div>
    </div>
  );
}
