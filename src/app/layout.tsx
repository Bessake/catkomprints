import type { Metadata } from "next";
import { IBM_Plex_Sans, Outfit } from "next/font/google";
import "./globals.css";

const display = Outfit({
  variable: "--font-display-loaded",
  subsets: ["latin"],
});

const body = IBM_Plex_Sans({
  variable: "--font-body-loaded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl =
  process.env.AUTH_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Catkom Prints",
    template: "%s · Catkom Prints",
  },
  description:
    "Print Your Style — stock, invoices, and front-desk messaging for Catkom Prints.",
  applicationName: "Catkom Prints",
  icons: {
    icon: [{ url: "/icon.png" }, { url: "/favicon-32.png", sizes: "32x32" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Catkom Prints",
    description:
      "Print Your Style — stock, invoices, and front-desk messaging for Catkom Prints.",
    siteName: "Catkom Prints",
    images: [
      {
        url: "/og-image.png",
        width: 512,
        height: 512,
        alt: "Catkom Prints logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Catkom Prints",
    description:
      "Print Your Style — stock, invoices, and front-desk messaging for Catkom Prints.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={
          {
            "--font-display": "var(--font-display-loaded), 'Segoe UI', sans-serif",
            "--font-body": "var(--font-body-loaded), 'Segoe UI', sans-serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
