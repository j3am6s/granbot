"use client";

import { useEffect, useRef, useState } from "react";

type Track = { title: string; artist: string; previewUrl: string };

function shuffle(tracks: Track[]) {
  const copy = [...tracks];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export function MusicPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<Track[]>([]);
  const index = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [error, setError] = useState("");
  const playAt = useRef<(nextIndex: number) => void>(() => {});

  function player() {
    audio.current ??= new Audio();
    return audio.current;
  }

  useEffect(() => {
    const element = player();
    playAt.current = (nextIndex: number) => {
      const list = queue.current;
      if (!list.length) return;
      const wrapped = (nextIndex + list.length) % list.length;
      const song = list[wrapped];
      index.current = wrapped;
      setTrack(song);
      element.src = song.previewUrl;
      void element.play().then(() => setPlaying(true)).catch(() => setError("いまは再生できません。"));
    };
    element.onended = () => playAt.current(index.current + 1);
    let stop = false;
    void fetch("/api/kiosk/music")
      .then((response) => response.json())
      .then((data: { tracks?: Track[] }) => {
        if (stop) return;
        const tracks = data.tracks ?? [];
        if (!tracks.length) {
          setError("曲を用意できません。");
          return;
        }
        queue.current = shuffle(tracks);
        playAt.current(0);
      })
      .catch(() => setError("曲を用意できません。"));
    return () => {
      stop = true;
      element.onended = null;
      element.pause();
    };
  }, []);

  return (
    <section className="mt-4 grid gap-4">
      <p className="text-center text-4xl leading-snug">{track?.title ?? "読み込み中です。"}</p>
      <p className="text-center text-2xl">{track?.artist ?? ""}</p>
      {error ? <p className="text-center text-xl">{error}</p> : null}
      <div className="grid grid-cols-3 gap-4">
        <button type="button" className="min-h-24 rounded-3xl border-2 border-[#1c1915] bg-white text-4xl text-[#1c1915]" aria-label="前の曲" onClick={() => playAt.current(index.current - 1)}>&lt;&lt;</button>
        <button type="button" className="min-h-24 rounded-3xl border-2 border-[#1c1915] bg-white text-4xl text-[#1c1915]" aria-label={playing ? "止める" : "再生"} onClick={() => {
          if (!track) return;
          const element = player();
          if (playing) {
            element.pause();
            setPlaying(false);
            return;
          }
          void element.play().then(() => setPlaying(true)).catch(() => setError("いまは再生できません。"));
        }}>{playing ? "II" : ">"}</button>
        <button type="button" className="min-h-24 rounded-3xl border-2 border-[#1c1915] bg-white text-4xl text-[#1c1915]" aria-label="次の曲" onClick={() => playAt.current(index.current + 1)}>&gt;&gt;</button>
      </div>
    </section>
  );
}
