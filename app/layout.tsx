import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, Bricolage_Grotesque, Hanken_Grotesk, Montserrat } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

// Teacher / admin / parent keep the original "calm clinical" pairing.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Student-facing screens use a bolder, more energetic pairing. These variables
// are remapped onto --font-display / --font-body inside `.student-skin` (see
// globals.css), so only the student welcome / test / report pick them up.
const studentDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const studentBody = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

// Brand font — used only by the DriveScore logo (mark + wordmark) so the
// identity stays consistent regardless of the surrounding page typography.
const brand = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DriveScore — mock tests that explain why",
  description:
    "Mock tests with a diagnosis engine that explains why marks were lost — not just the score. Student, teacher and parent views.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DriveScore",
  },
  icons: {
    icon: [
      { url: "/icons/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/icons/apple-icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#06140f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${studentDisplay.variable} ${studentBody.variable} ${brand.variable}`}
    >
      <body>
        <SessionProvider>{children}</SessionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
