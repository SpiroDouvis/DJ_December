import { ExternalLink, Music } from "lucide-react";
import type { Song } from "@/lib/data";
import { embedUrl, type Service } from "@/lib/music";
import { cn } from "@/lib/utils";

export function SongCard({
  song,
  service,
  label,
  highlight = false,
  children,
}: {
  song: Song;
  service: Service;
  label?: string;
  highlight?: boolean;
  children?: React.ReactNode;
}) {
  const player = embedUrl(song, service);
  const isApple = player?.includes("embed.music.apple.com");
  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl border bg-background/50 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_12px_40px_-16px_var(--primary)]",
        highlight && "border-gold/50 glow",
      )}
    >
      <header className="flex items-center gap-3">
        {song.artworkUrl ? (
          <img src={song.artworkUrl} alt="" width={56} height={56} className="size-14 flex-none rounded-lg object-cover shadow-md" />
        ) : (
          <div className="grid size-14 flex-none place-items-center rounded-lg bg-gradient-to-br from-primary/40 to-fuchsia-500/30">
            <Music className="size-6 text-violet-200" />
          </div>
        )}
        <div className="grid min-w-0">
          {label ? (
            <span className="text-[11px] font-semibold tracking-wider text-violet-300 uppercase">{label}</span>
          ) : null}
          <strong className="truncate">{song.title}</strong>
          <span className="truncate text-sm text-muted-foreground">{song.artist}</span>
        </div>
      </header>
      {player ? (
        <iframe
          className="mt-3 w-full rounded-xl border-0"
          src={player}
          height={isApple ? 175 : 152}
          loading="lazy"
          allow="autoplay *; encrypted-media *; clipboard-write; fullscreen; picture-in-picture"
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          title={`${song.title} player`}
        />
      ) : null}
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {song.spotifyUrl ? (
          <a href={song.spotifyUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-200 hover:text-white">
            Spotify <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">Not on Spotify</span>
        )}
        {song.appleMusicUrl ? (
          <a href={song.appleMusicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-200 hover:text-white">
            Apple Music <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">Not on Apple Music</span>
        )}
      </p>
      {children}
    </article>
  );
}
