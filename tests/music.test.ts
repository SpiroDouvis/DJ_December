import { describe, expect, it } from "vitest";
import { embedUrl, parseSongLink, songFromOdesli, SongLinkError } from "@/lib/music";

describe("parseSongLink", () => {
  it("reads Spotify track links and drops tracking params", () => {
    expect(parseSongLink("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc")).toEqual({
      service: "spotify",
      trackId: "4cOdK2wGLETKBW3PvgPWqT",
      url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT",
    });
    expect(parseSongLink("https://open.spotify.com/intl-de/track/4cOdK2wGLETKBW3PvgPWqT").trackId).toBe(
      "4cOdK2wGLETKBW3PvgPWqT",
    );
  });
  it("reads Apple Music album?i= and song links", () => {
    expect(parseSongLink("https://music.apple.com/us/album/never-gonna-give-you-up/1558533900?i=1558534271").trackId).toBe(
      "1558534271",
    );
    expect(parseSongLink("https://music.apple.com/us/song/never-gonna-give-you-up/1558534271").trackId).toBe(
      "1558534271",
    );
  });
  it("rejects albums, playlists and other sites", () => {
    expect(() => parseSongLink("https://open.spotify.com/album/abcdefghijklmnop")).toThrow(SongLinkError);
    expect(() => parseSongLink("https://music.apple.com/us/album/x/1558533900")).toThrow(SongLinkError);
    expect(() => parseSongLink("https://youtube.com/watch?v=x")).toThrow(SongLinkError);
    expect(() => parseSongLink("not a link")).toThrow(SongLinkError);
  });
});

describe("songFromOdesli", () => {
  it("takes both links and the Spotify metadata", () => {
    const song = songFromOdesli({
      entityUniqueId: "SPOTIFY_SONG::abc",
      entitiesByUniqueId: {
        "SPOTIFY_SONG::abc": { title: "Song", artistName: "Artist", thumbnailUrl: "https://img/x.jpg" },
        "ITUNES_SONG::123": { title: "Song (Remastered)", artistName: "Artist" },
      },
      linksByPlatform: {
        spotify: { url: "https://open.spotify.com/track/abc", entityUniqueId: "SPOTIFY_SONG::abc" },
        appleMusic: { url: "https://geo.music.apple.com/us/album/_/1?i=123", entityUniqueId: "ITUNES_SONG::123" },
      },
    });
    expect(song).toEqual({
      key: "SPOTIFY_SONG::abc",
      title: "Song",
      artist: "Artist",
      artworkUrl: "https://img/x.jpg",
      spotifyUrl: "https://open.spotify.com/track/abc",
      appleMusicUrl: "https://geo.music.apple.com/us/album/_/1?i=123",
    });
  });
});

describe("embedUrl", () => {
  const song = {
    spotifyUrl: "https://open.spotify.com/track/abc123",
    appleMusicUrl: "https://music.apple.com/us/album/x/1?i=2",
  };
  it("uses the listener's service", () => {
    expect(embedUrl(song, "spotify")).toBe("https://open.spotify.com/embed/track/abc123");
    expect(embedUrl(song, "apple")).toBe("https://embed.music.apple.com/us/album/x/1?i=2");
  });
  it("falls back to the other service", () => {
    expect(embedUrl({ ...song, appleMusicUrl: null }, "apple")).toBe("https://open.spotify.com/embed/track/abc123");
  });
});
