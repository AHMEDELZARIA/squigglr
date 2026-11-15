"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Squiggle } from "./Squiggle";
import { useActiveLearner } from "./useActiveLearner";

const LINKS = [
  { href: "/", label: "Children" },
  { href: "/lessons", label: "Lessons" },
  { href: "/settings", label: "Settings" },
  { href: "/records", label: "Records" },
];

export function Header() {
  const pathname = usePathname();
  const { learner } = useActiveLearner();
  // The child's lesson screen has no navigation: the child does not navigate (G.1).
  if (pathname.startsWith("/lesson/")) return null;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-serif text-2xl font-bold text-ink">
          Squigglr
          <Squiggle className="w-10" />
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1 ${
                pathname === l.href ? "bg-lavender font-bold text-brand" : "text-muted hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="ml-auto flex items-center gap-2 text-sm text-muted" title="Switch child">
          <span>{learner ? "Drawing now:" : "No child chosen"}</span>
          {learner && <span className="text-3xl leading-none">{learner.avatar}</span>}
        </Link>
      </div>
    </header>
  );
}
