import { ImageResponse } from "next/og";

export const alt = "Deploy Openclaw in one click.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0b0e",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#FF5F1F",
            letterSpacing: "-0.02em",
          }}
        >
          Open-clawbot<span style={{ fontStyle: "italic" }}>.com</span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#a1a1aa",
            marginTop: 16,
          }}
        >
          Deploy Openclaw in one click.
        </div>
      </div>
    ),
    { ...size }
  );
}
