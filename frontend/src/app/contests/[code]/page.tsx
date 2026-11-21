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

  if (!contest) {
    return {
      title: "Contest — Feather",
      description: "Wikimedia Article Contest Dashboard",
    };
  }

  const title = `${contest.name} — Feather`;
  const description = contest.description || `Wiki article contest ${contest.name} on Feather.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Feather",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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
