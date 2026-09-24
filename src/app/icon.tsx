import { ImageResponse } from "next/og";
import { lightPalette, symbolPath, symbolViewBox } from "@destraflow/brand";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: lightPalette.background,
      }}
    >
      <svg width="52" height="52" viewBox={symbolViewBox}>
        <path d={symbolPath} fill={lightPalette.text} fillRule="evenodd" />
      </svg>
    </div>,
    size,
  );
}
