import { Metadata } from "next";
import { getServerContests } from "@/lib/server-api";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Feather — Wikimedia Contest Platform",
  description: "High-throughput Wiki Article Contest Management and Judging Platform for Wikimedia projects.",
};

export default async function HomePage() {
  const contests = await getServerContests();
  return <HomeClient initialContests={contests} />;
}
