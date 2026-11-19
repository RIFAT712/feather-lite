import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Feather 2.0 | Wikimedia Article Contest Platform",
  description: "Ultra-fast, modern contest management & judging platform for Wikimedia projects.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem("feather_lang");
                var rtlLangs = ["ar","arc","bcc","bgn","bqi","ckb","dv","fa","glk","he","khw","ks","mzn","pnb","ps","sd","sdh","ug","ur","yi"];
                if (saved) {
                  document.documentElement.lang = saved;
                  document.documentElement.dir = rtlLangs.indexOf(saved.toLowerCase().split('-')[0]) !== -1 ? "rtl" : "ltr";
                } else {
                  var browserLang = (navigator.language || "").toLowerCase().split('-')[0];
                  if (rtlLangs.indexOf(browserLang) !== -1) {
                    document.documentElement.dir = "rtl";
                    document.documentElement.lang = browserLang;
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
