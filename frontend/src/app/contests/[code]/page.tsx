import { Metadata } from "next";
import {
  getServerContest,
  getServerMe,
  getServerStandings,
  getServerContestArticles,
  getServerJuryStats,
} from "@/lib/server-api";
import ContestDashboardClient from "./ContestDashboardClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const contest = await getServerContest(code);

  const title = contest?.name ? `${contest.name} — Feather` : "Contest — Feather";
  const description = contest?.description || `Wiki article contest ${contest?.name || code} on Feather.`;
  const contestPath = `/contests/${encodeURIComponent(code)}`;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://feather-lite.toolforge.org";
  const contestUrl = `${siteUrl}${contestPath}`;
  const ogImageUrl = `${siteUrl}${contestPath}/opengraph-image`;

  return {
    title,
    description,
    alternates: {
      canonical: contestPath,
    },
    openGraph: {
      title,
      description,
      url: contestUrl,
      type: "website",
      siteName: "Feather",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function ContestDashboardPage({ params }: PageProps) {
  const { code } = await params;
  const [contest, me, standings, articles, juryStats] = await Promise.all([
    getServerContest(code),
    getServerMe(),
    getServerStandings(code),
    getServerContestArticles(code, 50),
    getServerJuryStats(code),
  ]);

  return (
    <ContestDashboardClient
      code={code}
      initialContest={contest}
      initialMe={me}
      initialStandings={standings}
      initialArticles={articles}
      initialJuryStats={juryStats}
    />
  );
}
