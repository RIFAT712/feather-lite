import { getServerContest } from "@/lib/server-api";
import SandboxContestClient from "./SandboxContestClient";
import { MOCK_CONTESTS } from "@/app/sandbox/_lib/mock-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SandboxContestPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const live = await getServerContest(code).catch(() => null);
  const fallback =
    MOCK_CONTESTS.find((c) => c.code === code) || {
      ...MOCK_CONTESTS[0],
      code,
    };

  return <SandboxContestClient code={code} initialContest={live || fallback} />;
}
