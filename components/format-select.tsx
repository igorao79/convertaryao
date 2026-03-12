"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTargetFormats, getTargetFormatsForCategory, type FormatInfo } from "@/lib/formats";
import { ArrowRight } from "lucide-react";

interface FormatSelectProps {
  sourceFormat: FormatInfo | null;
  targetFormat: string;
  onTargetChange: (format: string) => void;
  multipleFormats?: boolean;
}

export function FormatSelect({
  sourceFormat,
  targetFormat,
  onTargetChange,
  multipleFormats,
}: FormatSelectProps) {
  const targetFormats = sourceFormat
    ? multipleFormats
      ? getTargetFormatsForCategory(sourceFormat.category)
      : getTargetFormats(sourceFormat.extension)
    : [];

  if (!sourceFormat) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-9 rounded-lg border border-dashed border-border bg-muted/20 flex items-center px-3">
          <span className="text-sm text-muted-foreground/50">Source</span>
        </div>
        <ArrowRight className="size-4 text-muted-foreground/30 shrink-0" />
        <div className="flex-1 h-9 rounded-lg border border-dashed border-border bg-muted/20 flex items-center px-3">
          <span className="text-sm text-muted-foreground/50">Target</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-9 rounded-lg border bg-muted/30 flex items-center px-3">
        <span className="text-sm font-medium">
          {multipleFormats
            ? sourceFormat.category === "image" ? "Images" : "Documents"
            : sourceFormat.label}
        </span>
        {!multipleFormats && (
          <span className="text-xs text-muted-foreground ml-1.5">
            {sourceFormat.category === "image" ? "image" : "doc"}
          </span>
        )}
      </div>

      <ArrowRight className="size-4 text-muted-foreground shrink-0" />

      <div className="flex-1">
        <Select value={targetFormat} onValueChange={onTargetChange}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Choose format" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Convert to</SelectLabel>
              {targetFormats.map((fmt) => (
                <SelectItem key={fmt.extension} value={fmt.extension}>
                  {fmt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
