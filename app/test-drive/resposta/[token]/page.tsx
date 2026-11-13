import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TestDriveResponse } from "./response-actions";

// Página aberta pelo email de remarcação do test drive:
// /test-drive/resposta/<token>. Só mostra a data proposta e dois botões —
// aceitar (fica confirmado) ou pedir outro horário (volta a pendente).

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmar test drive — Chikane Garage",
  robots: { index: false, follow: false },
};

type DriveInfo = {
  id: string;
  name: string;
  status: string;
  proposed_date: string | null;
  confirmed_date: string | null;
  responded_at: string | null;
  vehicle: string | null;
  vehicle_slug: string | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(date);
};

export default async function TestDriveResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_test_drive_by_token", { p_token: token });
  const drive = (data ?? null) as DriveInfo | null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:py-24">
      <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Test drive</p>
      <h1 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-foreground sm:text-4xl">
        Nova data proposta
      </h1>

      {!drive ? (
        <div className="mt-6 border border-white/10 bg-surface px-5 py-6">
          <p className="text-sm leading-6 text-muted">
            Este link já não é válido. Se precisares de alterar o teu test drive, fala connosco.
          </p>
          <Link href="/contacto" className="mt-4 inline-block text-xs text-copper underline underline-offset-2">
            Falar com a Chikane Garage
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm leading-7 text-muted">
            Olá <strong className="text-foreground">{drive.name}</strong>, a Chikane Garage propôs uma nova data
            {drive.vehicle ? (
              <>
                {" "}
                para o test drive do <strong className="text-foreground">{drive.vehicle}</strong>
              </>
            ) : null}
            .
          </p>

          {drive.proposed_date ? (
            <>
              <div className="mt-6 border border-copper/30 bg-copper/5 px-5 py-5">
                <p className="font-display text-[10px] uppercase tracking-[0.22em] text-copper">Data proposta</p>
                <p className="mt-2 text-lg font-semibold leading-7 text-foreground">{formatDate(drive.proposed_date)}</p>
              </div>
              <p className="mt-4 text-xs leading-6 text-muted">
                Confirma se te dá jeito. Se não puderes nesse dia, escolhe outro horário — a marcação fica em aberto.
              </p>
              <TestDriveResponse token={token} vehicleSlug={drive.vehicle_slug} />
            </>
          ) : (
            <div className="mt-6 border border-white/10 bg-surface px-5 py-6">
              <p className="font-display text-xs uppercase tracking-[0.22em] text-copper">
                {drive.status === "confirmed" ? "Já confirmado" : "Sem alterações pendentes"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {drive.status === "confirmed"
                  ? `O teu test drive está confirmado para ${formatDate(drive.confirmed_date)}.`
                  : "Não há nenhuma data à espera de resposta. Se precisares de mudar, fala connosco."}
              </p>
              <Link href="/contacto" className="mt-4 inline-block text-xs text-copper underline underline-offset-2">
                Falar com a Chikane Garage
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
