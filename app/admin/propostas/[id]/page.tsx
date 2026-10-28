"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface ExtraItem {
  catalog_extra_id?: string;
  variant_id?: string | null;
  name?: string;
  variant_name?: string | null;
  price?: number;
}

interface Proposal {
  id: string;
  vehicle_id: string | null;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  nif: string;
  base_price: number | null;
  extras_total: number | null;
  total_price: number | null;
  selected_extras: ExtraItem[] | null;
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente" },
  { value: "contacted", label: "Contactado" },
  { value: "in_progress", label: "Em negociação" },
  { value: "closed_won", label: "Fechado - Ganho" },
  { value: "closed_lost", label: "Fechado - Perdido" },
];

interface ProposalVehicle {
  brand: string | null;
  model: string | null;
  trim: string | null;
  slug: string;
  registration_year: number | null;
  price: number | null;
}

export default function PropostaDetalhe() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [vehicle, setVehicle] = useState<ProposalVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("sale_proposals").select("*").eq("id", id).single();
      if (cancelled) return;
      if (data) {
        setProposal(data as Proposal);
        setStatus(data.status || "pending");
        setAdminNotes(data.admin_notes || "");
        if (data.vehicle_id) {
          const { data: v } = await supabase.from("vehicles").select("brand, model, trim, slug, registration_year, price").eq("id", data.vehicle_id).maybeSingle();
          if (!cancelled) setVehicle(v);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!proposal) return;
    setSaving(true);
    const { error } = await supabase.from("sale_proposals").update({ status, admin_notes: adminNotes }).eq("id", proposal.id);
    if (error) alert("Erro ao guardar: " + error.message);
    else {
      alert("Guardado com sucesso");
      router.refresh();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p style={{ color: "var(--muted)" }}>A carregar...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div>
        <p style={{ color: "var(--muted)" }}>Proposta não encontrada</p>
        <Link href="/admin/propostas" className="text-sm" style={{ color: "var(--copper-deep)" }}>
          Voltar
        </Link>
      </div>
    );
  }

  const extras = Array.isArray(proposal.selected_extras) ? proposal.selected_extras : [];
  const date = new Date(proposal.created_at).toLocaleString("pt-PT");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl uppercase tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--foreground)" }}>
            Proposta #{proposal.id.slice(0, 8)}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Criada a {date}
          </p>
        </div>
        <Link href="/admin/propostas" className="text-sm" style={{ color: "var(--muted)" }}>
          ← Voltar à lista
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--copper-deep)" }}>
            Dados do cliente
          </p>
          <div className="grid gap-3 text-sm">
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Nome
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.name}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Email
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.email}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Telefone
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                NIF
              </p>
              <p style={{ color: "var(--foreground)" }}>{proposal.nif}</p>
            </div>
            {proposal.message && (
              <div>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  Mensagem
                </p>
                <p className="whitespace-pre-wrap" style={{ color: "var(--foreground)" }}>
                  {proposal.message}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--copper-deep)" }}>
            Viatura configurada
          </p>
          {vehicle ? (
            <div className="mb-4">
              <p style={{ color: "var(--foreground)" }}>
                {vehicle.brand} {vehicle.model} {vehicle.trim || ""}
              </p>
              {vehicle.registration_year && (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {vehicle.registration_year}
                </p>
              )}
              {vehicle.slug && (
                <Link href={`/catalogo/${vehicle.slug}`} target="_blank" className="text-xs" style={{ color: "var(--copper-deep)" }}>
                  Ver ficha pública
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Viatura não encontrada
            </p>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "var(--muted)" }}>Preço base</span>
              <span style={{ color: "var(--foreground)" }}>{proposal.base_price != null ? `${Number(proposal.base_price).toLocaleString("pt-PT")} €` : "-"}</span>
            </div>
            {extras.length > 0 && (
              <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                  Extras selecionados
                </p>
                <div className="space-y-1">
                  {extras.map((ex, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span style={{ color: "var(--foreground)" }}>
                        {ex.name}
                        {ex.variant_name ? ` - ${ex.variant_name}` : ""}
                      </span>
                      <span style={{ color: "var(--foreground)" }}>{ex.price != null ? `${Number(ex.price).toLocaleString("pt-PT")} €` : "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--muted)" }}>Total extras</span>
              <span style={{ color: "var(--foreground)" }}>{proposal.extras_total != null ? `${Number(proposal.extras_total).toLocaleString("pt-PT")} €` : "0 €"}</span>
            </div>
            <div className="flex justify-between pt-2 border-t text-base" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--foreground)" }}>Total estimado</span>
              <span style={{ color: "var(--copper-deep)" }}>{proposal.total_price != null ? `${Number(proposal.total_price).toLocaleString("pt-PT")} €` : "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border rounded p-5" style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-mid)" }}>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--copper-deep)" }}>
          Gestão da proposta
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: "var(--muted)" }}>
              Estado
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded bg-background"
              style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs uppercase tracking-widest mb-1 block" style={{ color: "var(--muted)" }}>
            Notas internas
          </label>
          <textarea
            rows={6}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded bg-background"
            style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
            placeholder="Notas para a equipa..."
          />
        </div>
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium"
            style={{ backgroundColor: "var(--copper-deep)", color: "var(--background-alt)", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "A guardar..." : "Guardar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
