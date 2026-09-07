"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  uploadVehicleImages,
  setCoverImage,
  reorderVehicleImages,
  deleteVehicleImage,
} from "@/app/actions/upload";

type VehicleImage = {
  id: string;
  url: string;
  position: number;
  alt_text: string;
};

export function VehicleGallery({ vehicleId, coverImageUrl, onCoverChange }: {
  vehicleId: string;
  coverImageUrl: string;
  onCoverChange: (url: string) => void;
}) {
  const [images, setImages] = useState<VehicleImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    const { data } = await supabase
      .from("vehicle_images")
      .select("id, url, position, alt_text")
      .eq("vehicle_id", vehicleId)
      .order("position", { ascending: true });
    setImages((data || []) as VehicleImage[]);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { loadImages(); }, [loadImages]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("vehicleId", vehicleId);
    Array.from(files).forEach((f) => formData.append("files", f));

    const result = await uploadVehicleImages(formData);
    if (result.error) setError(result.error);
    else {
      e.target.value = ""; // reset input
      loadImages();
    }
    setUploading(false);
  };

  const handleSetCover = async (url: string) => {
    const result = await setCoverImage(vehicleId, url);
    if (result.error) setError(result.error);
    else onCoverChange(url);
  };

  const handleReorder = async (newOrder: VehicleImage[]) => {
    const ids = newOrder.map((img) => img.id);
    const result = await reorderVehicleImages(vehicleId, ids);
    if (result.error) setError(result.error);
    else setImages(newOrder);
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm("Apagar esta imagem?")) return;
    const result = await deleteVehicleImage(imageId, vehicleId);
    if (result.error) setError(result.error);
    else loadImages();
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newImages = [...images];
    [newImages[index], newImages[index - 1]] = [newImages[index - 1], newImages[index]];
    handleReorder(newImages);
  };

  const moveDown = (index: number) => {
    if (index === images.length - 1) return;
    const newImages = [...images];
    [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    handleReorder(newImages);
  };

  if (loading) return <p className="text-sm text-muted">A carregar galeria...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-muted">Galeria (R2)</h3>
        <label className="px-3 py-1.5 bg-copper/10 border border-copper/30 rounded text-xs font-medium uppercase tracking-wider text-copper cursor-pointer">
          Adicionar fotos
          <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} className="sr-only" />
        </label>
      </div>

      {error && <div className="text-sm text-red-400 mb-3">{error}</div>}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted">
          Nenhuma imagem. Clica em "Adicionar fotos" para fazer upload para o R2.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group border border-border rounded overflow-hidden bg-background">
              <div className="aspect-square relative">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
                {img.url === coverImageUrl && (
                  <div className="absolute top-2 left-2 bg-copper text-white text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded">CAPA</div>
                )}
              </div>
              <div className="p-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>#{idx + 1}</span>
                  <div className="flex gap-1">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0} className="p-1 hover:bg-white/10 rounded transition-colors" title="Subir">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                    </button>
                    <button onClick={() => moveDown(idx)} disabled={idx === images.length - 1} className="p-1 hover:bg-white/10 rounded transition-colors" title="Descer">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSetCover(img.url)}
                    disabled={img.url === coverImageUrl}
                    className="flex-1 px-2 py-1 text-[11px] font-medium uppercase tracking-wider rounded transition-colors"
                    style={{
                      backgroundColor: img.url === coverImageUrl ? "#b87333" : "#2a2a2a",
                      color: img.url === coverImageUrl ? "#0a0a0a" : "#f5f5f0",
                      border: `1px solid ${img.url === coverImageUrl ? "#b87333" : "#2a2a2a"}`,
                    }}
                  >
                    {img.url === coverImageUrl ? "Capa atual" : "Definir capa"}
                  </button>
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider rounded transition-colors border border-red/50 text-red hover:bg-red/10"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}