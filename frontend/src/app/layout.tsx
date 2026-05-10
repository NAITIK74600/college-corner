import type { Metadata } from "next";
import { Urbanist, Inter } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { NotificationProvider } from "@/context/NotificationContext";
import "./globals.css";

/* ── Heading font: Urbanist — geometric, energetic ─────────── */
const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

/* ── Body font: Inter — highly legible neo-grotesque ────────── */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/* ── Mono font: Geist Mono ───────────────────────────────────── */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "College Corner — Your Campus Store & Print Hub",
  description:
    "Quick-commerce and smart print SaaS for college students. Order stationery and print your documents — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${urbanist.variable} ${inter.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full">
        <AuthProvider>
          <CartProvider>
            <NotificationProvider>
              <Navbar />
              <main style={{ paddingTop: "68px" }}>{children}</main>
            </NotificationProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
