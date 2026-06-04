"use client";

import { useState } from "react";

/** speak: MediaRecorder placeholder */
export function SpeakInput({ submitted }: { submitted: boolean }) {
  const [supported] = useState(() => typeof window !== "undefined" && Boolean(window.MediaRecorder));
  if (!supported) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-4">
        <span className="text-xl">🎙️</span>
        <p className="text-sm text-amber-800">
          当前浏览器不支持录音，请在支持 MediaRecorder 的现代浏览器中作答。
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-4">
      <span className="text-xl">🎙️</span>
      <p className="text-sm text-stone-600">
        {submitted ? "口语录音已提交。" : "口语录音功能即将上线，请直接点击「提交评分」继续。"}
      </p>
    </div>
  );
}
