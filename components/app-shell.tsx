"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ClientSwitcher } from "@/components/client-switcher";
import type { StepCompletionMap } from "@/lib/onboarding/guards";

interface AppShellProps {
  children: React.ReactNode;
  sidebar: {
    completion: StepCompletionMap;
    completedCount: number;
    totalSteps: number;
    isOnboarding?: boolean;
    userInitial?: string;
  };
  clients: Array<{ id: string; name: string }>;
  selectedClientId: string | null;
}

export function AppShell({ children, sidebar, clients, selectedClientId }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        completion={sidebar.completion}
        completedCount={sidebar.completedCount}
        totalSteps={sidebar.totalSteps}
        isOnboarding={sidebar.isOnboarding}
        userInitial={sidebar.userInitial}
      />
      <SidebarInset>
        <div className="flex h-screen flex-1 flex-col overflow-auto bg-transparent min-h-full">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card/90 backdrop-blur-sm px-6">
            <ClientSwitcher clients={clients} selectedClientId={selectedClientId} />
          </header>
          <div className="flex-1 min-h-full bg-gradient-to-b from-background via-background to-black/50 dark:to-black/70">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
