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
    <div className="flex gap-1 border-b border-slate-100 bg-white px-8">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative px-4 py-3 text-[13px] font-medium transition-colors",
              isActive
                ? "text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {item.label}
            {isActive && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-indigo-500" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
