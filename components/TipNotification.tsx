"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "Search by part of your engine number — you don't need to type it exactly.",
  "Orders under ₦400,000 with everything in stock check out instantly, no waiting for a quote.",
  "Choose pickup at checkout to skip the delivery fee entirely.",
  "Save your address in your account so you don't have to retype it at checkout.",
  "Click the ? next to the engine number filter if you're not sure where to find your plate.",
];

const FIRST_SHOW_DELAY_MS = 8_000; // give the page a moment before the first tip
const REPEAT_INTERVAL_MS = 90_000; // then resurface a new tip every ~90s
const AUTO_HIDE_MS = 9_000; // each tip hides itself if not dismissed

export default function TipNotification() {
  const [visible, setVisible] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  function showNextTip() {
    setTipIndex((prev) => {
      if (TIPS.length <= 1) return prev;
      let next = Math.floor(Math.random() * TIPS.length);
      while (next === prev) next = Math.floor(Math.random() * TIPS.length);
      return next;
    });
    setVisible(true);
  }

  useEffect(() => {
    const firstTimer = setTimeout(showNextTip, FIRST_SHOW_DELAY_MS);
    const interval = setInterval(showNextTip, REPEAT_INTERVAL_MS);
    return () => {
      clearTimeout(firstTimer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(hideTimer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 right-4 z-50 max-w-xs rounded-lg border border-slate-200 bg-white p-4 shadow-lg tip-toast"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-lg">💡</span>
        <p className="flex-1 text-sm text-slate-700">{TIPS[tipIndex]}</p>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss tip"
          className="shrink-0 text-slate-400 hover:text-slate-700"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
