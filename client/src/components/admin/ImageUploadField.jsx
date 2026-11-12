import { useRef, useState } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { compressImageFile } from "../../services/images";

export default function ImageUploadField({ name, label, value = "", accept = "image/*", className = "" }) {
  const urlRef = useRef(null);
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(value);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const data = await compressImageFile(file);
      urlRef.current.value = data;
      setPreview(data);
    } catch (issue) {
      setError(issue.message || "This image could not be opened.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  };

  const updateUrl = (event) => {
    setPreview(event.target.value);
    setError("");
  };

  return (
    <label className={`imageUploadField ${className}`}>
      {label}
      <input ref={urlRef} name={name} defaultValue={value} onChange={updateUrl} placeholder="Paste an image URL or choose a file" />
      <span className="imageUploadActions">
        <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}><Upload />{busy ? "Preparing image…" : "Upload from device"}</button>
        {preview && <button type="button" className="imageClearButton" onClick={() => { urlRef.current.value = ""; setPreview(""); }} aria-label={`Remove ${label}`}><X /></button>}
      </span>
      <input ref={fileRef} className="visuallyHiddenFile" type="file" accept={accept} onChange={pickFile} />
      {error && <small className="imageUploadError">{error}</small>}
      {preview && <span className="imageUploadPreview"><img src={preview} alt={`${label} preview`} onError={() => setPreview("")} /><small><ImagePlus /> Image preview</small></span>}
    </label>
  );
}
