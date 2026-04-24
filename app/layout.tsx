import type { Metadata } from "next";

import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "VB Tippverseny 2026";

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: "Baráti körös focivb tippjáték Next.js alapon.",
  icons: {
    icon: "/favicon.png?v=4",
    shortcut: "/favicon.png?v=4",
    apple: "/favicon.png?v=4",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
