"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../utils/supabase/browser";

export default function LoginPage() {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("Signing in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(error.message);
      return;
    }
    
router.replace("/dashboard");
router.refresh();
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Login</h1>

      <form onSubmit={handleLogin} style={{ display: "grid", gap: 12, maxWidth: 400 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Sign In</button>

        <div>{status}</div>
      </form>
    </main>
  );
}
