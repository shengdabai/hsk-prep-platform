import type { HTMLAttributes, ReactNode } from "react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.8rem] border border-stone-900/10 bg-white/75 p-5",
        className,
      )}
      {...props}
    />
  );
}

export function Pill({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-stone-900/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-stone-500",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: HTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={cn(
        "rounded-full px-5 py-3 text-sm font-medium transition",
        variant === "primary"
          ? "bg-[#9f3215] text-[#fff3df] hover:bg-[#84240f]"
          : "border border-stone-900/10 text-stone-800 hover:border-stone-900/30",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
