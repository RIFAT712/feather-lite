import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ContestStatisticsRedirect({ params }: PageProps) {
  const { code } = await params;
  redirect(`/contests/${code}/stats`);
}
