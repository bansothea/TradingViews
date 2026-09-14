import { cn } from "@/lib/cn";

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-border-subtle", className)} />;
}
