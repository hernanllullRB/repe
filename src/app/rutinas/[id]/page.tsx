import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/Chrome";
import { RoutineDetail } from "@/components/RoutineDetail";

export const metadata: Metadata = { title: "Rutina", robots: { index: false } };

/** La rutina vive en el dispositivo: la página es un cascarón y el contenido se arma en el navegador. */
export default function RoutinePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col px-5 pb-10 pt-4">
        <Suspense fallback={null}>
          <RoutineDetail />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
