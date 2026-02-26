"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "./supabase/browser";

type Options = { debounceMs?: number };

export function usePageState<T extends object>(
  pageKey: string,
  initialState: T,
  opts: Options = {}
) {
  const supabase = supabaseBrowser();
  const [state, setState] = useState<T>(initialState);
  const [loaded, setLoaded] = useState(false);

  const debounceMs = opts.debounceMs ?? 600;
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef<string>("");

  // Load once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data, error } = await supabase
        .from("user_page_state")
        .select("state")
        .eq("user_id", auth.user.id)
        .eq("page_key", pageKey)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data?.state) {
        setState({ ...initialState, ...(data.state as T) });
      }
      setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  // Save on change (debounced)
  useEffect(() => {
    if (!loaded) return;

    const payload = JSON.stringify(state);
    if (payload === lastSaved.current) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      await supabase.from("user_page_state").upsert(
        {
          user_id: auth.user.id,
          page_key: pageKey,
          state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,page_key" }
      );

      lastSaved.current = payload;
    }, debounceMs);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [state, loaded, pageKey]);

  return { state, setState, loaded };
}
