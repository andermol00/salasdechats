/**
 * GIFs animados locales de No Trace. Los archivos están en public/gifs/.
 * No hace falta una cuenta, API key ni ninguna petición a terceros.
 */

export type LocalGif = {
  id: string;
  label: string;
  tags: string;
  src: string;
};

export const GIFS: LocalGif[] = [
  { id: "hola", label: "Hola", tags: "saludo bienvenido hi hey", src: "/gifs/hola.gif" },
  { id: "jaja", label: "Jaja", tags: "risa reír humor funny lol", src: "/gifs/jaja.gif" },
  { id: "wow", label: "Wow", tags: "increíble sorpresa asombro", src: "/gifs/wow.gif" },
  { id: "si", label: "Sí", tags: "vale afirmativo genial claro", src: "/gifs/si.gif" },
  { id: "no", label: "Nooo", tags: "negativo triste imposible", src: "/gifs/no.gif" },
  { id: "bravo", label: "Bravo", tags: "aplauso felicidades bien hecho", src: "/gifs/bravo.gif" },
  { id: "fiesta", label: "Fiesta", tags: "celebración baile cumpleaños party", src: "/gifs/fiesta.gif" },
  { id: "gracias", label: "Gracias", tags: "agradecimiento thanks", src: "/gifs/gracias.gif" },
  { id: "amor", label: "Amor", tags: "te quiero corazón love", src: "/gifs/amor.gif" },
  { id: "vamos", label: "Vamos", tags: "ánimo motivación fuerza", src: "/gifs/vamos.gif" },
  { id: "ok", label: "OK", tags: "vale perfecto correcto", src: "/gifs/ok.gif" },
  { id: "sorpresa", label: "OMG", tags: "sorpresa no me digas qué", src: "/gifs/sorpresa.gif" },
];

const BY_ID = new Map(GIFS.map((gif) => [gif.id, gif]));

export const GIF_PREFIX = "gif:";

export function getGif(id: string): LocalGif | null {
  return BY_ID.get(id) ?? null;
}

export function parseGifMessage(content: string): { gif: LocalGif | null; text: string } {
  if (!content.startsWith(GIF_PREFIX)) return { gif: null, text: content };
  const newline = content.indexOf("\n");
  const id = newline === -1 ? content.slice(GIF_PREFIX.length) : content.slice(GIF_PREFIX.length, newline);
  const gif = getGif(id);
  // Do not silently discard unknown content from an old or malformed message.
  if (!gif) return { gif: null, text: content };
  return { gif, text: newline === -1 ? "" : content.slice(newline + 1) };
}
