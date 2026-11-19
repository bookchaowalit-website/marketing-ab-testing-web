import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// The font variable sits on <html>: the Dashboard shell tokens live on :root and read it from there.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

const DESCRIPTION = "Weight three message variants, simulate visits and read conversion rates. A local bench in your browser, not a deployed experiment.";

export const metadata: Metadata = {
  title: "A/B Testing | Bookchaowalit",
  description: DESCRIPTION,
  authors: [{ name: "Bookchaowalit", url: "https://bookchaowalit.com" }],
  creator: "Bookchaowalit",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: { type: "website", title: "A/B Testing | Bookchaowalit", description: DESCRIPTION, siteName: "Bookchaowalit" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
