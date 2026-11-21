import { ImageResponse } from "next/og";
import { getServerContest } from "@/lib/server-api";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type FontItem = {
  name: string;
  data: ArrayBuffer;
  weight: 700 | 400;
  style: "normal";
};

let cachedFonts: FontItem[] | null = null;

async function loadFonts(): Promise<FontItem[]> {
  if (cachedFonts) return cachedFonts;
  try {
    const fontsDir = path.join(process.cwd(), "public/fonts");
    const [boldBuf, regBuf] = await Promise.all([
      fs.readFile(path.join(fontsDir, "NotoSansBengali-Bold.ttf")),
      fs.readFile(path.join(fontsDir, "NotoSansBengali-Regular.ttf")),
    ]);
    cachedFonts = [
      {
        name: "Noto Sans Bengali",
        data: boldBuf.buffer.slice(boldBuf.byteOffset, boldBuf.byteOffset + boldBuf.byteLength),
        weight: 700,
        style: "normal",
      },
      {
        name: "Noto Sans Bengali",
        data: regBuf.buffer.slice(regBuf.byteOffset, regBuf.byteOffset + regBuf.byteLength),
        weight: 400,
        style: "normal",
      },
    ];
    return cachedFonts;
  } catch (err) {
    try {
      const [boldRes, regRes] = await Promise.all([
        fetch("https://github.com/google/fonts/raw/main/ofl/notosansbengali/static/NotoSansBengali-Bold.ttf"),
        fetch("https://github.com/google/fonts/raw/main/ofl/notosansbengali/static/NotoSansBengali-Regular.ttf"),
      ]);
      const [boldArr, regArr] = await Promise.all([boldRes.arrayBuffer(), regRes.arrayBuffer()]);
      cachedFonts = [
        { name: "Noto Sans Bengali", data: boldArr, weight: 700, style: "normal" },
        { name: "Noto Sans Bengali", data: regArr, weight: 400, style: "normal" },
      ];
      return cachedFonts;
    } catch {
      return [];
    }
  }
}

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [contest, fonts] = await Promise.all([
    getServerContest(code),
    loadFonts(),
  ]);

  const title = contest?.name || "Feather Contest";
  const desc = contest?.description || "Wikimedia Article Contest Dashboard";
  const wiki = contest?.wiki_dbname ? contest.wiki_dbname.toUpperCase() : "WIKIPEDIA";
  const status = contest?.status === "active" ? "ACTIVE" : (contest?.status || "UPCOMING").toUpperCase();
  const isEnded = contest?.status === "ended";

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

  const totalArticles = contest?.total_articles ?? 0;
  const totalSubmissionsText = `${totalArticles} Submissions`;

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
          padding: "50px 60px",
          fontFamily: '"Noto Sans Bengali", system-ui, -apple-system, sans-serif',
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
                backgroundColor: isEnded ? "#27272a" : "rgba(16, 185, 129, 0.15)",
                border: `1px solid ${isEnded ? "#3f3f46" : "rgba(16, 185, 129, 0.3)"}`,
                borderRadius: "9999px",
                padding: "6px 16px",
                fontSize: "14px",
                fontWeight: 700,
                color: isEnded ? "#a1a1aa" : "#34d399",
              }}
            >
              {status}
            </div>
          </div>
        </div>

        {/* Middle Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            zIndex: 10,
            maxWidth: "1000px",
          }}
        >
          <div
            style={{
              fontSize: title.length > 35 ? "44px" : "56px",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-1px",
              color: "#ffffff",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "20px",
              lineHeight: 1.45,
              color: "#a1a1aa",
              overflow: "hidden",
              maxHeight: "60px",
            }}
          >
            {desc}
          </div>
        </div>

        {/* Bottom Footer / Dates & Metrics */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#d4d4d8", fontSize: "16px", fontWeight: 600 }}>
            <span>📅 {dateRange}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                padding: "8px 18px",
                fontSize: "15px",
                fontWeight: 600,
                color: "#e4e4e7",
              }}
            >
              {totalSubmissionsText}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts && fonts.length > 0 ? fonts : undefined,
    }
  );
}
