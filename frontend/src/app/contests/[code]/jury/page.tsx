import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerContest, getServerMe, getServerJuryStats } from "@/lib/server-api";
import JuryHubClient from "./JuryHubClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const contest = await getServerContest(code);

  if (!contest) {
    return {
      title: "Jury Hub — Feather",
      description: "Jury statistics and review progress for Wikimedia article contests.",
    };
  }

  return {
    title: `${contest.name} — Jury Hub — Feather`,
    description: `Jury statistics, review workload, and progress monitoring for ${contest.name}.`,
    openGraph: {
      title: `${contest.name} — Jury Hub`,
      description: `Monitor judging progress and review queues for ${contest.name}.`,
    },
  };
}

export default async function JuryStatsPage({ params }: PageProps) {
  const { code } = await params;

  // Concurrently fetch contest metadata and user session on the server
  const [contest, user] = await Promise.all([
    getServerContest(code),
    getServerMe(),
  ]);

  // Check if authorized to prefetch stats on the server
  const isJuryOrOwner = Boolean(
    user?.is_authenticated &&
      (user.role === "owner" ||
        user.role === "jury" ||
        user.is_owner ||
        user.is_admin ||
        (contest?.juries && user.wiki_username && contest.juries.includes(user.wiki_username)))
  );

  let initialStats = null;
  if (isJuryOrOwner) {
    initialStats = await getServerJuryStats(code);
  }

  return (
    <JuryHubClient
      code={code}
      initialContest={contest}
      initialUser={user}
      initialStats={initialStats}
    />
  );
}
