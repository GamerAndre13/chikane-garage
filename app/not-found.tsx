import Link from "next/link";

export default function NotFound() {
  return <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-start justify-center px-5 py-20 sm:px-8"><p className="font-display text-xs uppercase tracking-[0.24em] text-copper">Erro 404</p><h1 className="mt-4 font-display text-5xl font-bold uppercase leading-none text-white sm:text-7xl">Este caminho<br/>não está na garagem.</h1><p className="mt-5 max-w-lg text-sm leading-6 text-white/65">A página pode ter mudado ou o endereço pode estar incorreto.</p><Link href="/usados" className="mt-8 min-h-12 bg-copper px-6 py-4 font-display text-xs font-semibold uppercase tracking-widest text-black transition-colors hover:bg-copper-light">Explorar usados</Link></main>;
}
