import { ImageResponse } from "next/og";
import { getServerContest, getServerStandings } from "@/lib/server-api";
import { shapeLineToSvg, shapeParagraphToSvg } from "@/lib/svg-shaper";

export const runtime = "nodejs";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [contest, standings] = await Promise.all([
    getServerContest(code),
    getServerStandings(code),
  ]);

  const title = contest?.name || "Feather Contest";
  const desc = contest?.description || "Wikimedia Article Contest Dashboard";
  const wiki = contest?.wiki_dbname ? contest.wiki_dbname.toUpperCase() : "WIKIPEDIA";

  const participantsCount = standings?.length || 0;
  const totalArticles = contest?.total_articles ?? 0;
  const acceptedArticles = contest?.accepted_articles ?? 0;
  const acceptanceRate = totalArticles > 0 ? Math.round((acceptedArticles / totalArticles) * 100) : 0;

  const nowMs = Date.now();
  const startMs = contest?.start_date ? new Date(contest.start_date).getTime() : 0;
  const endMs = contest?.end_date ? new Date(contest.end_date).getTime() : 0;

  let statusText = "UPCOMING";
  let timeLeftText = "";
  let isLive = false;
  let isEnded = false;

  if (endMs > 0 && nowMs >= endMs) {
    statusText = "ENDED";
    timeLeftText = "Ended";
    isEnded = true;
  } else if (startMs > 0 && nowMs < startMs) {
    statusText = "UPCOMING";
    const diffMs = startMs - nowMs;
    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    timeLeftText = d > 0 ? `Starts in ${d}d ${h}h` : `Starts in ${h}h`;
  } else {
    statusText = "ACTIVE";
    isLive = true;
    const diffMs = endMs - nowMs;
    const d = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const h = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    timeLeftText = d > 0 ? `${d}d ${h}h left` : `${h}h left`;
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return "";
    }
  };

  const dateRange =
    contest?.start_date && contest?.end_date
      ? `${formatDate(contest.start_date)} — ${formatDate(contest.end_date)}`
      : "";

  // Shape complex Indic / Bengali typography via HarfBuzz & OpenType vectors
  const titleFontSize = title.length > 32 ? 42 : 50;
  const [titleSvg, descLines] = await Promise.all([
    shapeLineToSvg(title, titleFontSize),
    desc ? shapeParagraphToSvg(desc, 18, 1050, 2) : Promise.resolve([]),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          color: "#fafafa",
          padding: "45px 55px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative background gradients */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "50px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
          }}
        />

        {/* Top Header / Brand Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 10,
          }}
        >
          {/* Feather Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "22px",
              }}
            >
              F
            </div>
            <span style={{ fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px" }}>
              Feather
            </span>
            <span style={{ fontSize: "16px", color: "#71717a", marginLeft: "6px" }}>
              • Wikimedia Contest Platform
            </span>
          </div>

          {/* Wiki & Status Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "9999px",
                padding: "6px 16px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#a1a1aa",
              }}
            >
              {wiki}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: isEnded ? "#27272a" : isLive ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                border: `1px solid ${isEnded ? "#3f3f46" : isLive ? "rgba(16, 185, 129, 0.35)" : "rgba(59, 130, 246, 0.35)"}`,
                borderRadius: "9999px",
                padding: "6px 16px",
                fontSize: "14px",
                fontWeight: 700,
                color: isEnded ? "#a1a1aa" : isLive ? "#34d399" : "#60a5fa",
              }}
            >
              {statusText}
            </div>
          </div>
        </div>

        {/* Middle Content (Flawless HarfBuzz Vector Glyphs) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            zIndex: 10,
            maxWidth: "1080px",
          }}
        >
          {titleSvg.path ? (
            <svg
              width={titleSvg.width}
              height={titleSvg.height}
              viewBox={`0 0 ${titleSvg.width} ${titleSvg.height}`}
              style={{ display: "flex", overflow: "visible" }}
            >
              <path d={titleSvg.path} fill="#ffffff" />
            </svg>
          ) : (
            <div
              style={{
                fontSize: `${titleFontSize}px`,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-1px",
                color: "#ffffff",
              }}
            >
              {title}
            </div>
          )}

          {descLines.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {descLines.map((line, idx) => (
                <svg
                  key={idx}
                  width={line.width}
                  height={line.height}
                  viewBox={`0 0 ${line.width} ${line.height}`}
                  style={{ display: "flex", overflow: "visible" }}
                >
                  <path d={line.path} fill="#a1a1aa" />
                </svg>
              ))}
            </div>
          ) : desc ? (
            <div
              style={{
                fontSize: "19px",
                lineHeight: 1.45,
                color: "#a1a1aa",
                overflow: "hidden",
                maxHeight: "56px",
              }}
            >
              {desc}
            </div>
          ) : null}
        </div>

        {/* Live Metrics Row (Submissions, Accepted, Participants, Time Left) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            zIndex: 10,
          }}
        >
          {/* 1. Submissions Chip */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              backgroundColor: "rgba(24, 24, 27, 0.85)",
              border: "1px solid #27272a",
              borderRadius: "12px",
              padding: "12px 20px",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Submissions
            </span>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#ffffff" }}>
              {totalArticles}
            </span>
          </div>

          {/* 2. Accepted Chip */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              backgroundColor: "rgba(24, 24, 27, 0.85)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              borderRadius: "12px",
              padding: "12px 20px",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Accepted
            </span>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#10b981" }}>
              {acceptedArticles} {totalArticles > 0 ? `(${acceptanceRate}%)` : ""}
            </span>
          </div>

          {/* 3. Participants Chip */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              backgroundColor: "rgba(24, 24, 27, 0.85)",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              borderRadius: "12px",
              padding: "12px 20px",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Participants
            </span>
            <span style={{ fontSize: "24px", fontWeight: 800, color: "#a855f7" }}>
              {participantsCount}
            </span>
          </div>

          {/* 4. Time Left / Status Chip */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              backgroundColor: "rgba(24, 24, 27, 0.85)",
              border: `1px solid ${isLive ? "rgba(16, 185, 129, 0.3)" : "rgba(59, 130, 246, 0.3)"}`,
              borderRadius: "12px",
              padding: "12px 20px",
              flex: 1.2,
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: isLive ? "#34d399" : "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Timeline Status
            </span>
            <span style={{ fontSize: "22px", fontWeight: 800, color: isLive ? "#34d399" : "#93c5fd" }}>
              {timeLeftText}
            </span>
          </div>
        </div>

        {/* Bottom Footer / Dates & Domain */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "18px",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#d4d4d8", fontSize: "15px", fontWeight: 600 }}>
            <span>📅 {dateRange}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#71717a", fontSize: "14px", fontWeight: 600 }}>
            <span>feather-lite.toolforge.org</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
