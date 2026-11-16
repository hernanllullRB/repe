import type { Metadata } from "next";
import { Footer } from "@/components/Chrome";
import { ImportRoutine } from "@/components/ImportRoutine";

export const metadata: Metadata = { title: "Importar rutina desde una foto", robots: { index: false } };

export default function ImportRoutinePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-5 pb-10 pt-4">
        <ImportRoutine />
      </main>
      <Footer />
    </>
  );
}
