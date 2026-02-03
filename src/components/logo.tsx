import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-heading text-lg">
      <span className="text-2xl" aria-hidden="true">
        🦞
      </span>
      <span className="font-semibold tracking-tight">OpenClaw Setup</span>
    </Link>
  );
}
