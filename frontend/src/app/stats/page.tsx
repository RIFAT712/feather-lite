import { redirect } from "next/navigation";
import { getServerContests } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GlobalStatsPage() {
  const contests = await getServerContests();
  const activeOrLatest = contests?.find((c) => c.status === "active") || contests?.[0];
  if (activeOrLatest) {
    redirect(`/contests/${encodeURIComponent(activeOrLatest.code)}/stats`);
  }
  redirect("/");
}
