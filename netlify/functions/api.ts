/**
 * Netlify Function — AviStream API proxy
 * Handles all /api/* requests and proxies to the upstream AnimeSalt API,
 * applying the same transformations the Express server does.
 *
 * Uses Netlify Functions v2 (web-standard Request / Response).
 * No npm dependencies required.
 */

const UPSTREAM = "https://animesalt-api-lovat.vercel.app/api";

type Rec = Record<string, unknown>;

function isErrorBody(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    ("detail" in body || "error" in body)
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  // Strip /api prefix to get the local route path
  const path = url.pathname.replace(/^\/api/, "");

  try {
    // ── GET /api/anime/home ──────────────────────────────────────────────────
    if (path === "/anime/home") {
      const upstream = await fetch(`${UPSTREAM}/home`);
      const raw = (await upstream.json()) as Rec;
      const data = raw["data"] as Rec | undefined;
      return json({
        success: true,
        data: {
          fresh_drops: (data?.["fresh_drops"] ?? []) as unknown[],
          on_air: (data?.["on-air_series_view_more"] ?? []) as unknown[],
          new_arrivals: (data?.["new_anime_arrivals_view_more"] ?? []) as unknown[],
          movies: (data?.["latest_anime_movies_view_more"] ?? []) as unknown[],
        },
      });
    }

    // ── GET /api/anime/search?q= ─────────────────────────────────────────────
    if (path === "/anime/search") {
      const q = url.searchParams.get("q");
      if (!q) return json({ error: "Missing query parameter: q" }, 400);
      const upstream = await fetch(`${UPSTREAM}/search?q=${encodeURIComponent(q)}`);
      const data = await upstream.json();
      return json(data, upstream.status);
    }

    // ── GET /api/anime/series/:slug ──────────────────────────────────────────
    const seriesMatch = path.match(/^\/anime\/series\/(.+)$/);
    if (seriesMatch) {
      const slug = decodeURIComponent(seriesMatch[1]!);
      const upstream = await fetch(`${UPSTREAM}/anime/${encodeURIComponent(slug)}`);
      const body = (await upstream.json()) as unknown;
      if (upstream.status === 404 || isErrorBody(body)) {
        return json({ error: "Not found" }, 404);
      }
      return json(body, upstream.status);
    }

    // ── GET /api/anime/episode/:episodeId ────────────────────────────────────
    const episodeMatch = path.match(/^\/anime\/episode\/(.+)$/);
    if (episodeMatch) {
      const raw = decodeURIComponent(episodeMatch[1]!);
      const isDub = raw.endsWith("--dub");
      const episodeId = isDub ? raw.slice(0, -5) : raw;
      const langParam = isDub ? "?lang=dub" : "";
      const upstream = await fetch(
        `${UPSTREAM}/episode/${encodeURIComponent(episodeId)}${langParam}`
      );
      const body = (await upstream.json()) as unknown;
      if (upstream.status === 404 || isErrorBody(body)) {
        return json({ error: "Not found" }, 404);
      }
      return json(body, upstream.status);
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    console.error("API proxy error:", err);
    return json({ error: "Failed to reach AnimeSalt API" }, 502);
  }
}

/** Netlify Functions v2 — route all /api/* requests here automatically */
export const config = { path: "/api/*" };
