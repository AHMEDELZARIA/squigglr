"use client";

import Link from "next/link";
import { BookIcon, LockIcon, PlayIcon } from "@/components/icons";
import { Screen } from "@/components/Screen";

// S4 "Grown-ups". Kept apart from the child's screens, with two large
// buttons: start another lesson, or look at the practice records. It is
// reached through the adult check, from "Who's practising?" or the end of a
// lesson.

const CHOICES = [
  { href: "/", title: "Start a lesson", text: "Choose a child and a lesson", Icon: PlayIcon, tint: "bg-lavender" },
  { href: "/records", title: "Practice records", text: "See every lesson and attempt", Icon: BookIcon, tint: "bg-mint" },
];

export default function GrownUps() {
  return (
    <Screen
      title={
        <span className="inline-flex items-center gap-3">
          <LockIcon className="h-8 w-8" />
          Grown-ups
        </span>
      }
      subtitle="What would you like to do?"
    >
      <div className="mx-auto mt-10 max-w-2xl space-y-8">
        {CHOICES.map(({ href, title, text, Icon, tint }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-6 rounded-3xl border-2 border-edge bg-white p-8 hover:bg-lavender"
          >
            <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${tint}`}>
              <Icon className="h-10 w-10" />
            </span>
            <span>
              <span className="block text-3xl font-bold">{title}</span>
              <span className="mt-1 block text-xl text-muted">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </Screen>
  );
}
