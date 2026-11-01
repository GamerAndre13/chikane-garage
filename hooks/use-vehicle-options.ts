"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  DEFAULT_EXTERIOR_COLORS,
  DEFAULT_FEATURES,
  DEFAULT_INTERIOR_COLORS,
  mergeOptions,
} from "@/lib/vehicle-options";

/**
 * Opções dos campos de cor e de equipamento: valores por omissão + valores já
 * existentes na base de dados (cores/extras de outras viaturas).
 *
 * As leituras falham em silêncio (fica só a lista por omissão) para o
 * formulário continuar utilizável, por exemplo se a BD estiver sem migrações.
 */
export function useVehicleOptions() {
  const [exteriorColors, setExteriorColors] = useState<string[]>(() => mergeOptions(DEFAULT_EXTERIOR_COLORS, []));
  const [interiorColors, setInteriorColors] = useState<string[]>(() => mergeOptions(DEFAULT_INTERIOR_COLORS, []));
  const [featureOptions, setFeatureOptions] = useState<string[]>(() => mergeOptions(DEFAULT_FEATURES, []));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [vehiclesRes, featuresRes] = await Promise.all([
        supabase.from("vehicles").select("exterior_color, interior_color"),
        supabase.from("vehicle_features").select("label").limit(5000),
      ]);
      if (cancelled) return;

      const rows = (vehiclesRes.data || []) as { exterior_color: string | null; interior_color: string | null }[];
      const exterior = rows.map((row) => row.exterior_color || "").filter(Boolean);
      const interior = rows.map((row) => row.interior_color || "").filter(Boolean);
      const features = ((featuresRes.data || []) as { label: string | null }[])
        .map((row) => row.label || "")
        .filter(Boolean);

      setExteriorColors(mergeOptions(DEFAULT_EXTERIOR_COLORS, exterior));
      setInteriorColors(mergeOptions(DEFAULT_INTERIOR_COLORS, interior));
      setFeatureOptions(mergeOptions(DEFAULT_FEATURES, features));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { exteriorColors, interiorColors, featureOptions };
}
