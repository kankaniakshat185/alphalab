import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AlphaLab — Sign in",
  description: "Sign in to AlphaLab factor research platform",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
