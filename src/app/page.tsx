import Link from "next/link";
import { Footer, Logo } from "@/components/Chrome";
import { PopularList } from "@/components/PopularList";
import { ResumeRoutine, RoutinesButton } from "@/components/RoutinesHome";
import { SearchBox } from "@/components/SearchBox";

const PROBA = [
  { slug: "press-arnold", q: "press arnold" },
  { slug: "dominadas", q: "dominadas" },
  { slug: "hip-thrust", q: "hip thrust" },
];

const POPULARES = [
  { slug: "press-arnold", name: "Press Arnold", muscles: "Hombros" },
  { slug: "sentadilla-con-barra", name: "Sentadilla con barra", muscles: "Cuádriceps · Glúteos" },
  { slug: "peso-muerto", name: "Peso muerto", muscles: "Isquiotibiales · Zona lumbar" },
  { slug: "jalon-al-pecho", name: "Jalón al pecho", muscles: "Dorsales · Bíceps" },
  { slug: "dominadas", name: "Dominadas", muscles: "Dorsales · Bíceps" },
  { slug: "press-de-banca", name: "Press de banca", muscles: "Pecho · Tríceps" },
  { slug: "hip-thrust", name: "Hip thrust", muscles: "Glúteos" },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex h-[76px] w-full max-w-[680px] items-center justify-between px-5">
        <Logo />
        <RoutinesButton />
      </header>
      <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-6 px-5 md:gap-8 pb-14 pt-4 md:pt-12">
        <h1 className="font-display text-[36px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[56px]">
          ¿Qué ejercicio querés hacer bien hoy?
        </h1>

        <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-3.5 shadow-[0_1px_0_var(--line),0_10px_30px_rgba(27,31,59,0.08)] md:p-5">
          <SearchBox variant="hero" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-xs text-muted">Probá:</span>
            {PROBA.map((p) => (
              <Link
                key={p.slug}
                href={`/ejercicio/${p.slug}`}
                className="press inline-flex h-[30px] items-center rounded-full bg-chip px-3 text-[13px] font-medium hover:bg-soft"
              >
                {p.q}
              </Link>
            ))}
          </div>
        </div>

        <ResumeRoutine />

        <section className="flex flex-col gap-3" aria-labelledby="populares">
          <h2 id="populares" className="font-display text-xl font-bold tracking-[-0.02em]">
            Los más buscados
          </h2>
          <PopularList items={POPULARES} />
        </section>
      </main>
      <Footer />
    </>
  );
}
