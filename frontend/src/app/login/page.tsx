import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerMe } from "@/lib/server-api";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Log in — Feather",
  description: "Log in with your Wikimedia account to Feather.",
};

interface PageProps {
  searchParams: Promise<{ returnTo?: string; redirect?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawReturnTo = params.returnTo || params.redirect || "/";
  // Validate returnTo: ensure it's relative and doesn't point to external protocol
  const returnTo =
    rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") && !rawReturnTo.startsWith("/\\")
      ? rawReturnTo
      : "/";

  const me = await getServerMe();
  if (me && me.is_authenticated) {
    redirect(returnTo);
  }

  return <LoginClient returnTo={returnTo} />;
}
