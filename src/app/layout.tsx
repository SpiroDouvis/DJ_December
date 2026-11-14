import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DJ December",
  description: "A song a day, rated by your friends.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
