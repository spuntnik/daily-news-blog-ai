"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const isAuthed = false; // TODO: replace with Supabase session
    if (!isAuthed) router.replace("/login");
  }, [router]);
  return <>{children}</>;
}
