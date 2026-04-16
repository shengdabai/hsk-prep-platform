import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HSK Prep Platform",
  description: "HSK 对齐型中文备考网站 MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
