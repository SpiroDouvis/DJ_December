// Turns a pasted Spotify or Apple Music link into one song with links to both
// services. Nobody signs in to either service: the public song.link (Odesli) API
// matches the song across services, and the public Spotify oEmbed and iTunes
// lookup endpoints fill in when it can't.

export type ResolvedSong = {
  /** Odesli's id for the song when it matched, else a service-specific id. */
  key: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
};

export type Service = "spotify" | "apple";

export class SongLinkError extends Error {}

type ParsedLink =
  | { service: "spotify"; trackId: string; url: string }
  | { service: "apple"; trackId: string; url: string };

/** Accepts Spotify track links and Apple Music song links. */
export function parseSongLink(input: string): ParsedLink {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new SongLinkError("That doesn't look like a link.");
  }

  if (url.hostname === "open.spotify.com") {
    const match = url.pathname.match(/\/track\/([A-Za-z0-9]{10,})/);
    if (!match) throw new SongLinkError("Paste a link to a Spotify song, not an album or playlist.");
    return {
      service: "spotify",
      trackId: match[1],
      url: `https://open.spotify.com/track/${match[1]}`,
    };
  }

  if (url.hostname === "music.apple.com" || url.hostname === "itunes.apple.com") {
    // Song links look like /us/song/name/123 or /us/album/name/456?i=123.
    const fromQuery = url.searchParams.get("i");
    const fromSong = url.pathname.match(/\/song\/(?:[^/]+\/)?(\d+)/)?.[1];
    const trackId = fromQuery ?? fromSong;
    if (!trackId || !/^\d+$/.test(trackId)) {
      throw new SongLinkError("Paste a link to an Apple Music song, not an album or playlist.");
    }
    return { service: "apple", trackId, url: url.toString() };
  }

  throw new SongLinkError("Paste a Spotify or Apple Music song link.");
}

type OdesliEntity = {
  title?: string;
  artistName?: string;
  thumbnailUrl?: string;
};

export type OdesliResponse = {
  entityUniqueId: string;
  entitiesByUniqueId: Record<string, OdesliEntity>;
  linksByPlatform: Partial<
    Record<"spotify" | "appleMusic" | string, { url: string; entityUniqueId: string }>
  >;
};

/** Pulls the fields we keep out of an Odesli response. */
export function songFromOdesli(data: OdesliResponse): ResolvedSong | null {
  const spotify = data.linksByPlatform.spotify;
  const apple = data.linksByPlatform.appleMusic;
  // Prefer the streaming services' own metadata over whatever was pasted.
  const entity =
    (spotify && data.entitiesByUniqueId[spotify.entityUniqueId]) ||
    (apple && data.entitiesByUniqueId[apple.entityUniqueId]) ||
    data.entitiesByUniqueId[data.entityUniqueId];
  if (!entity?.title) return null;
  return {
    key: data.entityUniqueId,
    title: entity.title,
    artist: entity.artistName ?? "Unknown artist",
    artworkUrl: entity.thumbnailUrl ?? null,
    spotifyUrl: spotify?.url ?? null,
    appleMusicUrl: apple?.url ?? null,
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function spotifyFallback(link: ParsedLink & { service: "spotify" }): Promise<ResolvedSong | null> {
  const data = await fetchJson<{ title?: string; thumbnail_url?: string }>(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`,
  );
  if (!data?.title) return null;
  // oEmbed gives the song title but not the artist.
  return {
    key: `SPOTIFY_SONG::${link.trackId}`,
    title: data.title,
    artist: "",
    artworkUrl: data.thumbnail_url ?? null,
    spotifyUrl: link.url,
    appleMusicUrl: null,
  };
}

async function appleFallback(link: ParsedLink & { service: "apple" }): Promise<ResolvedSong | null> {
  const data = await fetchJson<{
    results?: { trackName?: string; artistName?: string; artworkUrl100?: string; trackViewUrl?: string }[];
  }>(`https://itunes.apple.com/lookup?id=${link.trackId}&entity=song`);
  const track = data?.results?.[0];
  if (!track?.trackName) return null;
  return {
    key: `ITUNES_SONG::${link.trackId}`,
    title: track.trackName,
    artist: track.artistName ?? "",
    artworkUrl: track.artworkUrl100 ?? null,
    spotifyUrl: null,
    appleMusicUrl: link.url,
  };
}

export async function resolveSong(input: string): Promise<ResolvedSong> {
  const link = parseSongLink(input);
  const odesli = await fetchJson<OdesliResponse>(
    `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(link.url)}&userCountry=US`,
  );
  const song =
    (odesli && songFromOdesli(odesli)) ||
    (link.service === "spotify" ? await spotifyFallback(link) : await appleFallback(link));
  if (!song) throw new SongLinkError("Couldn't find that song. Check the link and try again.");
  // Always keep the link the player pasted, even if matching found a different one.
  if (link.service === "spotify") song.spotifyUrl ??= link.url;
  else song.appleMusicUrl ??= link.url;
  return song;
}

/** The embeddable player URL for a song on the listener's chosen service. */
export function embedUrl(
  song: { spotifyUrl: string | null; appleMusicUrl: string | null },
  preferred: Service,
): string | null {
  const spotify = () => {
    const id = song.spotifyUrl?.match(/\/track\/([A-Za-z0-9]+)/)?.[1];
    return id ? `https://open.spotify.com/embed/track/${id}` : null;
  };
  const apple = () => {
    if (!song.appleMusicUrl) return null;
    const url = new URL(song.appleMusicUrl);
    url.hostname = "embed.music.apple.com";
    return url.toString();
  };
  return preferred === "apple" ? (apple() ?? spotify()) : (spotify() ?? apple());
}
