import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExerciseDetail } from "@/components/ExerciseDetail";
import { Footer, Logo } from "@/components/Chrome";
import { SearchBox } from "@/components/SearchBox";
import { getExerciseView } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/ejercicio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const view = await getExerciseView(slug);
  if (!view) return { title: "Ejercicio no encontrado" };
  const description =
    view.content?.summary ??
    `Cómo hacer ${view.nameEs}: técnica, qué músculos trabaja y errores comunes.`;
  return {
    title: `${view.nameEs}: cómo hacerlo bien`,
    description,
    alternates: { canonical: `/ejercicio/${view.slug}` },
    openGraph: {
      title: `${view.nameEs} · Repe`,
      description,
      images: view.video ? [`https://i.ytimg.com/vi/${view.video.id}/hqdefault.jpg`] : view.images.slice(0, 1),
    },
  };
}

async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const view = await getExerciseView(slug);
  if (!view) notFound();
  return <ExerciseDetail initial={view} />;
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1180px] md:px-[5%] md:pt-6" role="status" aria-label="Cargando ejercicio">
      <div className="aspect-video w-full animate-pulse bg-hero md:max-w-[720px] md:rounded-3xl" />
      <div className="flex flex-col gap-3 px-5 pt-6 md:px-0">
        <div className="flex gap-1.5">
          <div className="h-[26px] w-20 animate-pulse rounded-full bg-chip" />
          <div className="h-[26px] w-24 animate-pulse rounded-full bg-chip" />
        </div>
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-chip md:h-14" />
        <div className="h-4 w-full max-w-[520px] animate-pulse rounded bg-chip" />
      </div>
    </div>
  );
}

export default function ExercisePage({ params }: PageProps<"/ejercicio/[slug]">) {
  return (
    <>
      <header className="hidden items-center gap-8 px-[5%] py-3.5 md:flex">
        <Logo />
        <div className="w-full max-w-[480px]">
          <SearchBox variant="compact" />
        </div>
      </header>
      <main className="flex-1">
        <Suspense fallback={<DetailSkeleton />}>
          <Detail params={params} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
