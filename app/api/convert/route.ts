import { NextRequest, NextResponse } from "next/server";
import { convertFile, type ConvertOptions } from "@/lib/convert";
import { getFormatFromFilename, isConversionAllowed, formats } from "@/lib/formats";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const targetFormat = formData.get("targetFormat") as string | null;
    const optionsStr = formData.get("options") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!targetFormat) {
      return NextResponse.json({ error: "No target format specified" }, { status: 400 });
    }

    const sourceFormat = getFormatFromFilename(file.name);
    if (!sourceFormat) {
      return NextResponse.json({ error: "Unsupported source file format" }, { status: 400 });
    }

    if (!isConversionAllowed(sourceFormat.extension, targetFormat)) {
      return NextResponse.json(
        { error: `Cannot convert ${sourceFormat.label} to ${formats[targetFormat]?.label || targetFormat}` },
        { status: 400 }
      );
    }

    let options: ConvertOptions = {};
    if (optionsStr) {
      try {
        options = JSON.parse(optionsStr);
      } catch {
        // ignore invalid options
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await convertFile(buffer, sourceFormat.extension, targetFormat, options);

    const originalName = file.name.replace(/\.[^.]+$/, "");
    const filename = `${originalName}.${targetFormat}`;

    return new NextResponse(result.data, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": result.data.length.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
