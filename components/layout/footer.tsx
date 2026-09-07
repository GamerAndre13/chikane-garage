import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SiteSettings = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  location?: string | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
  social_whatsapp?: string | null;
};

const NAV_LINKS = [
  { label: "Catálogo", href: "/catalogo" },
  { label: "Sobre Nós", href: "/sobre" },
  { label: "Loja", href: "/loja" },
  { label: "Contacto", href: "/contacto" },
];

export async function Footer() {
  const supabase = await createClient();
  let settings: SiteSettings = {};
  try {
    const { data } = await supabase.from("site_settings").select("*").limit(1).single();
    if (data) settings = data as SiteSettings;
  } catch {
    // fallback to defaults
  }

  const phone = settings.phone || "+351 912 000 000";
  const email = settings.email || "garage@chikane.pt";
  const location = settings.location || settings.address || "Porto, Portugal";
  const instagram = settings.social_instagram;
  const facebook = settings.social_facebook;
  const whatsapp = settings.social_whatsapp;

  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#111111]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Logo + tagline */}
          <div className="md:col-span-4">
            <Link href="/" className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Chikane <span className="text-copper">Garage</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-gray-400">
              Viaturas de performance, escolhidas a dedo, entregues com garantia Chikane.
            </p>
          </div>

          {/* Navegação */}
          <div className="md:col-span-2">
            <h4 className="font-display text-xs font-semibold uppercase tracking-widest text-copper">
              Navegação
            </h4>
            <ul className="mt-4 space-y-2">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contactos */}
          <div className="md:col-span-3">
            <h4 className="font-display text-xs font-semibold uppercase tracking-widest text-copper">
              Contactos
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-gray-400">
              <li>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="transition-colors hover:text-white">
                  {phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${email}`} className="transition-colors hover:text-white">
                  {email}
                </a>
              </li>
              <li>{location}</li>
            </ul>
          </div>

          {/* Social */}
          <div className="md:col-span-3">
            <h4 className="font-display text-xs font-semibold uppercase tracking-widest text-copper">
              Segue-nos
            </h4>
            <div className="mt-4 flex flex-wrap gap-3">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-gray-400 transition-colors hover:bg-copper hover:text-white"
                  aria-label="Instagram"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-gray-400 transition-colors hover:bg-copper hover:text-white"
                  aria-label="Facebook"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5H16.5V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.8V11H8v3h2.5v7h3z" />
                  </svg>
                </a>
              )}
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-gray-400 transition-colors hover:bg-copper hover:text-white"
                  aria-label="WhatsApp"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.6.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4-.3-.8-.1-.9s.1-.2.4-.4.3-.3.4-.5.1-.3 0-.5-.6-1.5-.8-2-.2-.4-.5-.5h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 4.8 9c0 1.6 1.2 3.1 1.3 3.3s2.3 3.5 5.5 4.9c.8.3 1.4.5 1.9.6a2.9 2.9 0 0 0 2-.3 2 2 0 0 0 .9-1.6c0-.3 0-.6-.1-.7z" transform="scale(1.02)" />
                  </svg>
                </a>
              )}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              <Link href="/contacto" className="text-copper transition-colors hover:text-copper-light">
                Fala connosco
              </Link>
            </p>
          </div>
        </div>

        {/* Legal + copyright */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-gray-500">
            &copy; {year} Chikane Garage. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-6 text-xs text-gray-500">
            <Link href="/sobre" className="transition-colors hover:text-white">
              Política de Privacidade
            </Link>
            <Link href="/sobre" className="transition-colors hover:text-white">
              Termos &amp; Condições
            </Link>
            <Link href="/sobre" className="transition-colors hover:text-white">
              Livro de Reclamações
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
