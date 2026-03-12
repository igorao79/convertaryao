import sharp from "sharp";
import { formats, isConversionAllowed } from "./formats";

export interface ConvertOptions {
  removeBackground?: boolean;
  quality?: number;
}

export async function convertFile(
  buffer: Buffer,
  sourceExt: string,
  targetExt: string,
  options: ConvertOptions = {}
): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  const src = sourceExt.toLowerCase().replace(".", "");
  const tgt = targetExt.toLowerCase().replace(".", "");

  if (!isConversionAllowed(src, tgt)) {
    throw new Error(`Conversion from ${src} to ${tgt} is not allowed`);
  }

  const targetFormat = formats[tgt];
  if (!targetFormat) {
    throw new Error(`Unknown target format: ${tgt}`);
  }

  const sourceFormat = formats[src];

  if (sourceFormat.category === "image") {
    return convertImage(buffer, src, tgt, options);
  }

  if (sourceFormat.category === "document") {
    return convertDocument(buffer, src, tgt);
  }

  throw new Error(`Unsupported conversion: ${src} → ${tgt}`);
}

async function convertImage(
  buffer: Buffer,
  source: string,
  target: string,
  options: ConvertOptions
): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  let pipeline = sharp(buffer);

  const transparentTargets = ["png", "webp", "avif", "tiff", "gif"];
  if (options.removeBackground && transparentTargets.includes(target)) {
    pipeline = pipeline.ensureAlpha();
    const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
    const pixels = new Uint8Array(data);
    const topLeftR = pixels[0];
    const topLeftG = pixels[1];
    const topLeftB = pixels[2];
    const threshold = 30;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      if (
        Math.abs(r - topLeftR) < threshold &&
        Math.abs(g - topLeftG) < threshold &&
        Math.abs(b - topLeftB) < threshold
      ) {
        pixels[i + 3] = 0;
      }
    }

    pipeline = sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels: 4 },
    });
  }

  const quality = options.quality || 90;

  switch (target) {
    case "png":
      pipeline = pipeline.png({ quality: Math.min(quality, 100) });
      break;
    case "jpg":
    case "jpeg":
      pipeline = pipeline.flatten({ background: "#ffffff" }).jpeg({ quality });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    case "tiff":
      pipeline = pipeline.tiff({ quality });
      break;
    case "gif":
      pipeline = pipeline.gif();
      break;
    case "ico": {
      const icoResized = sharp(buffer).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();
      const icoData = await icoResized.toBuffer();
      return {
        data: icoData,
        mimeType: "image/png",
        filename: `converted.ico`,
      };
    }
    case "bmp":
      pipeline = pipeline.raw();
      const raw = await pipeline.toBuffer({ resolveWithObject: true });
      const bmpPipeline = sharp(raw.data, {
        raw: {
          width: raw.info.width,
          height: raw.info.height,
          channels: raw.info.channels as 1 | 2 | 3 | 4,
        },
      }).png();
      const data = await bmpPipeline.toBuffer();
      return {
        data,
        mimeType: "image/png",
        filename: `converted.png`,
      };
    default:
      throw new Error(`Unsupported image target: ${target}`);
  }

  const data = await pipeline.toBuffer();
  const targetInfo = formats[target];

  return {
    data,
    mimeType: targetInfo.mimeType,
    filename: `converted.${target}`,
  };
}

async function convertDocument(
  buffer: Buffer,
  source: string,
  target: string
): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  if (target === "txt") {
    if (source === "pdf") {
      const text = await extractPdfText(buffer);
      return {
        data: Buffer.from(text, "utf-8"),
        mimeType: "text/plain",
        filename: "converted.txt",
      };
    }
    if (source === "docx") {
      const text = await extractDocxText(buffer);
      return {
        data: Buffer.from(text, "utf-8"),
        mimeType: "text/plain",
        filename: "converted.txt",
      };
    }
  }

  throw new Error(`Document conversion ${source} → ${target} is not supported`);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return result.text;
  } catch {
    throw new Error("Failed to extract text from PDF. The file may be corrupted or password-protected.");
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const content = await zip.file("word/document.xml")?.async("string");
    if (!content) throw new Error("Invalid DOCX file");
    const text = content
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
    return text;
  } catch {
    throw new Error("Failed to extract text from DOCX. The file may be corrupted.");
  }
}
