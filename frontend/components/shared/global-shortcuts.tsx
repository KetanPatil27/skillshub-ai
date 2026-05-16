"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const SEARCH_INPUT_ID = "global-search-input";

export function GlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;
      if (e.key.toLowerCase() !== "k") return;

      // If the user is typing in any input/textarea/contenteditable, let the
      // browser default apply (except when the active element IS the search
      // input — then we still re-select for a quick clear+type).
      const active = document.activeElement;
      const inEditable =
        active instanceof HTMLElement &&
        (active.tagName === "TEXTAREA" ||
          (active.tagName === "INPUT" && active.id !== SEARCH_INPUT_ID) ||
          active.isContentEditable);
      if (inEditable) return;

      e.preventDefault();

      if (pathname.startsWith("/search")) {
        const el = document.getElementById(SEARCH_INPUT_ID);
        if (el instanceof HTMLInputElement) {
          el.focus();
          el.select();
        }
      } else {
        router.push("/search");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router]);

  return null;
}
