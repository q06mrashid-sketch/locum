import "./globals.css";
import type { ReactNode } from "react";
import Link from "next/link";

export const metadata = {
  title: "Locum Portal",
  description: "Consolidated locum shift offers"
};

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/import", label: "WhatsApp Import" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" }
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">Locum Portal</h1>
              <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                Admin mode
              </span>
            </div>
            <nav className="flex gap-2 flex-wrap">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
