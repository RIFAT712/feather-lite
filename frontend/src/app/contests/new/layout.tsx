import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Contest",
  description: "Set up and launch a new Wikimedia article contest, edit-a-thon, or multi-wiki writing campaign with custom jury evaluation rules.",
  openGraph: {
    title: "Create Contest | Feather",
    description: "Launch a new Wikipedia edit-a-thon or article competition with custom scoring and jury workflows.",
  },
};

export default function CreateContestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
