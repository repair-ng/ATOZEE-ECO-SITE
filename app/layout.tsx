import type { Metadata } from "next";
import { Oswald, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import TipNotification from "@/components/TipNotification";
import { getCurrentUser } from "@/lib/auth";

const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "AToZEE — Genuine Engine Parts",
  description:
    "Find the right engine part by engine number. Delivery or pickup, quotes for bulk orders.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${oswald.variable} ${inter.variable}`}>
      <body className="flex min-h-screen flex-col">
        <CartProvider>
          <SiteHeader
            user={user ? { firstName: user.firstName, email: user.email } : null}
          />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <TipNotification />
        </CartProvider>
      </body>
    </html>
  );
}
