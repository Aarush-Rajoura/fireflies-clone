import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      strokeWidth={1.75}
      className={cn("size-4 animate-spin", className)}
    />
  );
}
