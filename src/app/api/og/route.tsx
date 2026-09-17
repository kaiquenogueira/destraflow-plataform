import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(_req: NextRequest) {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #0a7a6f 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ color: "white", fontSize: "24px", fontWeight: 700 }}>D</div>
          </div>
          <span style={{ color: "white", fontSize: "36px", fontWeight: 700 }}>Destraflow</span>
        </div>
        <div
          style={{
            color: "white",
            fontSize: "52px",
            fontWeight: 800,
            lineHeight: 1.2,
            maxWidth: "800px",
          }}
        >
          CRM com IA no WhatsApp para agências de viagem
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.8)",
            fontSize: "24px",
            marginTop: "24px",
            maxWidth: "600px",
          }}
        >
          Sua agência responde todo lead em segundos, qualifica e chega na cotação.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
