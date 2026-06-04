"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AudioPlayerProps = {
  audioUrl?: string | null;
  context?: string | null;
  /** 0 = unlimited */
  maxPlays?: number;
};

export function AudioPlayer({ audioUrl, context, maxPlays = 0 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canPlay = maxPlays === 0 || playCount < maxPlays;

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      if (!canPlay) return;
      audio.play().catch(() => setError("无法播放音频，请检查浏览器设置。"));
    }
  }, [playing, canPlay]);

  const replay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !canPlay) return;
    audio.currentTime = 0;
    audio.play().catch(() => setError("无法播放音频，请检查浏览器设置。"));
  }, [canPlay]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setPlayCount((c) => c + 1);
    };
    const onError = () => setError("音频加载失败。");
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [audioUrl]);

  if (!audioUrl) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5">
        <div className="flex items-center gap-3 text-stone-500">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-xl">🎧</span>
          <span className="text-sm font-medium">音频生成中，请稍候…</span>
        </div>
        {context ? (
          <div className="border-t border-stone-200 pt-3">
            <div className="text-xs uppercase tracking-widest text-stone-600">原文 / Context</div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">{context}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-900/10 bg-[#f8f4ee] p-5">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!canPlay && !playing}
          aria-label={playing ? "暂停" : "播放"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand)] text-[var(--brand-soft)] shadow-sm disabled:opacity-40"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5l9 5.5-9 5.5V2.5z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={replay}
          disabled={!canPlay}
          aria-label="重播"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-500 disabled:opacity-40"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 7a5 5 0 1 0 1-3" strokeLinecap="round" />
            <path d="M2 2v3h3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex-1 text-sm text-stone-600">
          {maxPlays > 0 ? (
            <span>
              已播放 <strong>{playCount}</strong> / {maxPlays} 次
              {!canPlay ? <span className="ml-2 text-amber-700">（次数已用完）</span> : null}
            </span>
          ) : (
            <span className="text-stone-600 text-xs">点击播放音频</span>
          )}
        </div>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      {context ? (
        <div className="border-t border-stone-200 pt-3">
          <div className="text-xs uppercase tracking-widest text-stone-600">原文 / Context</div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">{context}</p>
        </div>
      ) : null}
    </div>
  );
}
