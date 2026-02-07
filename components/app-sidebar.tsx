"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Check,
  LayoutDashboard,
  Target,
  ClipboardList,
  Building2,
  Users,
  Mail,
  Plug,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStepKey } from "@/lib/onboarding/steps";
import {
  SIDEBAR_GROUPS,
  STEP_KEY_TO_PATH,
  STEP_DISPLAY_LABELS,
} from "@/lib/onboarding/steps";
import type { StepCompletionMap } from "@/lib/onboarding/guards";
import { isStepUnlocked } from "@/lib/onboarding/guards";

const DASHBOARD_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/icp", label: "ICP Builder", icon: Target },
  { href: "/jobs", label: "Lead Jobs", icon: ClipboardList },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
];

function pathToStepKey(pathname: string): OnboardingStepKey | null {
  const normalized = pathname.replace(/\/$/, "") || "/onboarding";
  return (STEP_KEY_TO_PATH as Record<string, OnboardingStepKey>)[normalized] ?? null;
}

export interface AppSidebarProps {
  completion: StepCompletionMap;
  completedCount: number;
  totalSteps: number;
  isOnboarding?: boolean;
  userInitial?: string;
}

export function AppSidebar({
  completion,
  completedCount,
  totalSteps,
  isOnboarding: isOnboardingProp,
  userInitial,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isOnboarding = isOnboardingProp ?? pathname.startsWith("/onboarding");
  const showDashboardNav = !isOnboarding;
  const currentStepKey = pathToStepKey(pathname);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "business-assessment": true,
    icp: true,
    offer: false,
    "cold-emails": true,
    complete: true,
  });

  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const toggle = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  return (
    <Sidebar collapsible="none" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={false} size="lg" className="rounded-lg data-[active=false]:bg-transparent data-[active=false]:hover:bg-sidebar-accent/50">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-foreground border border-sidebar-border">
                  PF
                </div>
                <span>Pipeline Formula</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {isOnboarding && (
          <div className="mt-3 px-2">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        {showDashboardNav ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {DASHBOARD_LINKS.map(({ href, label, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={href} className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {SIDEBAR_GROUPS.map((group) => {
              const isExpanded = expanded[group.id] ?? false;
              const hasNested = group.steps.length > 1;
              const firstStepPath = STEP_KEY_TO_PATH[group.steps[0]];
              const isActiveGroup =
                group.steps.some((k) => pathToStepKey(pathname) === k) ||
                (group.steps.length === 1 && pathname === firstStepPath);

              return (
                <SidebarGroup key={group.id}>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {hasNested ? (
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            className="cursor-pointer"
                          >
                            <button
                              type="button"
                              onClick={() => toggle(group.id)}
                              className="flex w-full items-center justify-between gap-2 rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring focus-visible:ring-2"
                            >
                              <span>{group.label}</span>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                            </button>
                          </SidebarMenuButton>
                          {isExpanded && (
                            <SidebarMenuSub>
                              {group.steps.map((stepKey) => {
                                const path = STEP_KEY_TO_PATH[stepKey];
                                const unlocked = isStepUnlocked(
                                  stepKey,
                                  completion
                                );
                                const completed = completion[stepKey];
                                const active = currentStepKey === stepKey;
                                const displayLabel =
                                  STEP_DISPLAY_LABELS[stepKey];

                                if (!unlocked) {
                                  return (
                                    <SidebarMenuSubItem key={stepKey}>
                                      <span className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
                                        <Lock className="h-3.5 w-3.5 shrink-0" />
                                        {displayLabel}
                                      </span>
                                    </SidebarMenuSubItem>
                                  );
                                }

                                return (
                                  <SidebarMenuSubItem key={stepKey}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={active}
                                      className={cn(
                                        completed && !active && "text-muted-foreground"
                                      )}
                                    >
                                      <Link
                                        href={path}
                                        className="flex items-center gap-2"
                                      >
                                        {completed && !active ? (
                                          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                                        ) : null}
                                        {!completed && !active ? (
                                          <span className="w-3.5" />
                                        ) : null}
                                        <span>{displayLabel}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          )}
                        </SidebarMenuItem>
                      ) : (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild isActive={isActiveGroup}>
                            <Link
                              href={firstStepPath}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>{group.label}</span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="cursor-pointer"
            >
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  router.push("/login");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2"
              >
                <Avatar className="h-8 w-8 rounded-full border border-sidebar-border">
                  <AvatarFallback className="rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                    {(userInitial ?? "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-left text-sm">Sign out</span>
                <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
