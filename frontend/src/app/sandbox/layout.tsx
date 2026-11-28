import type { Metadata } from "next";
import SandboxNavbar from "./_components/SandboxNavbar";
import SandboxFooter from "./_components/SandboxFooter";

export const metadata: Metadata = {
  title: "Sandbox UI Preview",
  description: "Clean & minimal UI preview environment for Feather.",
};

export default function SandboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SandboxNavbar />
      <main className="flex-1">{children}</main>
      <SandboxFooter />
    </div>
  );
}
