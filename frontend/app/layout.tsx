import "./globals.css";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "RAG Assistant",
  description: "Ask questions over your uploaded knowledge",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#0b0c0f] text-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
