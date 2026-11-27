import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerContest, getServerMe } from "@/lib/server-api";
import ContestChatClient from "./ContestChatClient";

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
      title: "Community Chat — Feather",
      description: "Live community chat and discussion on Feather.",
    };
  }

  return {
    title: `Community Chat — ${contest.name} — Feather`,
    description: `Live community chat and discussion lounge for ${contest.name}.`,
    openGraph: {
      title: `Community Chat — ${contest.name}`,
      description: `Live community chat and discussion lounge for ${contest.name}.`,
    },
  };
}

export default async function ContestChatPage({ params }: PageProps) {
  const { code } = await params;
  const contest = await getServerContest(code);

  if (!contest) {
    notFound();
  }

  const me = await getServerMe();

  return (
    <ContestChatClient
      code={code}
      initialContest={contest}
      initialUser={me}
    />
  );
}
