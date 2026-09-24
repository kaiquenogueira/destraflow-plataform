import { ImageResponse } from "next/og";
import { lightPalette, platformBrand, symbolPath, symbolViewBox } from "@destraflow/brand";

export const runtime = "nodejs";

export function GET() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: 76,
        background: lightPalette.background,
        color: lightPalette.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="48" height="48" viewBox={symbolViewBox}>
          <path d={symbolPath} fill={lightPalette.text} fillRule="evenodd" />
        </svg>
        <span style={{ fontSize: 28, fontWeight: 600 }}>{platformBrand.name}</span>
      </div>
      <div style={{ display: "flex", width: 70, height: 4, marginTop: 56, background: lightPalette.brandSignature }} />
      <div style={{ display: "flex", maxWidth: 960, marginTop: 34, fontSize: 66, fontWeight: 400, lineHeight: 1.08, letterSpacing: -3 }}>
        Orlando exige contexto. Sua operação também.
      </div>
      <div style={{ display: "flex", maxWidth: 860, marginTop: 32, fontSize: 24, color: lightPalette.textMuted }}>
        CRM e inteligência artificial para agências de viagens.
      </div>
      <div style={{ display: "flex", marginTop: "auto", borderTop: `1px solid ${lightPalette.border}`, paddingTop: 18, fontSize: 18, color: lightPalette.brandGold }}>
        {new URL(platformBrand.siteUrl).host}
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
