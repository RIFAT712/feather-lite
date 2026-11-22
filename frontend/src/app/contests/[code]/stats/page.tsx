import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerContest, getServerContestStats } from "@/lib/server-api";
import ContestStatsClient from "./ContestStatsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const contest = await getServerContest(code);

  if (!contest) {
    return {
      title: "Statistics — Feather",
      description: "Submission trends, daily activity, and judging progression for Wikimedia article contests.",
    };
  }

  return {
    title: `Statistics — ${contest.name} · Feather`,
    description: `Real-time submission curves, evaluation metrics, and daily trends for ${contest.name}.`,
    openGraph: {
      title: `Statistics — ${contest.name}`,
      description: `Submission trends and judging progression for ${contest.name}.`,
    },
  };
}

export default async function ContestStatsPage({ params }: PageProps) {
  const { code } = await params;
  const contest = await getServerContest(code);

  if (!contest) {
    notFound();
  }

  const initialStats = await getServerContestStats(code);

  return (
    <ContestStatsClient
      code={code}
      initialContest={contest}
      initialStats={initialStats}
    />
  );
}
