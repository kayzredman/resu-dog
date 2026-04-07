"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint, Zap, Menu, X, Wand2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--overlay)] backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-[rgba(108,99,255,0.4)] transition-transform group-hover:scale-110">
              <PawPrint className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              resu<span className="text-primary">-dog</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Toggle */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/build"
              className={cn(
                "flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold transition-all text-foreground-muted hover:text-foreground hover:border-line-hover",
                pathname === "/build" && "border-primary/40 text-primary bg-primary/5"
              )}
            >
              <Wand2 className="h-4 w-4" />
              Build CV
            </Link>
            <Link
              href="/optimize"
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                pathname === "/optimize"
                  ? "bg-primary text-white shadow-lg shadow-[rgba(108,99,255,0.35)]"
                  : "bg-primary text-white hover:bg-primary-dark hover:shadow-lg hover:shadow-[rgba(108,99,255,0.35)]"
              )}
            >
              <Zap className="h-4 w-4" />
              Optimize Resume
            </Link>
          </div>

          {/* Mobile: toggle + burger */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              className="text-foreground-muted hover:text-foreground transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-line py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-sm text-foreground-muted hover:text-foreground transition-colors py-1"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/build"
              onClick={() => setMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold w-full justify-center mt-2 text-foreground-muted hover:text-foreground",
                pathname === "/build" && "border-primary/40 text-primary bg-primary/5"
              )}
            >
              <Wand2 className="h-4 w-4" />
              Build CV
            </Link>
            <Link
              href="/optimize"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white w-full justify-center mt-2"
            >
              <Zap className="h-4 w-4" />
              Optimize Resume
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

