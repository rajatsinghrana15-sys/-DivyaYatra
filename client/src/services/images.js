export async function compressImageFile(
  file,
  maxSize = 1400,
  quality = 0.76,
  minimum = {},
) {
  if (!file?.type?.startsWith("image/"))
    throw new Error("Choose an image file.");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose an image smaller than 15 MB.");

  let source;
  let dispose = () => {};
  if (typeof createImageBitmap === "function") {
    source = await createImageBitmap(file);
    dispose = () => source.close?.();
  } else {
    const objectUrl = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () =>
        reject(new Error("This image could not be opened."));
      image.src = objectUrl;
    });
    dispose = () => URL.revokeObjectURL(objectUrl);
  }
  if (
    source.width < (minimum.width || 0) ||
    source.height < (minimum.height || 0)
  ) {
    dispose();
    throw new Error(
      minimum.message ||
        `Choose an image at least ${minimum.width} × ${minimum.height} pixels.`,
    );
  }
  const scale = Math.min(1, maxSize / Math.max(source.width, source.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  try {
    canvas
      .getContext("2d")
      .drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", quality);
  } finally {
    dispose();
  }
}
