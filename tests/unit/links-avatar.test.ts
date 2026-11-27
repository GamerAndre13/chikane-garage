import { describe, expect, it } from "vitest";
import { pickFromPool } from "../../lib/avatar-pool";
import { mapsUrl } from "../../lib/maps";
import { facebookUrl, instagramUrl, tiktokUrl, whatsappUrl, youtubeUrl } from "../../lib/social-links";

describe("ligações e avatar", () => {
  it("gera pesquisa Maps e prioriza endereço configurado", () => {
    expect(mapsUrl(null, "Rua A", "Lisboa")).toBe("https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%20Lisboa");
    expect(mapsUrl("  https://maps.example/x ", "Rua A")).toBe("https://maps.example/x"); expect(mapsUrl()).toBeNull();
  });
  it("normaliza links sociais como URL, domínio ou identificador", () => {
    expect(instagramUrl("@chikane")).toBe("https://instagram.com/chikane"); expect(instagramUrl("instagram.com/x")).toBe("https://instagram.com/x"); expect(instagramUrl("https://instagram.com/x")).toBe("https://instagram.com/x");
    expect(facebookUrl("pagina")).toBe("https://facebook.com/pagina"); expect(youtubeUrl("canal")).toBe("https://youtube.com/canal"); expect(tiktokUrl("@canal")).toBe("https://tiktok.com/@canal");
    expect(whatsappUrl("+351 912 345 678")).toBe("https://wa.me/351912345678"); expect(whatsappUrl("wa.me/123")).toBe("https://wa.me/123"); expect(whatsappUrl("https://wa.me/123")).toBe("https://wa.me/123"); expect(whatsappUrl("---")).toBe("");
  });
  it("seleciona avatar de forma estável e trata lista vazia", () => {
    expect(pickFromPool("u1")).toBeNull(); expect(pickFromPool("u1", " \n ")).toBeNull();
    const pool = "a.png\n b.png \nc.png"; expect(pickFromPool("utilizador", pool)).toBe(pickFromPool("utilizador", pool)); expect(["a.png", "b.png", "c.png"]).toContain(pickFromPool("utilizador", pool));
  });
});
