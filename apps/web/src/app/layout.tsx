import type { Metadata } from "next";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
