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
  Briefcase,
  Mic,
} from "lucide-react";

/**
 * Pastel icon background colors — one per link index (cycles if more links).
 * Keeps every row visually distinct without being loud.
 */
const iconColors = [
  "bg-indigo-50  text-indigo-500",
  "bg-violet-50  text-violet-500",
  "bg-sky-50     text-sky-500",
  "bg-emerald-50 text-emerald-500",
  "bg-amber-50   text-amber-500",
  "bg-rose-50    text-rose-500",
  "bg-teal-50    text-teal-500",
  "bg-fuchsia-50 text-fuchsia-500",
  "bg-cyan-50    text-cyan-500",
  "bg-orange-50  text-orange-500",
  "bg-lime-50    text-lime-600",
  "bg-pink-50    text-pink-500",
  "bg-blue-50    text-blue-500",
];

const clientLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agents IA", icon: Bot },
  { href: "/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/phone-numbers", label: "Numéros de téléphone", icon: Phone },
  { href: "/contacts", label: "Contacts", icon: Contact2 },
  { href: "/calls", label: "Historique appels", icon: PhoneCall },
  { href: "/voices", label: "Voix clonées", icon: Mic },
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
  isAdmin?: boolean;
}

export function AppSidebar({ role, showOrgSwitcher, isAdmin }: AppSidebarProps) {
  const pathname = usePathname();
  const links = role === "admin" ? adminLinks : clientLinks;

  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-slate-200 bg-white">
      {/* Logo */}
      <div className="flex h-[130px] shrink-0 items-center justify-center px-1">
        <Image
          src="/logo-dark.png"
          alt="Callaps"
          width={250}
          height={110}
          className="h-28 w-auto object-contain"
          priority
        />
      </div>

      {/* Organization Switcher — only visible for super_admin */}
      {showOrgSwitcher && (
        <div className="px-3 pb-2 [&_.cl-organizationSwitcherTrigger]:!text-slate-700 [&_.cl-organizationSwitcherTrigger]:!bg-slate-50 [&_.cl-organizationSwitcherTrigger]:!border-slate-200 [&_.cl-organizationSwitcherTrigger]:!border [&_.cl-organizationSwitcherTrigger]:rounded-xl [&_button]:!text-slate-700 [&_span]:!text-slate-700 [&_p]:!text-slate-700 [&_svg]:!text-slate-400">
          <OrganizationSwitcher
            hidePersonal
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger:
                  "w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100",
                organizationSwitcherPopoverActionButton__createOrganization: "hidden",
                organizationPreview: "text-slate-700",
                organizationSwitcherTriggerIcon: "text-slate-400",
              },
            }}
          />
        </div>
      )}

      {/* Admin Portal Link */}
      {isAdmin && (
        <Link
          href="/admin-portal"
          className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-[13px] font-medium text-indigo-600 transition-colors hover:bg-indigo-100/60"
        >
          <Briefcase className="h-4 w-4 text-indigo-500" />
          Portail Admin
        </Link>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pt-2">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Menu
        </p>
        {links.map((link, index) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" &&
              link.href !== "/dashboard" &&
              pathname.startsWith(link.href + "/"));
          const colorClass = iconColors[index % iconColors.length];
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
                    isActive
                      ? "bg-indigo-100 text-indigo-600"
                      : colorClass
                  )}
                >
                  <Icon className="h-4 w-4" />
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
      <div className="border-t border-slate-100 p-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[11px] font-medium text-slate-600">
            Callaps Pro
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Appels illimités
          </p>
        </div>
      </div>
    </aside>
  );
}
