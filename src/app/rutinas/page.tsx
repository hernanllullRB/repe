import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Chrome";
import { ChevronLeft } from "@/components/icons";
import { RoutinesList } from "@/components/RoutinesList";

export const metadata: Metadata = { title: "Mis rutinas", robots: { index: false } };

export default function RoutinesPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-5 px-5 pb-10 pt-4">
        <Link
          href="/"
          aria-label="Volver al inicio"
          className="press inline-flex h-11 w-11 items-center justify-center rounded-full bg-chip hover:bg-soft"
        >
          <ChevronLeft />
        </Link>
        <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">Mis rutinas</h1>
        <RoutinesList />
      </main>
      <Footer />
    </>
  );
}
