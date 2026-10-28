import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CookieSettingsButton } from "@/components/layout/cookie-settings-button";
import type { SiteSettings } from "@/lib/site-settings";
import { instagramUrl, facebookUrl, whatsappUrl, youtubeUrl, tiktokUrl } from "@/lib/social-links";
import { mapsUrl } from "@/lib/maps";

const NAV_LINKS = [
  { label: "Usados", href: "/catalogo" },
  { label: "Novos", href: "/novos" },
  { label: "Sobre Nós", href: "/sobre" },
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

  const phone = settings.phone || null;
  const email = settings.email || null;
  const location = settings.location || settings.address || null;
  const locationHref = mapsUrl(settings.location_url, settings.address, settings.location);
  const instagram = settings.social_instagram ? instagramUrl(settings.social_instagram) : null;
  const facebook = settings.social_facebook ? facebookUrl(settings.social_facebook) : null;
  const whatsapp = settings.social_whatsapp ? whatsappUrl(settings.social_whatsapp) : null;
  const youtube = settings.social_youtube ? youtubeUrl(settings.social_youtube) : null;
  const tiktok = settings.social_tiktok ? tiktokUrl(settings.social_tiktok) : null;
  const tagline =
    settings.footer_tagline?.trim() ||
    "Consulta as viaturas disponíveis e pede informação sobre cada unidade.";

  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface-deep">
      <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12">
        <div className="grid gap-12 md:grid-cols-12">
          {/* Logo + tagline */}
          <div className="md:col-span-4">
            <Link href="/" className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Chikane <span className="text-copper">Garage</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{tagline}</p>
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
                    className="text-sm text-muted transition-colors hover:text-foreground"
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
            <ul className="mt-4 space-y-2 text-sm text-muted">
              {phone && <li>
                <a href={`tel:${phone.replace(/\s/g, "")}`} className="transition-colors hover:text-foreground">
                  {phone}
                </a>
              </li>}
              {email && <li>
                <a href={`mailto:${email}`} className="transition-colors hover:text-foreground">
                  {email}
                </a>
              </li>}
              {location && (
                <li>
                  {locationHref ? (
                    <a
                      href={locationHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-foreground"
                    >
                      {location}
                    </a>
                  ) : (
                    location
                  )}
                </li>
              )}
              {!phone && !email && !location && <li><Link href="/contacto" className="hover:text-foreground">Usa o formulário de contacto</Link></li>}
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-muted transition-colors hover:bg-copper hover:text-background"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-muted transition-colors hover:bg-copper hover:text-background"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-muted transition-colors hover:bg-copper hover:text-background"
                  aria-label="WhatsApp"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.6.1a6.5 6.5 0 0 1-3.2-2.8c-.2-.4-.3-.8-.1-.9s.1-.2.4-.4.3-.3.4-.5.1-.3 0-.5-.6-1.5-.8-2-.2-.4-.5-.5h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 4.8 9c0 1.6 1.2 3.1 1.3 3.3s2.3 3.5 5.5 4.9c.8.3 1.4.5 1.9.6a2.9 2.9 0 0 0 2-.3 2 2 0 0 0 .9-1.6c0-.3 0-.6-.1-.7z" transform="scale(1.02)" />
                  </svg>
                </a>
              )}
              {youtube && (
                <a
                  href={youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-muted transition-colors hover:bg-copper hover:text-background"
                  aria-label="YouTube"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              )}
              {tiktok && (
                <a
                  href={tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-muted transition-colors hover:bg-copper hover:text-background"
                  aria-label="TikTok"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
              )}
            </div>
            <p className="mt-4 text-xs text-muted/80">
              <Link href="/contacto" className="text-copper transition-colors hover:text-copper-light">
                Fala connosco
              </Link>
            </p>
          </div>
        </div>

        {/* Legal + copyright */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted/80">
            &copy; {year} Chikane Garage. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-6 text-xs text-muted/80">
            <Link href="/politica-de-privacidade" className="transition-colors hover:text-foreground">
              Política de Privacidade
            </Link>
            <Link href="/termos-e-condicoes" className="transition-colors hover:text-foreground">
              Termos &amp; Condições
            </Link>
            <CookieSettingsButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
