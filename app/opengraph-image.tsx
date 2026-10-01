import { ImageResponse } from "next/og";

export const alt = "Chikane Garage — catálogo de viaturas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
        color: "#f1efed",
        background: "linear-gradient(125deg, #090909 0%, #17120e 62%, #3a1e0e 100%)",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 8,
          textTransform: "uppercase",
        }}
      >
        CHIKANE <span style={{ color: "#f47724", marginLeft: 12 }}>GARAGE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <span
          style={{
            display: "flex",
            color: "#f47724",
            fontSize: 20,
            letterSpacing: 8,
            textTransform: "uppercase",
          }}
        >
          CATÁLOGO DE VIATURAS
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.02,
            textTransform: "uppercase",
          }}
        >
          Escolhe a próxima
          <br />
          viatura.
        </span>
      </div>
      <div style={{ display: "flex", width: 88, height: 5, background: "#f47724" }} />
    </div>,
    size
  );
}