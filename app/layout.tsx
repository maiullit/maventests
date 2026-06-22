import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Meridian · World Clock",
  description: "Compare time zones across the world",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
