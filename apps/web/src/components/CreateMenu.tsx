"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

const items = [
  { href: "/app/leads/new", label: "New lead" },
  { href: "/app/companies/new", label: "New company" },
  { href: "/app/contacts/new", label: "New contact" },
  { href: "/app/tasks", label: "New task", hint: "Add on Tasks page" },
] as const;

export function CreateMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="primary"
        size="sm"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        Create
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1 min-w-[12rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              className="block px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
              onClick={() => setOpen(false)}
            >
              {item.label}
              {"hint" in item && item.hint && (
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">{item.hint}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
