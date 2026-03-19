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
  Settings,
  Users,
  Building2,
  ChevronRight,
  Contact2,
  Receipt,
  Briefcase,
  Sparkles,
} from "lucide-react";

/* ── Link groups with per-item icon colors ── */

const clientMainLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "bg-indigo-500" },
  { href: "/agents", label: "Agents IA", icon: Bot, color: "bg-violet-500" },
  { href: "/campaigns", label: "Campagnes", icon: Megaphone, color: "bg-indigo-400" },
  { href: "/phone-numbers", label: "Numéros", icon: Phone, color: "bg-violet-400" },
  { href: "/contacts", label: "Contacts", icon: Contact2, color: "bg-indigo-600" },
];

const clientSecondaryLinks = [
  { href: "/statistics", label: "Statistiques", icon: BarChart3, color: "bg-indigo-400" },
  { href: "/billing", label: "Facturation", icon: Receipt, color: "bg-violet-500" },
  { href: "/settings", label: "Paramètres", icon: Settings, color: "bg-slate-500" },
];

const adminMainLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, color: "bg-indigo-500" },
  { href: "/admin/organizations", label: "Organisations", icon: Building2, color: "bg-violet-500" },
  { href: "/admin/clients", label: "Clients", icon: Users, color: "bg-indigo-400" },
  { href: "/admin/agents", label: "Agents IA", icon: Bot, color: "bg-violet-400" },
];

const adminSecondaryLinks = [
  { href: "/admin/campaigns", label: "Campagnes", icon: Megaphone, color: "bg-indigo-600" },
  { href: "/admin/billing", label: "Facturation", icon: Receipt, color: "bg-violet-500" },
  { href: "/admin/statistics", label: "Statistiques", icon: BarChart3, color: "bg-indigo-400" },
  { href: "/admin/settings", label: "Paramètres", icon: Settings, color: "bg-slate-500" },
];

interface AppSidebarProps {
  role: "admin" | "client";
  showOrgSwitcher?: boolean;
  isAdmin?: boolean;
}

function NavGroup({
  label,
  links,
  pathname,
}: {
  label: string;
  links: { href: string; label: string; icon: React.ElementType; color: string }[];
  pathname: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
      <p className="mb-1 px-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="space-y-0.5">
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
                "group flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150",
                    isActive
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30"
                      : `${link.color} text-white shadow-sm`
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className={cn(isActive && "font-semibold")}>{link.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-indigo-400" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppSidebar({ role, showOrgSwitcher, isAdmin }: AppSidebarProps) {
  const pathname = usePathname();

  const mainLinks = role === "admin" ? adminMainLinks : clientMainLinks;
  const secondaryLinks = role === "admin" ? adminSecondaryLinks : clientSecondaryLinks;

  return (
    <aside className="flex h-screen w-[260px] flex-col bg-slate-50/80">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
        {/* Logo card */}
        <div className="flex items-center justify-center rounded-2xl bg-white border border-slate-100 p-5 shadow-sm">
          <Image
            src="/logoV2.png"
            alt="Callaps"
            width={220}
            height={90}
            className="h-16 w-auto object-contain"
            priority
          />
        </div>

        {/* Organization Switcher */}
        {showOrgSwitcher && (
          <div className="rounded-2xl border border-slate-100 bg-white p-2 shadow-sm [&_.cl-organizationSwitcherTrigger]:!text-slate-700 [&_.cl-organizationSwitcherTrigger]:!bg-slate-50 [&_.cl-organizationSwitcherTrigger]:!border-slate-200 [&_.cl-organizationSwitcherTrigger]:!border [&_.cl-organizationSwitcherTrigger]:rounded-xl [&_button]:!text-slate-700 [&_span]:!text-slate-700 [&_p]:!text-slate-700 [&_svg]:!text-slate-400">
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
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
            className="flex items-center gap-2.5 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-4 py-3 text-[13px] font-semibold text-indigo-600 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-sm">
              <Briefcase className="h-3.5 w-3.5" />
            </div>
            Portail Admin
          </Link>
        )}

        {/* Main navigation card */}
        <NavGroup label="Principal" links={mainLinks} pathname={pathname} />

        {/* Secondary navigation card */}
        <NavGroup label="Outils" links={secondaryLinks} pathname={pathname} />

        {/* Footer card */}
        <div className="mt-auto rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-500 to-violet-500 p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">
                Callaps Pro
              </p>
              <p className="text-[10px] text-white/70">
                Appels illimités
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
