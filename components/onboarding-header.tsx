import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface OnboardingHeaderProps {
  items: BreadcrumbItemType[];
  showExit?: boolean;
}

export function OnboardingHeader({ items, showExit = true }: OnboardingHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
      <Breadcrumb>
        <BreadcrumbList className="text-muted-foreground">
          {items.map((item, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && (
                <BreadcrumbSeparator>
                  <span className="text-muted-foreground">&gt;</span>
                </BreadcrumbSeparator>
              )}
              <BreadcrumbItem>
                {item.href ? (
                  <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      {showExit && (
        <Button asChild variant="destructive">
          <Link href="/dashboard">Exit Onboarding</Link>
        </Button>
      )}
    </header>
  );
}
