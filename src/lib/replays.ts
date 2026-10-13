export type ReplayAccess = "free" | "premium";

export interface LiveReplay {
  id: string;
  title: string;
  description?: string;
  trainer?: string;
  category?: string;
  durationMin?: number;
  recordedAt?: string;
  access: ReplayAccess;
  /** Link HTTPS para YouTube, Vimeo ou arquivo MP4/WebM/OGG. */
  playbackUrl: string;
  /** Gradiente CSS usado como capa quando não houver thumbnail. */
  coverGradient?: string;
}

export type ReplaySource =
  | { kind: "iframe"; src: string }
  | { kind: "video"; src: string }
  | { kind: "link"; src: string };

/**
 * Adicione aqui cada gravação publicada.
 * O player entende links padrão do YouTube (incluindo não listado), Vimeo e
 * arquivos de vídeo HTTPS. O gate Premium é apenas demonstrativo no GitHub Pages;
 * não use links privados sensíveis sem uma camada de autorização no servidor.
 */
export const liveReplays: LiveReplay[] = [
  {
    id: "vem-pra-bahia",
    title: "Vem Pra Bahia",
    access: "free",
    playbackUrl: "https://youtu.be/XgnuXVzn-qc",
  },
];

export function resolveReplaySource(rawUrl: string): ReplaySource | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com"
  ) {
    const segments = url.pathname.split("/").filter(Boolean);
    const id =
      url.searchParams.get("v") ||
      (host === "youtu.be" ? segments[0] : segments[1] === "embed" ? segments[2] : segments[1]);
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return {
      kind: "iframe",
      src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const segments = url.pathname.split("/").filter(Boolean);
    const id = host === "player.vimeo.com" ? segments[1] : segments[0];
    if (!id || !/^\d+$/.test(id)) return null;
    const hash =
      url.searchParams.get("h") ||
      (host === "vimeo.com" && segments[1] && !/^\d+$/.test(segments[1])
        ? segments[1]
        : null);
    const privacyQuery = hash ? `?h=${encodeURIComponent(hash)}&autoplay=1` : "?autoplay=1";
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${id}${privacyQuery}`,
    };
  }

  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
    return { kind: "video", src: url.toString() };
  }

  return { kind: "link", src: url.toString() };
}
