import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Caregiver — Hire verified caretakers in Kenya";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #115e59 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: "#ffffff",
              color: "#0f766e",
              fontSize: 48,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            C
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>Caregiver</div>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 76,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -2,
            maxWidth: 980,
          }}
        >
          Find trusted caretakers in Kenya
        </div>

        <div style={{ marginTop: 28, fontSize: 32, opacity: 0.9, maxWidth: 960 }}>
          Verified nannies, elder care, home managers &amp; wellness pros — real certificates,
          transparent KES rates.
        </div>

        <div style={{ marginTop: 44, display: "flex", gap: 14 }}>
          {["✓ First Aid Certified", "✓ Professional Massage", "✓ Nairobi · Mombasa · Kisumu"].map(
            (label) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  padding: "10px 22px",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>
      </div>
    ),
    size
  );
}
