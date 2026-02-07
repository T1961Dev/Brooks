import { Loader2, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export type StepState = "pending" | "active" | "completed";

interface AgentStepCardProps {
  title: string;
  description?: string;
  pill: string;
  state: StepState;
  progressPercent?: number;
}

export function AgentStepCard({
  title,
  description,
  pill,
  state,
  progressPercent = 0,
}: AgentStepCardProps) {
  const isCompleted = state === "completed";
  const isActive = state === "active";

  return (
    <Card
      className={cn(
        "rounded-xl transition-colors",
        isCompleted && "border-primary/50 bg-primary/10",
        isActive && "border-border",
        !isCompleted && !isActive && "opacity-80"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center">
            {isCompleted ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Check className="h-5 w-5 text-primary-foreground" />
              </div>
            ) : isActive ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-muted-foreground/50">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Circle className="h-3 w-3 fill-muted-foreground text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                className={cn(
                  "font-semibold",
                  (isCompleted || isActive) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {title}
              </h3>
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0",
                  isCompleted && "bg-primary/20 text-primary border-primary/40"
                )}
              >
                {pill}
              </Badge>
            </div>
            {description && (isActive || isCompleted) && (
              <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            )}
            {isActive && (
              <div className="mt-3 flex items-center gap-3">
                <Progress value={progressPercent} className="h-1.5 flex-1" />
                <span className="text-sm font-medium tabular-nums text-foreground">
                  {progressPercent}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
