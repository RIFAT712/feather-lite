import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerContest, getServerMe } from "@/lib/server-api";
import SubmitArticlesClient from "./SubmitArticlesClient";

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
      title: "Submit Articles — Feather",
      description: "Submit articles for contest evaluation.",
    };
  }

  return {
    title: `Submit Articles — ${contest.name} — Feather`,
    description: `Submit created or expanded articles for ${contest.name}.`,
    openGraph: {
      title: `Submit Articles — ${contest.name}`,
      description: `Submit created or expanded articles for ${contest.name}.`,
    },
  };
}

export default async function SubmitArticlesPage({ params }: PageProps) {
  const { code } = await params;
  const me = await getServerMe();

  if (!me || !me.is_authenticated) {
    redirect(`/login?returnTo=${encodeURIComponent(`/contests/${code}/submit`)}`);
  }

  const contest = await getServerContest(code);
  if (!contest) {
    notFound();
  }

  return (
    <SubmitArticlesClient
      code={code}
      initialContest={contest}
      initialMe={me}
    />
  );
}
