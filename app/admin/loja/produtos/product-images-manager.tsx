"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadProductImage, deleteProductImage, makeFirstProductImage } from "@/app/actions/shop-admin";

type ManagedImage = { id: string; url: string; alt_text: string; position: number };

// Gestão das fotografias do artigo: adicionar, apagar e escolher a principal.
export function ProductImagesManager({ productId, images, className }: { productId: string; images: ManagedImage[]; className?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sorted = [...images].sort((a, b) => a.position - b.position);

  const run = async (action: (formData: FormData) => Promise<void>, formData: FormData) => {
    setBusy(true);
    setError(null);
    try {
      await action(formData);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a operação.");
    } finally {
      setBusy(false);
    }
  };

  return <section className={`border border-border bg-surface p-5 sm:p-6 ${className ?? ""}`}><h2 className="font-display text-lg uppercase">Fotografias</h2>
    <p className="mt-2 text-xs leading-relaxed text-muted">A primeira fotografia é a principal na loja e nos cartões. A ordem é a que aparece na galeria da ficha do artigo.</p>
    {error && <p className="mt-3 border border-red/40 p-3 text-xs text-red">{error}</p>}
    {!sorted.length ? <p className="mt-4 text-sm text-muted">Este artigo ainda não tem fotografias.</p> :
      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{sorted.map((image, index) => <li key={image.id} className="border border-border">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={image.alt_text || "Fotografia do artigo"} className="aspect-[4/3] w-full object-cover"/>{index === 0 && <span className="absolute left-2 top-2 bg-copper px-2 py-0.5 font-display text-[9px] uppercase tracking-widest text-black">Principal</span>}</div>
        <div className="flex flex-wrap items-center justify-between gap-2 p-2">
          <form action={(formData) => run(makeFirstProductImage, formData)}><input type="hidden" name="id" value={image.id}/><button disabled={busy || index === 0} className="text-[10px] uppercase tracking-widest text-muted underline underline-offset-2 hover:text-copper disabled:opacity-40">Pôr em primeiro</button></form>
          <form action={(formData) => run(deleteProductImage, formData)}><input type="hidden" name="id" value={image.id}/><button disabled={busy} className="text-[10px] uppercase tracking-widest text-muted underline underline-offset-2 hover:text-red disabled:opacity-40">Apagar</button></form>
        </div>
      </li>)}</ul>}
    <form action={(formData) => run(uploadProductImage, formData)} className="mt-4 flex flex-wrap items-end gap-4 border border-dashed border-border p-4">
      <input type="hidden" name="product_id" value={productId}/>
      <label className="block text-xs uppercase tracking-widest text-muted">Nova fotografia<input ref={fileRef} name="image" type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy} className="mt-2 block text-xs text-muted file:mr-3 file:border-0 file:bg-copper file:px-3 file:py-2 file:font-display file:uppercase file:text-black"/></label>
      <button disabled={busy} className="bg-copper px-4 py-3 font-display text-[10px] uppercase tracking-widest text-black disabled:opacity-50">{busy ? "A enviar…" : "Adicionar fotografia"}</button>
    </form>
  </section>;
}
