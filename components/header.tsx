"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon, ArrowRightLeft } from "lucide-react";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="w-full border-b border-border/50">
      <div className="max-w-3xl mx-auto flex items-center justify-between py-5 px-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <ArrowRightLeft className="size-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">convertaryao</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Toggle theme"
        className="rounded-lg"
      >
        <Sun className="size-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </Button>
      </div>
    </header>
  );
}
