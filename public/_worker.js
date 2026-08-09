const PRIVATE_API_PREFIXES = ["/api/admin", "/api/import", "/api/lcu"];

const SNAPSHOT_ROUTES = new Map([
  ["/api/analytics-meta", "/__api/analytics-meta.json"],
  ["/api/team-builder-prediction-model", "/__api/team-builder-prediction-model.json"],
]);

export function encodeSnapshotKey(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function isCloudflareApiRequestBlocked(request) {
  const url = new URL(request.url);
  return !["GET", "HEAD"].includes(request.method)
    || PRIVATE_API_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

export function resolveApiSnapshotPath(url) {
  if (url.pathname === "/api/matches") {
    return url.searchParams.get("include") === "stats" ? "/__api/matches-stats.json" : "/__api/matches.json";
  }
  if (url.pathname === "/api/players") {
    const include = url.searchParams.get("include");
    if (include === "matches,overallHistory") return "/__api/players-full.json";
    if (include === "matches") return "/__api/players-matches.json";
    return "/__api/players.json";
  }
  if (url.pathname === "/api/matches/game" && url.searchParams.get("id")) {
    return `/__api/matches/${encodeSnapshotKey(url.searchParams.get("id"))}.json`;
  }
  if (url.pathname === "/api/players/player" && url.searchParams.get("id")) {
    return `/__api/players/${encodeSnapshotKey(url.searchParams.get("id"))}.json`;
  }
  return SNAPSHOT_ROUTES.get(url.pathname) ?? null;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { "Cache-Control": "public, max-age=300", "Content-Type": "application/json; charset=utf-8" },
    status,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (isCloudflareApiRequestBlocked(request)) {
        return jsonResponse({ ok: false, error: "View-only mode: editing and Admin access are disabled." }, 403);
      }
      if (url.pathname === "/api/capabilities") return jsonResponse({ ok: true, viewOnly: true });

      const snapshotPath = resolveApiSnapshotPath(url);
      if (!snapshotPath) return jsonResponse({ ok: false, error: "This API route is not part of the published snapshot." }, 404);

      const snapshotResponse = await env.ASSETS.fetch(new URL(snapshotPath, request.url));
      if (!snapshotResponse.ok) return jsonResponse({ ok: false, error: "The published snapshot is incomplete." }, 404);
      const headers = new Headers(snapshotResponse.headers);
      headers.set("Cache-Control", "public, max-age=300");
      headers.set("Content-Type", "application/json; charset=utf-8");
      return new Response(request.method === "HEAD" ? null : snapshotResponse.body, { headers, status: 200 });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404 || request.method !== "GET" || !request.headers.get("Accept")?.includes("text/html")) {
      return assetResponse;
    }
    return env.ASSETS.fetch(new URL("/index.html", request.url));
  },
};
