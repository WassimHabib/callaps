"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  Megaphone,
  BarChart3,
  Plug,
  Settings,
  Users,
  ChevronRight,
} from "lucide-react";

const clientLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents IA", icon: Bot },
  { href: "/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/statistics", label: "Statistiques", icon: BarChart3 },
  { href: "/integrations", label: "Intégrations", icon: Plug },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/agents", label: "Agents IA", icon: Bot },
  { href: "/admin/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/admin/statistics", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

interface AppSidebarProps {
  role: "admin" | "client";
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : clientLinks;

  return (
    <aside className="flex h-screen w-[260px] flex-col bg-[#0f172a]">
      {/* Logo */}
      <div className="flex h-[72px] items-center gap-3 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/20">
          <Bot className="h-[18px] w-[18px] text-white" />
        </div>
        <div>
          <span className="text-[15px] font-bold tracking-tight text-white">
            Wevlap
          </span>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
            {role === "admin" ? "Admin" : "Platform"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Menu
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" &&
              link.href !== "/dashboard" &&
              pathname.startsWith(link.href + "/"));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-white shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/25"
                      : "bg-slate-800/50 group-hover:bg-slate-700/50"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-white" : "text-slate-400 group-hover:text-slate-300"
                    )}
                  />
                </div>
                {link.label}
              </div>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-3">
          <p className="text-[11px] font-medium text-slate-300">
            Wevlap Pro
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Appels illimités
          </p>
        </div>
      </div>
    </aside>
  );
}
