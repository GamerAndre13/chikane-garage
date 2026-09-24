"use client";

import { useEffect, useState } from "react";

export function VehiclePhotoPicker({ onChange }: { onChange: (files: File[], coverIndex: number) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const update = (nextFiles: File[], nextCover: number) => {
    setFiles(nextFiles);
    setCoverIndex(nextCover);
    onChange(nextFiles, nextCover);
  };

  const addFiles = (selected: FileList | null) => {
    if (!selected) return;
    const incoming = Array.from(selected);
    const accepted = incoming.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    setNotice(accepted.length < incoming.length ? "Só são aceites JPG, PNG ou WebP até 10 MB cada." : null);
    const next = [...files, ...accepted];
    update(next, files.length === 0 ? 0 : coverIndex);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= files.length) return;
    const next = [...files];
    [next[index], next[target]] = [next[target], next[index]];
    const nextCover = coverIndex === index ? target : coverIndex === target ? index : coverIndex;
    update(next, nextCover);
  };

  const remove = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    const nextCover = next.length === 0 ? 0 : coverIndex === index ? 0 : coverIndex > index ? coverIndex - 1 : coverIndex;
    update(next, nextCover);
  };

  return (
    <section className="mt-5" aria-label="Fotografias da viatura">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#b87333]">Fotografias</p>
          <p className="mt-1 text-xs text-[#9a9a94]">Escolhe a capa e ajusta a ordem antes de guardar.</p>
        </div>
        <label className="cursor-pointer rounded border border-[#b87333]/50 bg-[#b87333]/10 px-3 py-2 text-xs font-medium uppercase tracking-wider text-[#d39453] hover:bg-[#b87333]/20">
          Selecionar fotografias
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} className="sr-only" />
        </label>
      </div>

      {files.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-[#333] px-5 py-8 text-center text-sm text-[#9a9a94] hover:border-[#b87333]/60">
          <span className="text-2xl">＋</span>
          <span className="mt-2">Clica para anexar fotos</span>
          <span className="mt-1 text-xs">JPG, PNG ou WebP · podes selecionar várias</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} className="sr-only" />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file, index) => (
            <article key={`${file.name}-${file.lastModified}-${index}`} className={`overflow-hidden rounded border ${coverIndex === index ? "border-[#b87333]" : "border-[#333]"}`}>
              <div className="relative aspect-square bg-[#0a0a0a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {previews[index] && <img src={previews[index]} alt={`Pré-visualização ${index + 1}: ${file.name}`} className="h-full w-full object-cover" />}
                {coverIndex === index && <span className="absolute left-2 top-2 rounded bg-[#b87333] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-black">Capa</span>}
                <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-1 text-xs text-white">{index + 1}</span>
              </div>
              <div className="space-y-2 p-2">
                <p className="truncate text-xs text-[#c8c8c2]" title={file.name}>{file.name}</p>
                <button type="button" onClick={() => { setCoverIndex(index); onChange(files, index); }} disabled={coverIndex === index} className="w-full rounded bg-[#292929] px-2 py-1.5 text-[11px] font-medium text-white enabled:hover:bg-[#383838] disabled:bg-[#b87333] disabled:text-black">{coverIndex === index ? "Imagem principal" : "Definir como principal"}</button>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Mover fotografia ${index + 1} para cima`} className="rounded border border-[#333] px-2 py-1 text-xs text-white disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === files.length - 1} aria-label={`Mover fotografia ${index + 1} para baixo`} className="rounded border border-[#333] px-2 py-1 text-xs text-white disabled:opacity-30">↓</button>
                  </div>
                  <button type="button" onClick={() => remove(index)} aria-label={`Remover ${file.name}`} className="px-2 py-1 text-xs text-red-400 hover:text-red-300">Remover</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {notice && <p role="status" className="mt-2 text-xs text-amber-300">{notice}</p>}
    </section>
  );
}
