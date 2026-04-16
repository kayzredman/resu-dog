import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Professional Profile — Resu-Dog",
  description:
    "View this candidate's professional profile — skills, experience, education, and more. Powered by Resu-Dog AI.",
  openGraph: {
    title: "Professional Profile — Resu-Dog",
    description:
      "View this candidate's professional profile — skills, experience, education, and more.",
    type: "profile",
    siteName: "Resu-Dog",
  },
  twitter: {
    card: "summary",
    title: "Professional Profile — Resu-Dog",
    description:
      "View this candidate's professional profile — skills, experience, education, and more.",
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
