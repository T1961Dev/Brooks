"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface BottomActionsProps {
  backHref: string | null;
  onRerun?: () => void;
  rerunLabel?: string;
  nextHref: string | null;
  nextLabel?: string;
  nextDisabled?: boolean;
  className?: string;
}

export function BottomActions({
  backHref,
  onRerun,
  rerunLabel = "Rerun Agent",
  nextHref,
  nextLabel = "Next",
  nextDisabled = false,
  className,
}: BottomActionsProps) {
  return (
    <>
      <Separator className="mt-auto" />
      <div
        className={cn(
          "sticky bottom-0 flex items-center justify-end gap-3 bg-background/95 px-6 py-4 backdrop-blur",
          className
        )}
      >
        <div className="flex flex-1 items-center gap-4">
          {backHref && (
            <Button asChild variant="ghost">
              <Link href={backHref} className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {onRerun && (
            <Button type="button" variant="outline" onClick={onRerun}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {rerunLabel}
            </Button>
          )}
          {nextHref && (
            <Button asChild disabled={nextDisabled}>
              <Link href={nextHref} className="flex items-center gap-2">
                {nextLabel}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
