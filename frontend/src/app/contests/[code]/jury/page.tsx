import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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
  const contest = await getServerContest(code);

  if (!contest) {
    notFound();
  }

  // Multi-communal umbrella campaigns do not have a centralized jury hub.
  if (contest.is_umbrella) {
    redirect(`/contests/${code}`);
  }

  const user = await getServerMe();

  // Check if authorized to prefetch stats on the server
  const isJuryOrOwner = Boolean(
    user?.is_authenticated &&
      (user.role === "owner" ||
        user.role === "jury" ||
        user.role === "admin" ||
        user.is_owner ||
        user.is_admin ||
        (contest?.created_by_id && user.user_id && contest.created_by_id === user.user_id) ||
        (contest?.created_by_username &&
          user.wiki_username &&
          contest.created_by_username.trim().toLowerCase() === user.wiki_username.trim().toLowerCase()) ||
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
