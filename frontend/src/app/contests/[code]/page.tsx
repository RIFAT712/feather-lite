import { Metadata } from "next";
import { getServerContest, getServerMe } from "@/lib/server-api";
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

  return {
    title: `${contest.name} — Feather`,
    description: contest.description || `Wiki article contest ${contest.name} on Feather.`,
    openGraph: {
      title: `${contest.name} — Feather`,
      description: contest.description || `Wiki article contest ${contest.name} on Feather.`,
    },
  };
}

export default async function ContestDashboardPage({ params }: PageProps) {
  const { code } = await params;
  const [contest, me] = await Promise.all([
    getServerContest(code),
    getServerMe(),
  ]);

  return (
    <ContestDashboardClient
      code={code}
      initialContest={contest}
      initialMe={me}
    />
  );
}
