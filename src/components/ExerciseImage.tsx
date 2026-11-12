import Image from "next/image";

const OPTIMIZABLE = [/^https:\/\/raw\.githubusercontent\.com\/yuhonas\//, /^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//, /^\/api\/uploads\//];

type Props = {
  src: string | null | undefined;
  alt: string;
  /** Ancho aproximado en pantalla, para pedir el tamaño justo. */
  sizes: string;
  className?: string;
  priority?: boolean;
};

/**
 * Imagen de un ejercicio que llena su contenedor (que define tamaño y forma).
 * Las del catálogo y las subidas se optimizan; un link externo se muestra tal cual.
 * Sin imagen, muestra un ícono.
 */
export function ExerciseImage({ src, alt, sizes, className = "", priority = false }: Props) {
  if (!src) {
    return (
      <span className={`flex h-full w-full items-center justify-center bg-chip text-muted ${className}`} aria-hidden={alt ? undefined : true}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />
        </svg>
        {alt && <span className="sr-only">{alt}</span>}
      </span>
    );
  }
  if (OPTIMIZABLE.some((re) => re.test(src))) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={priority ? "eager" : "lazy"} decoding="async" className={`h-full w-full object-cover ${className}`} />;
}
