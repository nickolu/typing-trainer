import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthGuard } from "@/components/auth/AuthGuard";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "CunningType - Master Your Typing Speed",
  description: "Challenge yourself with CunningType, the typing trainer that helps you improve speed, accuracy, and build muscle memory with real-time feedback and detailed stats.",
  icons: {
    icon: "/cunningtype-favicon.ico",
  },
  openGraph: {
    title: "CunningType - Master Your Typing Speed",
    description: "Challenge yourself with CunningType, the typing trainer that helps you improve speed, accuracy, and build muscle memory with real-time feedback and detailed stats.",
    images: [
      {
        url: "/cunningtype-preview.jpg",
        width: 1200,
        height: 630,
        alt: "CunningType Typing Trainer",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CunningType - Master Your Typing Speed",
    description: "Challenge yourself with CunningType, the typing trainer that helps you improve speed, accuracy, and build muscle memory with real-time feedback and detailed stats.",
    images: ["/cunningtype-preview.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
