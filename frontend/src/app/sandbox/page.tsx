import { getServerContests, getServerPlatformOverview } from "@/lib/server-api";
import SandboxHomeClient from "./SandboxHomeClient";
import { MOCK_CONTESTS, MOCK_OVERVIEW } from "./_lib/mock-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SandboxHomePage() {
  const [liveContests, liveOverview] = await Promise.all([
    getServerContests().catch(() => null),
    getServerPlatformOverview().catch(() => null),
  ]);

  const initialContests = liveContests && liveContests.length > 0 ? liveContests : MOCK_CONTESTS;
  const initialOverview = liveOverview || MOCK_OVERVIEW;

  return (
    <SandboxHomeClient
      initialContests={initialContests}
      initialOverview={initialOverview}
    />
  );
}
