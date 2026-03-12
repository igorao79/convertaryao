"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "./file-dropzone";
import { FormatSelect } from "./format-select";
import { ConversionOptions } from "./conversion-options";
import { getFormatFromFilename, type FormatInfo } from "@/lib/formats";
import { Download, Loader2, RotateCcw, FileArchive } from "lucide-react";
import { toast } from "sonner";

type ConversionState = "idle" | "converting" | "done" | "error";

interface ConvertedFile {
  url: string;
  filename: string;
}

export function Converter() {
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState<string>("");
  const [removeBackground, setRemoveBackground] = useState(false);
  const [state, setState] = useState<ConversionState>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ConvertedFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Determine common source format — if all files same category, use first file's format
  const sourceFormat: FormatInfo | null = useMemo(() => {
    if (files.length === 0) return null;
    return getFormatFromFilename(files[0].name);
  }, [files]);

  // Check if all files are images (for remove bg option)
  const allImages = useMemo(() => {
    return files.length > 0 && files.every((f) => {
      const info = getFormatFromFilename(f.name);
      return info?.category === "image";
    });
  }, [files]);

  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setTargetFormat("");
    setRemoveBackground(false);
    setState("idle");
    setProgress(0);
    setResults([]);
    setErrorMessage("");
  }, []);

  const handleConvert = async () => {
    if (files.length === 0 || !targetFormat) return;

    setState("converting");
    setProgress(0);
    setErrorMessage("");
    const converted: ConvertedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(Math.round(((i) / files.length) * 90));

        const formData = new FormData();
        formData.append("file", file);
        formData.append("targetFormat", targetFormat);
        formData.append("options", JSON.stringify({ removeBackground, quality: 90 }));

        const response = await fetch("/api/convert", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to convert ${file.name}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const originalName = file.name.replace(/\.[^.]+$/, "");
        converted.push({ url, filename: `${originalName}.${targetFormat}` });
      }

      setResults(converted);
      setProgress(100);
      setState("done");
      toast.success(`Converted ${converted.length} file${converted.length > 1 ? "s" : ""}!`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Conversion failed";
      setErrorMessage(msg);
      setState("error");
      setProgress(0);
      toast.error("Conversion failed", { description: msg });
    }
  };

  const handleDownload = (result: ConvertedFile) => {
    const a = document.createElement("a");
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = async () => {
    if (results.length === 1) {
      handleDownload(results[0]);
      return;
    }
    // Download as zip for multiple files
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    for (const r of results) {
      const resp = await fetch(r.url);
      const blob = await resp.blob();
      zip.file(r.filename, blob);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted-files.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setFiles([]);
    setTargetFormat("");
    setRemoveBackground(false);
    setState("idle");
    setProgress(0);
    setResults([]);
    setErrorMessage("");
  };

  const truncName = (name: string, max = 30) => {
    if (name.length <= max) return name;
    const ext = name.split(".").pop() || "";
    const base = name.slice(0, name.length - ext.length - 1);
    return `${base.slice(0, max - ext.length - 4)}...${ext}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <FileDropzone files={files} onFilesChange={handleFilesChange} />

        <FormatSelect
          sourceFormat={sourceFormat}
          targetFormat={targetFormat}
          onTargetChange={setTargetFormat}
        />

        <ConversionOptions
          targetFormat={targetFormat}
          sourceCategory={allImages ? "image" : sourceFormat?.category}
          removeBackground={removeBackground}
          onRemoveBackgroundChange={setRemoveBackground}
        />

        {state === "converting" && (
          <div className="space-y-1.5">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-center">
              Converting... {progress}% ({Math.round((progress / 90) * files.length)}/{files.length})
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {state === "done" ? (
            <>
              {/* Individual downloads */}
              {results.length > 1 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => handleDownload(r)}
                      className="w-full flex items-center gap-2 rounded-lg border border-border hover:bg-primary/5 hover:border-primary/30 p-2 text-sm text-left transition-colors cursor-pointer"
                    >
                      <Download className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{truncName(r.filename)}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleDownloadAll} className="flex-1 bg-primary hover:bg-primary/90" size="lg">
                  {results.length > 1 ? (
                    <>
                      <FileArchive className="size-4 mr-1.5" />
                      Download All (.zip)
                    </>
                  ) : (
                    <>
                      <Download className="size-4 mr-1.5" />
                      <span className="truncate">{truncName(results[0]?.filename || "")}</span>
                    </>
                  )}
                </Button>
                <Button onClick={handleReset} variant="outline" size="lg">
                  <RotateCcw className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <Button
              onClick={handleConvert}
              disabled={files.length === 0 || !targetFormat || state === "converting"}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              {state === "converting" ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  Converting...
                </>
              ) : (
                <>Convert{files.length > 1 ? ` ${files.length} files` : ""}</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
