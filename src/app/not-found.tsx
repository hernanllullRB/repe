import Link from "next/link";
import { Footer, Logo } from "@/components/Chrome";

export default function NotFound() {
  return (
    <>
      <header className="flex h-[68px] items-center px-5 md:px-[5%]">
        <Logo />
      </header>
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-4 px-5 py-16">
        <h1 className="font-display text-5xl font-bold uppercase">No encontramos ese ejercicio</h1>
        <p className="text-muted">Puede que el enlace esté mal escrito. Buscalo desde el inicio.</p>
        <Link href="/" className="inline-flex min-h-11 w-fit items-center rounded-full bg-accent px-5 font-semibold text-accent-ink">
          Ir al buscador
        </Link>
      </main>
      <Footer />
    </>
  );
}
