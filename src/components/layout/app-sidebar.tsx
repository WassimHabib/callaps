"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  LayoutDashboard,
  Bot,
  Megaphone,
  BarChart3,
  Phone,
  Plug,
  Settings,
  Users,
  Building2,
  ChevronRight,
  Contact2,
  PhoneCall,
  CalendarCheck,
  Receipt,
  Lightbulb,
} from "lucide-react";

const clientLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents IA", icon: Bot },
  { href: "/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/phone-numbers", label: "Numéros de téléphone", icon: Phone },
  { href: "/contacts", label: "Contacts", icon: Contact2 },
  { href: "/calls", label: "Historique appels", icon: PhoneCall },
  { href: "/appointments", label: "Rendez-vous", icon: CalendarCheck },
  { href: "/statistics", label: "Statistiques", icon: BarChart3 },
  { href: "/insights", label: "Insights IA", icon: Lightbulb },
  { href: "/billing", label: "Facturation", icon: Receipt },
  { href: "/integrations", label: "Intégrations", icon: Plug },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organisations", icon: Building2 },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/agents", label: "Agents IA", icon: Bot },
  { href: "/admin/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/admin/billing", label: "Facturation", icon: Receipt },
  { href: "/admin/statistics", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

interface AppSidebarProps {
  role: "admin" | "client";
  showOrgSwitcher?: boolean;
}

export function AppSidebar({ role, showOrgSwitcher }: AppSidebarProps) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : clientLinks;

  return (
    <aside className="flex h-screen w-[260px] flex-col bg-[#0f172a]">
      {/* Logo */}
      <div className="flex h-[130px] shrink-0 items-center justify-center px-1">
        <Image
          src="/logo.png"
          alt="Callaps"
          width={250}
          height={110}
          className="h-28 w-auto object-contain"
          priority
        />
      </div>

      {/* Organization Switcher — only visible for super_admin */}
      {showOrgSwitcher && (
        <div className="px-3 pb-2 [&_.cl-organizationSwitcherTrigger]:!text-white [&_.cl-organizationSwitcherTrigger]:!bg-slate-700/60 [&_.cl-organizationSwitcherTrigger]:!border-slate-600/50 [&_.cl-organizationSwitcherTrigger]:!border [&_.cl-organizationSwitcherTrigger]:rounded-xl [&_button]:!text-white [&_span]:!text-white [&_p]:!text-white [&_svg]:!text-slate-400">
          <OrganizationSwitcher
            hidePersonal
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full rounded-xl bg-slate-700/60 border border-slate-600/50 px-3 py-2.5 text-sm text-white hover:bg-slate-600/60",
                organizationSwitcherPopoverActionButton__createOrganization: "hidden",
                organizationPreview: "text-white",
                organizationSwitcherTriggerIcon: "text-slate-400",
              },
            }}
          />
        </div>
      )}

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
            Callaps Pro
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Appels illimités
          </p>
        </div>
      </div>
    </aside>
  );
}
