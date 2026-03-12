"use client";

import { useCallback, useState, useRef } from "react";
import { Upload, X, Image, FileText, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getFormatFromFilename, getCategoryLabel } from "@/lib/formats";
import { cn } from "@/lib/utils";

interface FileDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncName(name: string, max = 36): string {
  if (name.length <= max) return name;
  const ext = name.split(".").pop() || "";
  const base = name.slice(0, name.length - ext.length - 1);
  return `${base.slice(0, max - ext.length - 4)}...${ext}`;
}

export function FileDropzone({ files, onFilesChange }: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 10;

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles);
      // Deduplicate by name+size
      const existing = new Set(files.map((f) => `${f.name}_${f.size}`));
      const unique = arr.filter((f) => !existing.has(`${f.name}_${f.size}`));
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
        onFilesChange([...files, ...toAdd]);
      }
    },
    [files, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {files.map((file, i) => {
            const info = getFormatFromFilename(file.name);
            const CategoryIcon = info?.category === "image" ? Image : FileText;
            return (
              <div
                key={`${file.name}_${file.size}_${i}`}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-2.5"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                  <CategoryIcon className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" title={file.name}>
                    {truncName(file.name)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {info && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                        {info.label}
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(i)}
                  className="shrink-0 h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            );
          })}
          {/* Add more button */}
          {files.length < MAX_FILES && (
            <button
              onClick={handleClick}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 p-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Plus className="size-3.5" />
              Add more files ({files.length}/{MAX_FILES})
            </button>
          )}
        </div>
      )}

      {/* Dropzone (show when no files) */}
      {files.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          className={cn(
            "group flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-primary/5"
          )}
        >
          <Upload
            className={cn(
              "size-8 mb-1 transition-colors",
              isDragOver ? "text-primary" : "text-muted-foreground/40 group-hover:text-primary/60"
            )}
          />
          <p className="text-sm font-medium">
            {isDragOver ? "Drop files here" : "Drop files or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP, AVIF, ICO, GIF, TIFF, BMP, SVG, PDF, DOCX, TXT
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleChange}
        className="hidden"
        accept="image/*,.pdf,.docx,.txt,.ico"
      />
    </div>
  );
}
