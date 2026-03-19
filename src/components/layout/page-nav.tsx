"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface PageNavItem {
  href: string;
  label: string;
}

export function PageNav({ items }: { items: PageNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 border-b border-slate-200 bg-white px-8 pt-2">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative rounded-t-lg px-5 py-2.5 text-sm font-semibold transition-colors",
              isActive
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
          >
            {item.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full bg-indigo-500" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
