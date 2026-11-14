import type { Song } from "@/lib/data";
import { embedUrl, type Service } from "@/lib/music";

export function SongCard({
  song,
  service,
  label,
  children,
}: {
  song: Song;
  service: Service;
  label?: string;
  children?: React.ReactNode;
}) {
  const player = embedUrl(song, service);
  const isApple = player?.includes("embed.music.apple.com");
  return (
    <article className="song">
      <header className="song-head">
        {song.artworkUrl ? <img src={song.artworkUrl} alt="" width={56} height={56} /> : <div className="art-blank" />}
        <div className="song-meta">
          {label ? <span className="tag">{label}</span> : null}
          <strong>{song.title}</strong>
          <span className="muted">{song.artist}</span>
        </div>
      </header>
      {player ? (
        <iframe
          className="embed"
          src={player}
          height={isApple ? 175 : 152}
          loading="lazy"
          allow="autoplay *; encrypted-media *; clipboard-write; fullscreen; picture-in-picture"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          title={`${song.title} player`}
        />
      ) : null}
      <p className="links">
        {song.spotifyUrl ? <a href={song.spotifyUrl} target="_blank" rel="noreferrer">Spotify</a> : <span className="muted">Not on Spotify</span>}
        {" · "}
        {song.appleMusicUrl ? <a href={song.appleMusicUrl} target="_blank" rel="noreferrer">Apple Music</a> : <span className="muted">Not on Apple Music</span>}
      </p>
      {children}
    </article>
  );
}
