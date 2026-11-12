// Turns a pasted HTTPS link (YouTube / Instagram / Facebook / direct file) into something the page can show.
export function parseMedia(value = "") {
  const src = String(value).trim();
  if (src.startsWith("data:image/")) return { kind: "image", src };
  if (src.startsWith("data:video/")) return { kind: "video", src };
  let url;
  try {
    url = new URL(src);
  } catch {
    return { kind: "invalid", src };
  }
  if (url.protocol !== "https:" || url.username || url.password)
    return { kind: "invalid", src };
  const host = url.hostname.replace(/^(www|m)\./, "");
  const path = url.pathname;
  if (host === "youtu.be" || host === "youtube.com") {
    const id =
      host === "youtu.be"
        ? path.slice(1)
        : url.searchParams.get("v") ||
          path.match(/\/(shorts|embed|live)\/([\w-]{6,})/)?.[2];
    if (id)
      return {
        kind: "embed",
        platform: "YouTube",
        src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id.split("/")[0])}`,
        ratio: path.includes("/shorts/") ? "9/16" : "16/9",
      };
  }
  if (host === "instagram.com") {
    const m = path.match(/\/(p|reel|reels|tv)\/([\w-]+)/);
    if (m)
      return {
        kind: "embed",
        platform: "Instagram",
        src: `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed`,
        ratio: "4/5",
      };
  }
  if (host === "facebook.com" || host === "fb.watch") {
    const plugin =
      /\/(videos?|reel|watch)\b/.test(path) || host === "fb.watch"
        ? "video"
        : "post";
    return {
      kind: "embed",
      platform: "Facebook",
      src: `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(src)}&show_text=false`,
      ratio: plugin === "video" ? "16/9" : "4/5",
    };
  }
  if (/\.(mp4|webm|mov)$/i.test(path)) return { kind: "video", src };
  return { kind: "image", src };
}
export const platformOf = (value) =>
  parseMedia(value).platform ||
  (value?.startsWith("data:") ? "Device" : "Link");
