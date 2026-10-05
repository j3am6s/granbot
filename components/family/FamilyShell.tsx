import type { ReactNode } from "react";
import Link from "next/link";

export function FamilyShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-[#f3f6f4] px-4 pb-16 text-[#1c1915]">
      <header className="flex items-baseline justify-between py-5">
        <p className="text-2xl font-semibold">家族の画面</p>
        <button
          type="button"
          className="text-sm underline"
          onClick={() => {
            void fetch("/api/family/logout", { method: "POST" }).then(() => {
              window.location.href = "/family/login";
            });
          }}
        >
          ログアウト
        </button>
      </header>
      <nav className="mb-6 grid grid-cols-3 gap-2 text-center text-sm">
        <Link className="rounded-2xl bg-white px-2 py-3" href="/family">お知らせ</Link>
        <Link className="rounded-2xl bg-white px-2 py-3" href="/family/settings">設定</Link>
        <Link className="rounded-2xl bg-white px-2 py-3" href="/family/evidence">根拠</Link>
      </nav>
      {children}
    </div>
  );
}
