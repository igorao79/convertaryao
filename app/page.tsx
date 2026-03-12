import { Header } from "@/components/header";
import { Converter } from "@/components/converter";
import { ParticlesBg } from "@/components/particles-bg";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <ParticlesBg />

      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 gap-10">
        <div className="text-center max-w-2xl space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            File Converter
          </h1>
          <p className="text-base text-muted-foreground">
            Convert images and documents between formats. Fast, free, runs locally.
          </p>
        </div>

        <Converter />
      </main>
    </div>
  );
}
