"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileDropzone } from "./file-dropzone";
import { FormatSelect } from "./format-select";
import { ConversionOptions } from "./conversion-options";
import { useGlobalDrop } from "./global-drop-provider";
import { getFormatFromFilename, type FormatInfo, type FormatCategory } from "@/lib/formats";
import { Download, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
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

  // Analyze all files to determine categories and formats
  const fileAnalysis = useMemo(() => {
    if (files.length === 0) return { sourceFormat: null, commonCategory: null, isMixed: false, allImages: false };

    const infos = files.map((f) => getFormatFromFilename(f.name));
    const categories = new Set(infos.map((i) => i?.category).filter(Boolean) as FormatCategory[]);
    const isMixed = categories.size > 1;
    const commonCategory = categories.size === 1 ? [...categories][0] : null;
    const allImages = commonCategory === "image";

    // If all same extension, use that format. Otherwise create a virtual "category" format
    const extensions = new Set(infos.map((i) => i?.extension).filter(Boolean));
    let sourceFormat: FormatInfo | null;

    if (extensions.size === 1) {
      sourceFormat = infos[0];
    } else if (commonCategory) {
      // Multiple formats but same category — use first file's format for target list
      sourceFormat = infos[0];
    } else {
      sourceFormat = null;
    }

    return { sourceFormat, commonCategory, isMixed, allImages };
  }, [files]);

  const { sourceFormat, commonCategory, isMixed, allImages } = fileAnalysis;

  const handleFilesChange = useCallback((newFiles: File[]) => {
    setFiles(newFiles);
    setTargetFormat("");
    setRemoveBackground(false);
    setState("idle");
    setProgress(0);
    setResults([]);
    setErrorMessage("");
  }, []);

  const MAX_FILES = 10;

  // Global drop — add files from anywhere on the page
  const handleGlobalDrop = useCallback((droppedFiles: File[]) => {
    const existing = new Set(files.map((f) => `${f.name}_${f.size}`));
    const unique = droppedFiles.filter((f) => !existing.has(`${f.name}_${f.size}`));
    if (unique.length > 0) {
      const remaining = MAX_FILES - files.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        return;
      }
      const toAdd = unique.slice(0, remaining);
      if (toAdd.length < unique.length) {
        toast.warning(`Only ${toAdd.length} of ${unique.length} files added (max ${MAX_FILES})`);
      }
      setFiles((prev) => [...prev, ...toAdd]);
      setTargetFormat("");
      setRemoveBackground(false);
      setState("idle");
      setProgress(0);
      setResults([]);
      setErrorMessage("");
    }
  }, [files]);

  useGlobalDrop(handleGlobalDrop);

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

        {isMixed ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            <span className="text-amber-500">Files must be the same type (all images or all documents)</span>
          </div>
        ) : (
          <FormatSelect
            sourceFormat={sourceFormat}
            targetFormat={targetFormat}
            onTargetChange={setTargetFormat}
            multipleFormats={files.length > 1 && new Set(files.map((f) => getFormatFromFilename(f.name)?.extension)).size > 1}
          />
        )}

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
            <div className="flex gap-2">
              <Button onClick={handleDownloadAll} className="flex-1 bg-primary hover:bg-primary/90" size="lg">
                <Download className="size-4 mr-1.5" />
                {results.length > 1 ? "Download All (.zip)" : "Download"}
              </Button>
              <Button onClick={handleReset} variant="outline" size="lg">
                <RotateCcw className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleConvert}
              disabled={files.length === 0 || !targetFormat || state === "converting" || isMixed}
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
