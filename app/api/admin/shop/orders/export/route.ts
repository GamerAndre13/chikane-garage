import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/[\r\n]+/g, " ").replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;

const statusLabel: Record<string, string> = { pending_payment: "A aguardar pagamento", paid: "Paga", preparing: "Em preparação", shipped: "Enviada", delivered: "Entregue", cancelled: "Cancelada", refunded: "Reembolsada", returned: "Devolvida" };

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Sem permissões." }, { status: 403 });
  const { data, error } = await supabase.from("orders").select("order_number,customer_name,customer_email,customer_phone,nif,status,payment_status,subtotal,shipping_total,total,created_at").order("created_at", { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: "Não foi possível exportar as encomendas." }, { status: 500 });
  const rows = [["Número", "Nome", "Email", "Telefone", "NIF", "Estado", "Pagamento", "Subtotal", "Portes", "Total", "Data"], ...(data ?? []).map((order) => [
    order.order_number, order.customer_name, order.customer_email, order.customer_phone, order.nif,
    statusLabel[order.status] ?? order.status, order.payment_status,
    Number(order.subtotal).toFixed(2), Number(order.shipping_total).toFixed(2), Number(order.total).toFixed(2),
    new Date(order.created_at).toISOString(),
  ])];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="encomendas-chikane-garage.csv"', "Cache-Control": "private, no-store" } });
}
