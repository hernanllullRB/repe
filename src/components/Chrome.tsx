import Link from "next/link";

export function Logo({ className = "", tone = "default" }: { className?: string; tone?: "default" | "onDark" }) {
  return (
    <Link href="/" aria-label="Repe, inicio" className={`press inline-flex items-center gap-2 rounded-lg ${className}`}>
      <span
        aria-hidden="true"
        className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent font-display text-lg font-bold text-accent-ink"
      >
        R
      </span>
      <span
        className={`font-display text-[22px] font-bold tracking-[-0.02em] ${tone === "onDark" ? "text-white" : "text-ink"}`}
      >
        repe
      </span>
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line px-5 pb-7 pt-5 md:px-[5%]">
      <p className="text-xs leading-normal text-muted">
        Contenido informativo, generado con asistencia de IA. No reemplaza la indicación de un profesional.
      </p>
    </footer>
  );
}

export function Pill({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs md:h-7 md:px-3 md:text-[13px] ${
        accent ? "bg-soft font-semibold text-ink" : "bg-chip font-medium"
      }`}
    >
      {children}
    </span>
  );
}
