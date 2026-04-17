import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Resu-Dog — AI Resume Optimizer",
    template: "%s | Resu-Dog",
  },
  description:
    "Optimize your resume with AI. Get an ATS compatibility score, rewritten experience, and a matching cover letter in seconds.",
  keywords: ["resume optimizer", "ATS", "cover letter", "job application", "AI resume"],
  metadataBase: new URL("https://resume-dog.vercel.app"),
  openGraph: {
    title: "Resu-Dog — AI Resume Optimizer",
    description:
      "Optimize your resume with AI. Get an ATS compatibility score, rewritten experience, and a matching cover letter in seconds.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resu-Dog — AI Resume Optimizer",
    description:
      "Optimize your resume with AI. Get an ATS compatibility score, rewritten experience, and a matching cover letter in seconds.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
