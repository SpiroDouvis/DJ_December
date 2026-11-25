import Image from "next/image";
import { cn } from "@/lib/utils";

/** The hand-drawn DJ December logo. `large` is for the login and not-invited screens. */
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <Image
      src="/dj-logo.png"
      width={2318}
      height={459}
      alt="DJ December"
      priority
      sizes={large ? "(max-width: 448px) 90vw, 400px" : "200px"}
      className={cn("h-auto rounded-md", large ? "w-full max-w-sm" : "w-36 sm:w-44")}
    />
  );
}
