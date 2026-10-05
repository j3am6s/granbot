import type { ReactNode } from "react";

export default function FamilyLayout({ children }: { children: ReactNode }) {
  return <div className="family-wallpaper min-h-screen bg-[#f3f6f4] text-[#1c1915]">{children}</div>;
}
