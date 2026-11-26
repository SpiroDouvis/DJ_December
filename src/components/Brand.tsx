import Image from "next/image";
import { cn } from "@/lib/utils";

/** The hand-drawn DJ December logo. `large` is for the login and not-invited screens.
 * In the header it is 3x bigger on desktop than on phones. */
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <Image
      src="/dj-logo.png"
      width={2318}
      height={459}
      alt="DJ December"
      priority
      sizes={large ? "(max-width: 448px) 90vw, 400px" : "(min-width: 768px) 528px, 176px"}
      className={cn("h-auto rounded-md", large ? "w-full max-w-sm" : "w-36 sm:w-44 md:w-[33rem]")}
    />
  );
}
