import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GlobalDropGuard } from "@/components/GlobalDropGuard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "テニス部ファイル管理",
  description: "テニス部内ファイル管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GlobalDropGuard />
        {children}
      </body>
    </html>
  );
}
