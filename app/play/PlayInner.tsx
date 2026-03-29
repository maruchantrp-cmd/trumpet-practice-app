"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Log = {
  created_at: string;
  tempo: number;
  success: boolean;
};

type CountMode = "single" | "double" | "triple" | "quad";

const multiplierMap: Record<CountMode, number> = {
  single: 1,
  double: 2,
  triple: 3,
  quad: 4,
};

export default function PlayInner() {
  const params = useSearchParams();
  const router = useRouter();

  const exerciseId = params.get("exerciseId");
  const themeId = params.get("themeId");

  // =========================
  // 🎯 tempo state
  // =========================
  const [tempo, setTempo] = useState<number | null>(null);
  const [tempoInput, setTempoInput] = useState<string>("");

  const tempoRef = useRef<number>(120);

  // =========================
  // 🎛 count mode
  // =========================
  const [countMode, setCountMode] = useState<CountMode>("single");
  const countModeRef = useRef<CountMode>("single");

  // =========================
  // logs / UI
  // =========================
  const [logs, setLogs] = useState<Log[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showNextAction, setShowNextAction] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  const scheduleAheadTime = 0.2;

  // =========================
  // sync refs
  // =========================
  useEffect(() => {
    if (tempo !== null) tempoRef.current = tempo;
  }, [tempo]);

  useEffect(() => {
    countModeRef.current = countMode;
  }, [countMode]);

  // =========================
  // fetch init data
  // =========================
  useEffect(() => {
    if (!exerciseId) return;

    fetch(`/api/play?exerciseId=${exerciseId}`)
      .then((res) => res.json())
      .then((data) => {
        const initialTempo = data.maxTempo || data.startTempo || 120;

        setTempo(initialTempo);
        setTempoInput(String(initialTempo));

        tempoRef.current = initialTempo;
        setLogs(data.logs || []);
      });
  }, [exerciseId]);

  // =========================
  // 🎧 iOS unlock
  // =========================
  const unlockAudio = (ctx: AudioContext) => {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(0);
  };

  // =========================
  // 🔊 click sound
  // =========================
  const playClick = (time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.value = 1200;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(1.0, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.06);
  };

  // =========================
  // 🎯 scheduler
  // =========================
  const scheduler = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const multiplier = multiplierMap[countModeRef.current];
    const bpm = (tempoRef.current || 120) * multiplier;

    const secondsPerBeat = 60 / bpm;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      playClick(nextNoteTimeRef.current);
      nextNoteTimeRef.current += secondsPerBeat;
    }

    rafRef.current = requestAnimationFrame(scheduler);
  };

  // =========================
  // ▶ start
  // =========================
  const startMetronome = async () => {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }

    const ctx = audioCtxRef.current;
    await ctx.resume();

    unlockAudio(ctx);

    nextNoteTimeRef.current = ctx.currentTime + 0.1;

    setIsPlaying(true);
    rafRef.current = requestAnimationFrame(scheduler);
  };

  // =========================
  // ⏸ stop
  // =========================
  const stopMetronome = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  };

  // =========================
  // 🎯 BPM確定ボタン（追加部分）
  // =========================
  const confirmTempo = () => {
    const num = Number(tempoInput);
    if (!isNaN(num)) {
      setTempo(num);
      tempoRef.current = num;
    }
  };

  // =========================
  // UI handlers
  // =========================
  const handleEnd = () => {
    stopMetronome();

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    setShowConfirm(true);
  };

  const handleComplete = async () => {
    await fetch("/api/exercise-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId,
        tempo: tempoRef.current,
        success: true,
      }),
    });

    setShowConfirm(false);
    setShowNextAction(true);
  };

  const handleFail = async () => {
    await fetch("/api/exercise-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciseId,
        tempo: tempoRef.current,
        success: false,
      }),
    });

    setShowConfirm(false);
  };

  const goExercises = () => {
    router.push(`/exercises?themeId=${themeId}`);
  };

  const goNext = async () => {
    const res = await fetch(`/api/next-exercise?exerciseId=${exerciseId}`);
    const data = await res.json();

    setShowNextAction(false);

    if (data.nextId) {
      router.push(`/play?exerciseId=${data.nextId}&themeId=${themeId}`);
    } else {
      goExercises();
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <div style={{ padding: 24, maxWidth: 500, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button onClick={goExercises} style={backButton}>
          ← 戻る
        </button>

        <h1>Play Metronome</h1>
      </div>

      <div style={hint}>🔊 iPhoneはサイレントモードも確認</div>

      <div style={card}>
        <h2 style={{ fontSize: 36 }}>
          {tempo === null ? "…" : tempo} BPM
        </h2>

        <input
          type="text"
          inputMode="numeric"
          value={tempoInput}
          onChange={(e) => setTempoInput(e.target.value)}
          style={input}
        />

        {/* 🎯 追加：確定ボタン */}
        <button onClick={confirmTempo} style={confirmBtn}>
          🎯 BPMを確定
        </button>

        {/* 🎛 count mode UI */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>カウント</div>

          {(["single", "double", "triple", "quad"] as CountMode[]).map(
            (mode) => (
              <label key={mode} style={{ marginRight: 12 }}>
                <input
                  type="radio"
                  checked={countMode === mode}
                  onChange={() => setCountMode(mode)}
                />
                {mode}
              </label>
            )
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={startMetronome}
          disabled={isPlaying}
          style={{ ...btn, background: "#22c55e" }}
        >
          ▶ Start
        </button>

        <button
          onClick={stopMetronome}
          disabled={!isPlaying}
          style={{ ...btn, background: "#f59e0b" }}
        >
          ⏸ Stop
        </button>

        <button onClick={handleEnd} style={danger}>
          ■ End
        </button>
      </div>

      {/* logs */}
      <div style={{ marginTop: 24 }}>
        <h3>履歴</h3>
        <table style={table}>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i}>
                <td>{log.tempo} BPM</td>
                <td style={{ color: log.success ? "green" : "red" }}>
                  {log.success ? "OK" : "NG"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showConfirm && (
        <Modal>
          <h3>うまくできた？</h3>
          <button onClick={handleComplete} style={ok}>
            👍 OK
          </button>
          <button onClick={handleFail} style={ng}>
            👎 NG
          </button>
        </Modal>
      )}

      {showNextAction && (
        <Modal>
          <h3>次どうする？</h3>

          <button onClick={goExercises} style={sub}>
            終了
          </button>

          <button onClick={() => setShowNextAction(false)} style={blue}>
            🔁 もう一度
          </button>

          <button onClick={goNext} style={ok}>
            ▶ 次へ
          </button>
        </Modal>
      )}
    </div>
  );
}

/**
 * Modal
 */
function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={overlay}>
      <div style={modal}>{children}</div>
    </div>
  );
}

/**
 * styles
 */
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modal: React.CSSProperties = {
  background: "#fff",
  padding: 24,
  borderRadius: 12,
  width: 280,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const card: React.CSSProperties = {
  background: "#fff",
  padding: 16,
  borderRadius: 12,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 10,
};

const btn: React.CSSProperties = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  color: "#fff",
  border: "none",
};

const danger: React.CSSProperties = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  background: "#ef4444",
  color: "#fff",
  border: "none",
};

const ok: React.CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  background: "#22c55e",
  color: "#fff",
  border: "none",
};

const ng: React.CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  background: "#ef4444",
  color: "#fff",
  border: "none",
};

const blue: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
};

const sub: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
};

const backButton: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
};

const table: React.CSSProperties = {
  width: "100%",
};

const hint: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
  marginBottom: 10,
};

/* =========================
   added style
========================= */
const confirmBtn: React.CSSProperties = {
  marginTop: 10,
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid #333",
  background: "#fff",
};