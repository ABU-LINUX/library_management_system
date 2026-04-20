import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Student Information & Exam Analysis",
  description: "Enterprise portal for IIT-JEE, NEET, and Board Students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
