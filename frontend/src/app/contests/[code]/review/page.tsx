import { Metadata } from "next";
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
  const [contest, user, articles] = await Promise.all([
    getServerContest(code),
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
