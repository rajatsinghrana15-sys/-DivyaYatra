import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImageOff, Play } from "lucide-react";
import { parseMedia } from "../../services/media";

const fmtTime = (t) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "");
function ProVideo({ src, onError }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [dur, setDur] = useState("");
  const toggle = () => { const v = ref.current; if (!v) return; v.paused ? v.play() : v.pause(); };
  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    return () => {
      video.pause();
    };
  }, [src]);
  const pauseOtherVideos = (event) => {
    const activeVideo = event.currentTarget;
    document.querySelectorAll("video").forEach((video) => {
      if (video !== activeVideo && !video.paused) video.pause();
    });
    setPlaying(true);
  };
  return <div className={`proVideo${playing ? " playing" : ""}`}>
    <video ref={ref} src={src.startsWith("data:") ? src : `${src}#t=0.4`} preload="metadata" playsInline controls={playing} controlsList="nodownload noplaybackrate" disablePictureInPicture onError={onError}
      onLoadedMetadata={(e) => setDur(fmtTime(e.currentTarget.duration))} onPlay={pauseOtherVideos} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    {!playing && <button type="button" className="proPlay" onClick={toggle} aria-label="Play video"><span><Play fill="currentColor" /></span></button>}
    {!playing && dur && <i className="proDur">{dur}</i>}
  </div>;
}

export default function MediaView({ src, type = "photo", alt = "Trip memory" }) {
  const media = parseMedia(src);
  const [broken, setBroken] = useState(false);
  if (!src || media.kind === "invalid" || broken) return <div className="mediaFallback"><ImageOff /><span>Preview unavailable</span>{src?.startsWith("https://") && <a href={src} target="_blank" rel="noreferrer noopener">Open original <ExternalLink /></a>}</div>;
  if (media.kind === "embed") return <div className="mediaEmbed" style={{ aspectRatio: media.ratio }}><i className="embedBadge">{media.platform}</i><iframe src={media.src} title={`${media.platform} memory`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" referrerPolicy="no-referrer-when-downgrade" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation" allowFullScreen /></div>;
  if (type === "video" || media.kind === "video") return <ProVideo src={media.src} onError={() => setBroken(true)} />;
  return <img src={media.src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
}
