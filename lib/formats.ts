export type FormatCategory = "image" | "document";

export interface FormatInfo {
  extension: string;
  label: string;
  mimeType: string;
  category: FormatCategory;
  inputOnly?: boolean;
}

export const formats: Record<string, FormatInfo> = {
  png: { extension: "png", label: "PNG", mimeType: "image/png", category: "image" },
  jpg: { extension: "jpg", label: "JPG", mimeType: "image/jpeg", category: "image" },
  jpeg: { extension: "jpeg", label: "JPEG", mimeType: "image/jpeg", category: "image" },
  webp: { extension: "webp", label: "WebP", mimeType: "image/webp", category: "image" },
  avif: { extension: "avif", label: "AVIF", mimeType: "image/avif", category: "image" },
  tiff: { extension: "tiff", label: "TIFF", mimeType: "image/tiff", category: "image" },
  gif: { extension: "gif", label: "GIF", mimeType: "image/gif", category: "image" },
  bmp: { extension: "bmp", label: "BMP", mimeType: "image/bmp", category: "image" },
  ico: { extension: "ico", label: "ICO", mimeType: "image/x-icon", category: "image" },
  svg: { extension: "svg", label: "SVG", mimeType: "image/svg+xml", category: "image", inputOnly: true },
  pdf: { extension: "pdf", label: "PDF", mimeType: "application/pdf", category: "document" },
  docx: {
    extension: "docx",
    label: "DOCX",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "document",
  },
  txt: { extension: "txt", label: "TXT", mimeType: "text/plain", category: "document" },
};

const documentConversions: Record<string, string[]> = {
  pdf: ["txt"],
  docx: ["txt"],
  txt: [],
};

export function getFormatFromFilename(filename: string): FormatInfo | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return formats[ext] || null;
}

export function getFormatFromMime(mimeType: string): FormatInfo | null {
  return Object.values(formats).find((f) => f.mimeType === mimeType) || null;
}

export function getTargetFormats(sourceFormat: string): FormatInfo[] {
  const source = formats[sourceFormat.toLowerCase()];
  if (!source) return [];

  if (source.category === "image") {
    return Object.values(formats).filter(
      (f) =>
        f.category === "image" &&
        !f.inputOnly &&
        f.extension !== source.extension &&
        f.extension !== "jpeg" &&
        !(source.extension === "jpg" && f.extension === "jpeg") &&
        !(source.extension === "jpeg" && f.extension === "jpg")
    );
  }

  if (source.category === "document") {
    const allowed = documentConversions[source.extension] || [];
    return allowed.map((ext) => formats[ext]).filter(Boolean);
  }

  return [];
}

export function isConversionAllowed(source: string, target: string): boolean {
  const sourceFormat = formats[source.toLowerCase()];
  const targetFormat = formats[target.toLowerCase()];
  if (!sourceFormat || !targetFormat) return false;
  if (sourceFormat.extension === targetFormat.extension) return false;
  if (sourceFormat.category !== targetFormat.category) return false;
  if (targetFormat.inputOnly) return false;

  if (sourceFormat.category === "document") {
    const allowed = documentConversions[sourceFormat.extension] || [];
    return allowed.includes(targetFormat.extension);
  }

  return true;
}

export function getCategoryLabel(category: FormatCategory): string {
  switch (category) {
    case "image": return "Image";
    case "document": return "Document";
  }
}

export function getAllInputFormats(): FormatInfo[] {
  const seen = new Set<string>();
  return Object.values(formats).filter((f) => {
    if (seen.has(f.extension)) return false;
    if (f.extension === "jpeg") return false;
    seen.add(f.extension);
    return true;
  });
}
