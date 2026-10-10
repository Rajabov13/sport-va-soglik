import { ImageResponse } from "next/og";

export const alt = "QO‘LLAB — Yaxshilikni birlashtiramiz";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#262a9e", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: "#3ccf8e" }} />
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>QO&apos;LLAB</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Har bir yaxshilik o&apos;z manzilini topsin.</div>
          <div style={{ fontSize: 30, color: "#c7cbff" }}>Yordamga muhtoj insonlar, ko&apos;ngillilar va tashkilotlar - bitta platformada.</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 26 }}>
          {["Ariza", "Moslashtirish", "Yordam", "Ta'sir"].map((s, i) => (
            <div key={s} style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: i === 3 ? "#3ccf8e" : "rgba(255,255,255,0.14)", color: i === 3 ? "#0b3d2a" : "white", fontWeight: 600 }}>
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
