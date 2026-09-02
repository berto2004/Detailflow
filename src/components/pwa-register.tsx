"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw", {
          scope: "/",
        })
        .then(() => {
          console.log("DetailFlow PWA ready");
        })
        .catch((error) => {
          console.error("PWA register error:", error);
        });
    }
  }, []);

  return null;
}