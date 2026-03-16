"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  Receipt,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin-portal", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin-portal/clients", label: "Mes Clients", icon: Users },
  { href: "/admin-portal/prospects", label: "Prospects", icon: Target },
  { href: "/admin-portal/billing", label: "Facturation", icon: Receipt },
  { href: "/admin-portal/settings", label: "Paramètres", icon: Settings },
];

export function AdminPortalSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
          W
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Wevlap</p>
          <p className="text-[11px] text-slate-400">Portail Admin</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            link.href === "/admin-portal"
              ? pathname === "/admin-portal"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-indigo-500" : "text-slate-400"
                )}
              />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-4">
        <p className="truncate text-xs text-slate-500">{userName}</p>
      </div>
    </aside>
  );
}
