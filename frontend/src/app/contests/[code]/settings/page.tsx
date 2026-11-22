import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerContest, getServerMe } from "@/lib/server-api";
import SettingsClient from "./SettingsClient";

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
      title: "Settings — Feather",
      description: "Manage contest settings and parameters.",
    };
  }

  return {
    title: `${contest.name} — Settings — Feather`,
    description: `Manage contest parameters, validation rules, jury panel, and automation for ${contest.name}.`,
    openGraph: {
      title: `${contest.name} — Settings`,
      description: `Configure rules and judging for ${contest.name}.`,
    },
  };
}

export default async function ContestSettingsPage({ params }: PageProps) {
  const { code } = await params;
  const contest = await getServerContest(code);

  if (!contest) {
    notFound();
  }

  const me = await getServerMe();

  return (
    <SettingsClient
      code={code}
      initialContest={contest}
      initialMe={me}
    />
  );
}
