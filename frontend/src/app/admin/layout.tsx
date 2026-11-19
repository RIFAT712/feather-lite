import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Administration",
  description: "Feather platform administration and system overview.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
