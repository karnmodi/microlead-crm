import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "microlead-crm",
  description: "Team-scoped CRM for lean sales teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-white dark:bg-zinc-950">
      <body className="min-h-screen antialiased text-zinc-900 dark:text-zinc-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
