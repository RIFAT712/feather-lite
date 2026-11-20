import { Metadata } from "next";
import { getServerContest, getServerContestUserProfile } from "@/lib/server-api";
import ContestUserProfileClient from "./ContestUserProfileClient";

interface PageProps {
  params: Promise<{ code: string; username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code, username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const contest = await getServerContest(code);

  const contestName = contest?.name || code;

  return {
    title: `${decodedUsername} — ${contestName} — Feather`,
    description: `Submissions, review activity, and contributions by ${decodedUsername} in ${contestName}.`,
    openGraph: {
      title: `${decodedUsername} — ${contestName}`,
      description: `Contributions by ${decodedUsername} in ${contestName}.`,
    },
  };
}

export default async function ContestUserProfilePage({ params }: PageProps) {
  const { code, username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const profile = await getServerContestUserProfile(code, decodedUsername);

  return (
    <ContestUserProfileClient
      code={code}
      username={decodedUsername}
      initialProfile={profile}
    />
  );
}
