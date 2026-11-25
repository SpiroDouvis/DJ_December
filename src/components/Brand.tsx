import { Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2 font-bold tracking-tight", large ? "text-3xl" : "text-lg")}>
      <span
        className={cn(
          "grid place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_0_24px_-4px_var(--primary)]",
          large ? "size-12" : "size-8",
        )}
      >
        <Disc3 className={cn("animate-[spin_6s_linear_infinite] motion-reduce:animate-none", large ? "size-7" : "size-5")} />
      </span>
      <span className="text-gradient">DJ December</span>
    </span>
  );
}
