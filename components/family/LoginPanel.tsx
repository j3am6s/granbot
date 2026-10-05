"use client";

import { useState, type FormEvent } from "react";

export function LoginPanel() {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const passwordShort = mode === "register" ? Math.max(0, 10 - password.length) : 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "register") {
      const problems: string[] = [];
      if (!name.trim()) problems.push("名前を入れてください。");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
        problems.push("メールの形を確認してください。例: hanako@example.com");
      }
      if (password.length < 10) problems.push(`パスワードはあと${10 - password.length}文字必要です。`);
      if (problems.length > 0) {
        setError(problems.join(""));
        return;
      }
    }
    const response = await fetch(mode === "login" ? "/api/family/login" : "/api/family/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "確認してください。");
      return;
    }
    window.location.href = "/family";
  }

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[#f3f6f4] px-4 py-10 text-[#1c1915]">
      <h1 className="text-3xl font-semibold">グランボット</h1>
      <p className="mt-2 text-base leading-relaxed">家族が最初に設定します。祖父母のiPadには、この画面は出しません。</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        <button type="button" className="min-h-12 rounded-2xl bg-white" onClick={() => setMode("register")}>初めて使う</button>
        <button type="button" className="min-h-12 rounded-2xl bg-white" onClick={() => setMode("login")}>ログイン</button>
      </div>
      <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
        {mode === "register" ? (
          <label className="grid gap-1">名前
            <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
        ) : null}
        <label className="grid gap-1">メール
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="grid gap-1">パスワード（10文字以上）
          <input className="min-h-12 rounded-2xl border border-[#1c1915] px-3" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {mode === "register" && passwordShort > 0 ? (
            <span className="text-sm text-[#9b2335]">あと{passwordShort}文字</span>
          ) : null}
        </label>
        {error ? <p className="text-[#9b2335]">{error}</p> : null}
        <button className="min-h-12 rounded-2xl bg-[#1c1915] text-white" type="submit">
          {mode === "login" ? "ログイン" : "家族の画面を作る"}
        </button>
      </form>
    </main>
  );
}
