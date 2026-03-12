"use client";

import { createContext, useContext, useCallback, useState, useEffect, useRef, type ReactNode } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalDropContextType {
  onFilesDropped: ((files: File[]) => void) | null;
  setDropHandler: (handler: ((files: File[]) => void) | null) => void;
}

const GlobalDropContext = createContext<GlobalDropContextType>({
  onFilesDropped: null,
  setDropHandler: () => {},
});

export function useGlobalDrop(handler: (files: File[]) => void) {
  const { setDropHandler } = useContext(GlobalDropContext);

  useEffect(() => {
    setDropHandler(handler);
    return () => setDropHandler(null);
  }, [handler, setDropHandler]);
}

export function GlobalDropProvider({ children }: { children: ReactNode }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const handlerRef = useRef<((files: File[]) => void) | null>(null);
  const dragCounter = useRef(0);

  const setDropHandler = useCallback((handler: ((files: File[]) => void) | null) => {
    handlerRef.current = handler;
  }, []);

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragOver(true);
      }
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragOver(false);
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragOver(false);
      if (e.dataTransfer?.files.length && handlerRef.current) {
        handlerRef.current(Array.from(e.dataTransfer.files));
      }
    };

    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);

    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <GlobalDropContext.Provider value={{ onFilesDropped: handlerRef.current, setDropHandler }}>
      {children}
      {/* Full-screen drop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-200",
          isDragOver ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="rounded-2xl border-2 border-dashed border-primary bg-primary/5 p-12 text-center">
          <Upload className="size-10 text-primary mx-auto mb-3" />
          <p className="text-lg font-medium">Drop files anywhere</p>
          <p className="text-sm text-muted-foreground mt-1">Files will be added for conversion</p>
        </div>
      </div>
    </GlobalDropContext.Provider>
  );
}
