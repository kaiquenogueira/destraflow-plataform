import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #08090a 0%, #15171a 50%, #0f1113 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          border: "2px solid rgba(199, 160, 107, 0.3)",
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
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #e6c99e 0%, #b98e59 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ color: "#14100b", fontSize: "30px", fontWeight: 900 }}>D</div>
          </div>
          <span style={{ color: "white", fontSize: "40px", fontWeight: 800 }}>
            Destraflow <span style={{ color: "#e3c79b", fontSize: "20px", letterSpacing: "0.2em" }}>TECH</span>
          </span>
        </div>
        <div
          style={{
            color: "white",
            fontSize: "54px",
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: "920px",
          }}
        >
          Mais tecnologia para vender mais Orlando.
        </div>
        <div
          style={{
            color: "#d8d3cb",
            fontSize: "24px",
            marginTop: "24px",
            maxWidth: "750px",
          }}
        >
          CRM especialista em Orlando com IA integrada no WhatsApp.
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
