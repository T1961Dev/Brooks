import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FormCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function FormCard({ children, className, title }: FormCardProps) {
  return (
    <Card className={cn("rounded-xl", className)}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className={cn(!title && "pt-6")}>{children}</CardContent>
    </Card>
  );
}
