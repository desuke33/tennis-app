"use client";

import { useEffect } from "react";

// ドロップゾーン外にファイルを落とした際、Chromeがそのファイルを
// タブ内に直接開いてしまう(PDF等)のを防ぐためのグローバルなガード。
export function GlobalDropGuard() {
  useEffect(() => {
    const preventDefault = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
    };
  }, []);

  return null;
}
