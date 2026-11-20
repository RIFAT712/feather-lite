import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getServerContest, getServerMe, getServerContestArticles } from "@/lib/server-api";
import ReviewQueueClient from "./ReviewQueueClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const contest = await getServerContest(code);

  if (!contest) {
    return {
      title: "Review Queue — Feather",
      description: "Evaluate article contest submissions.",
    };
  }

  return {
    title: `${contest.name} — Review Queue — Feather`,
    description: `Evaluate submissions and review entries for ${contest.name}.`,
    openGraph: {
      title: `${contest.name} — Review Queue`,
      description: `Live review console for ${contest.name}.`,
    },
  };
}

export default async function ReviewPage({ params }: PageProps) {
  const { code } = await params;
  const contest = await getServerContest(code);

  if (!contest) {
    notFound();
  }

  // Multi-communal umbrella campaigns do not have a centralized review queue.
  if (contest.is_umbrella) {
    redirect(`/contests/${code}`);
  }

  const [user, articles] = await Promise.all([
    getServerMe(),
    getServerContestArticles(code, 500),
  ]);

  return (
    <ReviewQueueClient
      code={code}
      initialContest={contest}
      initialUser={user}
      initialArticles={articles}
    />
  );
}
