import { Metadata } from "next";
import { getServerContests, getServerPlatformOverview } from "@/lib/server-api";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Feather — Wikimedia Contest Platform",
  description: "High-throughput Wiki Article Contest Management and Judging Platform for Wikimedia projects.",
};

export default async function HomePage() {
  const [contests, overview] = await Promise.all([
    getServerContests(),
    getServerPlatformOverview(),
  ]);

  return <HomeClient initialContests={contests} initialOverview={overview} />;
}
