import { createClient } from "@/lib/supabase/server";
import { CheckoutForm, type CheckoutPrefill } from "@/components/shop/checkout-form";

export const metadata = { title: "Checkout" };

// Prefill do checkout para clientes com sessão: nome/email/telemóvel do perfil
// e a morada predefinida (ou a mais recente) da conta.
export default async function CheckoutPage() {
  let prefill: CheckoutPrefill | undefined;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: profile }, { data: address }] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle(),
        supabase.from("addresses").select("name, phone, line1, line2, city, postal_code, country").eq("user_id", user.id).order("is_default_shipping", { ascending: false }).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      prefill = {
        name: profile?.full_name || address?.name || "",
        email: user.email || "",
        phone: profile?.phone || address?.phone || "",
        shipping_name: address?.name || profile?.full_name || "",
        shipping_phone: address?.phone || profile?.phone || "",
        line1: address?.line1 || "",
        line2: address?.line2 || "",
        city: address?.city || "",
        postal_code: address?.postal_code || "",
        country: address?.country || "PT",
      };
    }
  } catch {
    // Sem sessão (ou BD indisponível) o checkout continua como convidado.
  }

  return <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-12">
    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-copper">Compra segura</p>
    <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none text-foreground sm:text-7xl">Finalizar encomenda</h1>
    <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted">Podes comprar como convidado. A encomenda só fica paga depois da confirmação do prestador de pagamento.</p>
    <div className="mt-10"><CheckoutForm prefill={prefill} /></div>
  </div>;
}
