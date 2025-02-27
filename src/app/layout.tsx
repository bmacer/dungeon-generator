import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const Gnellen = localFont({
  src: [
    {
      path: "../../public/fonts/Gnellen-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Gnellen-Light.otf",
      weight: "300",
      style: "normal",
    },
  ],
  variable: "--font-gnellen",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dungeon Generator",
  description: "Generate random dungeons",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${Gnellen.variable}`}>
      <body
        className={`${Gnellen.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ fontFamily: 'Gnellen, var(--font-geist-sans), var(--font-geist-mono), sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
