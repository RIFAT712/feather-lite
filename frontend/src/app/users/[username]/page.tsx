import { Metadata } from "next";
import { getServerUserProfile } from "@/lib/server-api";
import UserGlobalProfileClient from "./UserGlobalProfileClient";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);

  return {
    title: `${decodedUsername} — User Profile — Feather`,
    description: `Global contributions, contest participation, and judging activity for ${decodedUsername} on Feather.`,
    openGraph: {
      title: `${decodedUsername} — User Profile — Feather`,
      description: `Global contest participation and judging activity for ${decodedUsername}.`,
    },
  };
}

export default async function UserGlobalProfilePage({ params }: PageProps) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const profile = await getServerUserProfile(decodedUsername);

  return (
    <UserGlobalProfileClient
      username={decodedUsername}
      initialProfile={profile}
    />
  );
}
