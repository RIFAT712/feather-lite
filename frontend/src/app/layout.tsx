import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://feather-lite.toolforge.org";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Feather – Wikimedia Article Contest & Judging Platform",
    template: "%s | Feather",
  },
  description:
    "Feather is a high-throughput, modern contest management and judging platform built for Wikipedia, Wiktionary, Wikisource, Wikimedia Commons, and sister wikis. Organize multi-wiki edit-a-thons, track real-time rankings, automate talk-page notifications, and streamline jury evaluations.",
  applicationName: "Feather",
  authors: [
    { name: "Wikimedia Community & Developers", url: "https://meta.wikimedia.org" },
  ],
  generator: "Next.js",
  keywords: [
    "Feather",
    "Feather 2.0",
    "Wikimedia",
    "Wikipedia",
    "Fountain",
    "Wikimedia Fountain",
    "Fountain tool",
    "Article Contest",
    "Edit-a-thon",
    "Writing Competition",
    "Jury Evaluation",
    "Wiki Article Contest",
    "Bengali Wikipedia",
    "MediaWiki",
    "Toolforge",
    "Wikisource",
    "Wiktionary",
    "Commons",
    "Contest Management",
    "Wiki Ranking",
  ],
  referrer: "origin-when-cross-origin",
  creator: "Wikimedia Contributors",
  publisher: "Wikimedia Community",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/?lang=en",
      "bn-BD": "/?lang=bn",
    },
  },
  openGraph: {
    title: "Feather – Wikimedia Article Contest & Judging Platform",
    description:
      "High-throughput contest management and jury review platform for Wikipedia and sister Wikimedia projects. Built for community organizers, juries, and participants.",
    url: siteUrl,
    siteName: "Feather",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Feather – Wikimedia Article Contest & Judging Platform",
      },
    ],
    locale: "en_US",
    alternateLocale: ["bn_BD"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Feather – Wikimedia Article Contest & Judging Platform",
    description:
      "Ultra-fast contest management and jury evaluation platform for Wikipedia and Wikimedia communities.",
    site: "@Wikimedia",
    creator: "@Wikimedia",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  category: "technology",
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

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      name: "Feather",
      alternateName: ["Feather 2.0", "Wikimedia Feather", "Feather Contest Platform"],
      url: siteUrl,
      description:
        "Ultra-fast, modern contest management and judging platform for Wikimedia projects including Wikipedia, Wikisource, and Wiktionary.",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "All",
      browserRequirements: "Requires modern HTML5 compliant web browser",
      inLanguage: ["en", "bn"],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      author: {
        "@type": "Organization",
        name: "Wikimedia Community",
        url: "https://www.wikimedia.org",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Feather",
      description: "Wikimedia Article Contest Management & Judging Platform",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
