import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  House,
  Receipt,
  ScrollText,
  Settings,
  Shield,
  UserCog,
  Users,
  Zap,
} from "lucide-react";

import type { Role } from "@/lib/api/types";

export type NavGroup = "Main" | "Management" | "Administration";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
  /** If set, only these roles see the item. Undefined = all authenticated users. */
  roles?: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", icon: House, group: "Main", roles: ["admin"] },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, group: "Main", roles: ["super_admin"] },

  { href: "/buildings", label: "Buildings", icon: Building2, group: "Management" },
  { href: "/tenants", label: "Tenants", icon: Users, group: "Management" },
  { href: "/contracts", label: "Contracts", icon: FileText, group: "Management" },
  { href: "/invoices", label: "Invoices", icon: Receipt, group: "Management" },
  { href: "/payments", label: "Payments", icon: CreditCard, group: "Management" },
  { href: "/utilities", label: "Utilities", icon: Zap, group: "Management" },
  { href: "/reports", label: "Reports", icon: ScrollText, group: "Management" },

  { href: "/audit", label: "Audit trail", icon: Shield, group: "Administration", roles: ["super_admin"] },
  { href: "/settings", label: "Settings", icon: Settings, group: "Administration", roles: ["super_admin"] },
  { href: "/users", label: "Users", icon: UserCog, group: "Administration", roles: ["super_admin"] },
];

const GROUP_ORDER: NavGroup[] = ["Main", "Management", "Administration"];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

export function navGroupsForRole(
  role: Role,
): { label: NavGroup; items: NavItem[] }[] {
  return GROUP_ORDER.map((label) => ({
    label,
    items: NAV_ITEMS.filter(
      (i) => i.group === label && (!i.roles || i.roles.includes(role)),
    ),
  })).filter((g) => g.items.length > 0);
}
