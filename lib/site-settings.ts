// Tipo partilhado da tabela site_settings (contactos, redes sociais e
// rodapé editáveis pelo backoffice em /admin/definicoes).
export type SiteSettings = {
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  location?: string | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
  social_whatsapp?: string | null;
  social_youtube?: string | null;
  social_tiktok?: string | null;
  footer_tagline?: string | null;
};
