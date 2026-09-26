"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { cropVehicleImage } from "@/lib/crop-vehicle-image";
import {
  uploadVehicleImages,
  setCoverImage,
  reorderVehicleImages,
  deleteVehicleImage,
} from "@/app/actions/upload";

type VehicleImage = { id: string; url: string; position: number; alt_text: string };
type PendingImage = { id: string; url: string; file: File };
type GalleryItem = VehicleImage | PendingImage;
const isPending = (image: GalleryItem): image is PendingImage => "file" in image;

export type VehicleGalleryHandle = { save: () => Promise<{ error?: string }> };

export const VehicleGallery = forwardRef<VehicleGalleryHandle, {
  vehicleId: string;
  coverImageUrl: string;
  onCoverChange: (url: string) => void;
}>(function VehicleGallery({ vehicleId, coverImageUrl, onCoverChange }, ref) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [deleted, setDeleted] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draftCoverUrl, setDraftCoverUrl] = useState(coverImageUrl);
  const initialOrder = useRef<string[]>([]);
  const initialCover = useRef(coverImageUrl);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const loadImages = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("vehicle_images")
      .select("id, url, position, alt_text")
      .eq("vehicle_id", vehicleId)
      .order("position", { ascending: true });
    if (loadError) setError(loadError.message);
    else {
      const rows = (data || []) as VehicleImage[];
      initialOrder.current = rows.map((image) => image.url);
      setItems(rows);
    }
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { void loadImages(); }, [loadImages]);
  useEffect(() => () => {
    itemsRef.current.filter(isPending).forEach((image) => URL.revokeObjectURL(image.url));
  }, []);

  const save = useCallback(async () => {
    if (saving) return { error: "As alterações das fotografias já estão a ser guardadas." };
    const draftOrder = items.map((image) => image.url);
    const hasChanges = deleted.length > 0 || items.some(isPending) || draftCoverUrl !== initialCover.current || draftOrder.length !== initialOrder.current.length || draftOrder.some((url, index) => url !== initialOrder.current[index]);
    if (!hasChanges) return {};
    setSaving(true);
    setError(null);
    try {
      let savedItems: GalleryItem[] = [...items];
      const selectedCoverIndex = items.findIndex((image) => image.url === draftCoverUrl);
      const pending = savedItems.filter(isPending);
      if (pending.length) {
        const formData = new FormData();
        formData.append("vehicleId", vehicleId);
        pending.forEach((image) => formData.append("files", image.file));
        const upload = await uploadVehicleImages(formData);
        if (upload.error || !upload.urls?.length) return { error: upload.error || "Não foi possível carregar as fotografias." };
        if (upload.urls.length !== pending.length) return { error: "Nem todas as fotografias foram carregadas. Verifica o tipo e o tamanho dos ficheiros." };

        const { data, error: queryError } = await supabase.from("vehicle_images").select("id, url, position, alt_text").eq("vehicle_id", vehicleId);
        if (queryError) return { error: queryError.message };
        const rows = (data || []) as VehicleImage[];
        let uploadIndex = 0;
        savedItems = savedItems.map((image) => {
          if (!isPending(image)) return image;
          const url = upload.urls![uploadIndex++];
          const row = rows.find((candidate) => candidate.url === url);
          return row || image;
        });
        if (savedItems.some(isPending)) return { error: "As fotografias foram carregadas, mas não foi possível confirmar a galeria. Volta a carregar a página antes de tentar novamente." };
      }

      const removedIds = new Set(deleted.map((image) => image.id));
      for (const image of deleted) {
        const result = await deleteVehicleImage(image.id, vehicleId);
        if (result.error) return { error: result.error };
      }

      const finalItems = savedItems.filter((image) => !isPending(image) && !removedIds.has(image.id)) as VehicleImage[];
      const reordered = await reorderVehicleImages(vehicleId, finalItems.map((image) => image.id));
      if (reordered.error) return { error: reordered.error };

      const selectedCover = selectedCoverIndex >= 0 ? savedItems[selectedCoverIndex] : undefined;
      const nextCover = selectedCover && !isPending(selectedCover) && finalItems.some((image) => image.id === selectedCover.id)
        ? selectedCover.url
        : finalItems[0]?.url || "";
      const coverResult = await setCoverImage(vehicleId, nextCover);
      if (coverResult.error) return { error: coverResult.error };

      itemsRef.current.filter(isPending).forEach((image) => URL.revokeObjectURL(image.url));
      setDraftCoverUrl(nextCover);
      initialCover.current = nextCover;
      initialOrder.current = finalItems.map((image) => image.url);
      onCoverChange(nextCover);
      setDeleted([]);
      await loadImages();
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Erro ao guardar a galeria." };
    } finally {
      setSaving(false);
    }
  }, [deleted, draftCoverUrl, items, loadImages, onCoverChange, saving, vehicleId]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  const addFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    const accepted = incoming.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    setNotice(accepted.length < incoming.length ? "Só são aceites JPG, PNG ou WebP até 10 MB cada." : null);
    try {
      const cropped = await Promise.all(accepted.map(cropVehicleImage));
      setItems((current) => [...current, ...cropped.map((file) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(file), file }))]);
    } catch {
      setNotice("Não foi possível preparar uma das fotografias. Tenta novamente.");
    }
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const markForDeletion = (image: GalleryItem) => {
    if (isPending(image)) URL.revokeObjectURL(image.url);
    else setDeleted((current) => [...current, image]);
    setItems((current) => current.filter((item) => item.id !== image.id));
    if (image.url === draftCoverUrl) {
      const replacement = items.find((item) => item.id !== image.id);
      const url = replacement?.url || "";
      setDraftCoverUrl(url);
      if (!replacement || !isPending(replacement)) onCoverChange(url);
    }
  };

  const undoDelete = (image: VehicleImage) => {
    setDeleted((current) => current.filter((item) => item.id !== image.id));
    setItems((current) => [...current, image]);
  };

  if (loading) return <p className="text-sm text-muted">A carregar galeria...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted">Fotografias</h3>
          <p className="mt-1 text-xs text-muted">As alterações ficam pendentes até guardares a viatura.</p>
        </div>
        <label className="cursor-pointer rounded border border-copper/30 bg-copper/10 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-copper hover:bg-copper/20">
          Anexar fotos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} disabled={saving} className="sr-only" />
        </label>
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {notice && <p role="status" className="text-xs text-amber-300">{notice}</p>}

      {items.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border p-8 text-center text-sm text-muted hover:border-copper/60">
          <span>Nenhuma fotografia na galeria.</span><span className="mt-1 text-xs">Clica para anexar imagens JPG, PNG ou WebP.</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} disabled={saving} className="sr-only" />
        </label>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {items.map((image, index) => (
            <article key={image.id} className={`overflow-hidden rounded border ${image.url === draftCoverUrl ? "border-copper" : "border-border"}`}>
              <div className="relative aspect-square bg-background">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={isPending(image) ? image.file.name : image.alt_text || "Fotografia da viatura"} className="h-full w-full object-cover" />
                {image.url === draftCoverUrl && <span className="absolute left-2 top-2 rounded bg-copper px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">Capa</span>}
                <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-1 text-xs text-white">{index + 1}</span>
              </div>
              <div className="space-y-2 p-2">
                <button type="button" onClick={() => { setDraftCoverUrl(image.url); if (!isPending(image)) onCoverChange(image.url); }} disabled={image.url === draftCoverUrl || saving} className="w-full rounded px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide disabled:bg-copper disabled:text-black enabled:bg-[#292929] enabled:text-white">{image.url === draftCoverUrl ? "Capa atual" : "Definir capa"}</button>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0 || saving} aria-label="Mover fotografia para cima" className="rounded border border-border px-2 py-1 text-xs disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1 || saving} aria-label="Mover fotografia para baixo" className="rounded border border-border px-2 py-1 text-xs disabled:opacity-30">↓</button>
                  </div>
                  <button type="button" onClick={() => markForDeletion(image)} disabled={saving} className="px-2 py-1 text-xs text-red-400 hover:text-red-300">Marcar para apagar</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleted.length > 0 && <div className="rounded border border-border p-3 text-sm text-muted">
        <p>{deleted.length} {deleted.length === 1 ? "fotografia marcada" : "fotografias marcadas"} para apagar ao guardar.</p>
        <div className="mt-2 flex flex-wrap gap-2">{deleted.map((image) => <button key={image.id} type="button" onClick={() => undoDelete(image)} disabled={saving} className="text-xs text-copper underline">Anular remoção</button>)}</div>
      </div>}
    </div>
  );
});
