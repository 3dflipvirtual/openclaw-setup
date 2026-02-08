import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="font-heading text-lg font-semibold tracking-tight">
      Open-clawbot<span className="italic">.com</span>
    </Link>
  );
}
