import type { Role } from "@prisma/client";
import {
  Award, BarChart3, Bell, Building2, ClipboardList, FolderKanban, HandHeart, History, LayoutDashboard, ListChecks, Map, Megaphone,
  MessageCircle, PlusCircle, Settings, ShieldAlert, Tags, UserCog, Users, type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "@/i18n/translate";

export interface NavItem {
  href: string;
  label: TranslationKey;
  icon: LucideIcon;
  badge?: "notifications" | "messages";
  exact?: boolean;
}

export interface NavSection {
  title?: TranslationKey;
  items: NavItem[];
}

const explore: NavSection = {
  title: "nav.explore",
  items: [
    { href: "/map", label: "nav.map", icon: Map },
    { href: "/campaigns", label: "nav.campaigns", icon: Megaphone },
    { href: "/organizations", label: "nav.organizations", icon: Building2 },
    { href: "/impact", label: "nav.impact", icon: BarChart3 },
  ],
};

const account: NavSection = {
  items: [
    { href: "/dashboard/messages", label: "nav.messages", icon: MessageCircle, badge: "messages" },
    { href: "/dashboard/notifications", label: "nav.notifications", icon: Bell, badge: "notifications" },
    { href: "/dashboard/settings", label: "nav.settings", icon: Settings },
  ],
};

export function navForRole(role: Role): NavSection[] {
  switch (role) {
    case "VOLUNTEER":
      return [
        {
          items: [
            { href: "/dashboard/volunteer", label: "nav.volunteer", icon: HandHeart, exact: true },
            { href: "/dashboard/volunteer/tasks", label: "nav.tasks", icon: ListChecks },
            { href: "/dashboard/achievements", label: "nav.achievements", icon: Award },
            { href: "/dashboard/history", label: "nav.history", icon: History },
            { href: "/dashboard/volunteer/profile", label: "nav.volunteerProfile", icon: UserCog },
          ],
        },
        account,
        explore,
      ];
    case "ORGANIZATION":
      return [
        {
          items: [
            { href: "/dashboard/organization", label: "nav.organization", icon: Building2, exact: true },
            { href: "/dashboard/requests", label: "nav.requests", icon: ClipboardList },
            { href: "/dashboard/requests/create", label: "nav.createRequest", icon: PlusCircle },
            { href: "/dashboard/history", label: "nav.history", icon: History },
          ],
        },
        account,
        explore,
      ];
    case "ADMIN":
      return [
        {
          title: "nav.admin",
          items: [
            { href: "/admin", label: "nav.dashboard", icon: LayoutDashboard, exact: true },
            { href: "/admin/users", label: "nav.adminUsers", icon: Users },
            { href: "/admin/requests", label: "nav.adminRequests", icon: FolderKanban },
            { href: "/admin/organizations", label: "nav.adminOrganizations", icon: Building2 },
            { href: "/admin/reports", label: "nav.adminReports", icon: ShieldAlert },
            { href: "/admin/analytics", label: "nav.adminAnalytics", icon: BarChart3 },
            { href: "/admin/categories", label: "nav.adminCategories", icon: Tags },
          ],
        },
        account,
        explore,
      ];
    default:
      return [
        {
          items: [
            { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard, exact: true },
            { href: "/dashboard/requests", label: "nav.requests", icon: ClipboardList, exact: true },
            { href: "/dashboard/requests/create", label: "nav.createRequest", icon: PlusCircle },
            { href: "/dashboard/history", label: "nav.history", icon: History },
          ],
        },
        account,
        explore,
      ];
  }
}

/** Primary destinations shown in the mobile bottom bar. `primary` renders as the raised centre action. */
export function bottomNavForRole(role: Role): (NavItem & { primary?: boolean })[] {
  switch (role) {
    case "VOLUNTEER":
      return [
        { href: "/dashboard/volunteer", label: "nav.volunteer", icon: HandHeart, exact: true },
        { href: "/dashboard/volunteer/tasks", label: "nav.tasks", icon: ListChecks },
        { href: "/map", label: "nav.map", icon: Map, primary: true },
        { href: "/dashboard/messages", label: "nav.messages", icon: MessageCircle, badge: "messages" },
        { href: "/dashboard/achievements", label: "nav.achievements", icon: Award },
      ];
    case "ORGANIZATION":
      return [
        { href: "/dashboard/organization", label: "nav.organization", icon: Building2, exact: true },
        { href: "/dashboard/requests", label: "nav.requests", icon: ClipboardList, exact: true },
        { href: "/dashboard/requests/create", label: "nav.createRequest", icon: PlusCircle, primary: true },
        { href: "/dashboard/messages", label: "nav.messages", icon: MessageCircle, badge: "messages" },
        { href: "/dashboard/notifications", label: "nav.notifications", icon: Bell, badge: "notifications" },
      ];
    case "ADMIN":
      return [
        { href: "/admin", label: "nav.dashboard", icon: LayoutDashboard, exact: true },
        { href: "/admin/requests", label: "nav.adminRequests", icon: FolderKanban },
        { href: "/admin/reports", label: "nav.adminReports", icon: ShieldAlert, primary: true },
        { href: "/admin/users", label: "nav.adminUsers", icon: Users },
        { href: "/dashboard/notifications", label: "nav.notifications", icon: Bell, badge: "notifications" },
      ];
    default:
      return [
        { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard, exact: true },
        { href: "/dashboard/requests", label: "nav.requests", icon: ClipboardList, exact: true },
        { href: "/dashboard/requests/create", label: "nav.createRequest", icon: PlusCircle, primary: true },
        { href: "/dashboard/messages", label: "nav.messages", icon: MessageCircle, badge: "messages" },
        { href: "/dashboard/notifications", label: "nav.notifications", icon: Bell, badge: "notifications" },
      ];
  }
}
