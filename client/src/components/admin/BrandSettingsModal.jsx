import { Check } from "lucide-react";
import { useApp } from "../../context/AppContext";
import ImageUploadField from "./ImageUploadField";

export default function BrandSettingsModal() {
  const { settings, saveBrand } = useApp();
  return (
    <form className="siteBrandSettings" onSubmit={saveBrand}>
      <div className="formGrid">
        {[
          ["businessName", "Business name"],
          ["tagline", "Tagline"],
          ["heroTitle", "Homepage title, first line"],
          ["heroAccent", "Homepage title, highlighted line"],
          ["heroDescription", "Homepage intro"],
          ["aboutTitle", "About heading (optional)"],
          ["aboutDescription", "About description (optional)"],
          ["quoteText", "Homepage quote (optional)"],
          ["origin", "Base location"],
          ["phone", "Main phone"],
          ["alternatePhone", "Alternate phone"],
          ["email", "Email"],
          ["instagram", "Instagram URL"],
          ["facebook", "Facebook URL"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            {[
              "heroDescription",
              "aboutTitle",
              "aboutDescription",
              "quoteText",
            ].includes(key) ? (
              <textarea
                name={key}
                defaultValue={settings[key] || ""}
                rows={key === "aboutDescription" ? 3 : 2}
              />
            ) : (
              <input name={key} defaultValue={settings[key] || ""} />
            )}
          </label>
        ))}
        <ImageUploadField
          className="span2"
          name="logoUrl"
          label="Logo image"
          value={settings.logoUrl || ""}
        />
        <ImageUploadField
          className="span2"
          name="heroImageUrl"
          label="Homepage hero image (Full HD, minimum 1920 × 1080)"
          value={settings.heroImageUrl || ""}
          maxImageSize={2560}
          imageQuality={0.92}
          minimumResolution={{
            width: 1920,
            height: 1080,
            message:
              "For a sharp homepage background, choose a landscape photo at least 1920 × 1080 pixels.",
          }}
        />
      </div>
      <button className="btn btn-dark">
        <Check /> Save website settings
      </button>
    </form>
  );
}
