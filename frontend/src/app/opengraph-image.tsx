import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Feather – Wikimedia Article Contest & Judging Platform";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#090d16",
          padding: "60px 70px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Ambient background glow */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.22) 0%, rgba(9, 13, 22, 0) 70%)",
          }}
        />

        {/* Top Header / Brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              🪶
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "38px", fontWeight: "900", color: "#ffffff", letterSpacing: "-0.03em" }}>
                Feather
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#93c5fd",
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  border: "1px solid rgba(59, 130, 246, 0.35)",
                  padding: "4px 10px",
                  borderRadius: "9999px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                2.0
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#94a3b8",
              fontSize: "15px",
              fontWeight: "600",
            }}
          >
            <span>Wikimedia Toolforge</span>
          </div>
        </div>

        {/* Hero Headline & Subtitle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "950px" }}>
          <h1
            style={{
              fontSize: "52px",
              fontWeight: "800",
              color: "#f8fafc",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            Wikimedia Article Contest &amp; Judging Platform
          </h1>
          <p
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              lineHeight: 1.45,
              margin: 0,
            }}
          >
            High-throughput contest management, real-time leaderboards, automated talk-page notifications, and scarcity-first jury evaluation for Wikipedia communities.
          </p>
        </div>

        {/* Bottom Feature Badges & Wikimedia Ecosystem */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(148, 163, 184, 0.15)",
            paddingTop: "28px",
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            {["50,000+ Scale", "Scarcity-First Balancing", "Multi-Wiki Integration", "Unicode Bengali"].map(
              (pill, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#e2e8f0",
                    fontSize: "14px",
                    fontWeight: "600",
                    padding: "6px 14px",
                    borderRadius: "8px",
                  }}
                >
                  {pill}
                </div>
              )
            )}
          </div>

          <div
            style={{
              color: "#64748b",
              fontSize: "14px",
              fontWeight: "500",
            }}
          >
            Wikipedia • Wikisource • Wiktionary • Commons
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
