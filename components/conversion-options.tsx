"use client";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Eraser } from "lucide-react";

interface ConversionOptionsProps {
  targetFormat: string;
  sourceCategory?: string;
  removeBackground: boolean;
  onRemoveBackgroundChange: (value: boolean) => void;
}

export function ConversionOptions({
  targetFormat,
  sourceCategory,
  removeBackground,
  onRemoveBackgroundChange,
}: ConversionOptionsProps) {
  // Show for any image->image conversion where target supports transparency
  const transparentFormats = ["png", "webp", "avif", "tiff", "gif"];
  const showBgRemoval = sourceCategory === "image" && transparentFormats.includes(targetFormat);

  if (!showBgRemoval) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
          <Eraser className="size-4 text-primary" />
        </div>
        <div>
          <Label htmlFor="remove-bg" className="cursor-pointer font-medium text-sm">
            Remove Background
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detect and remove solid background color
          </p>
        </div>
      </div>
      <Switch
        id="remove-bg"
        checked={removeBackground}
        onCheckedChange={onRemoveBackgroundChange}
      />
    </div>
  );
}
