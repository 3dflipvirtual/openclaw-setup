import { ReactNode } from "react";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="glass-card w-full max-w-lg rounded-3xl p-8">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
