"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Log = {
  created_at: string;
  tempo: number;
  success: boolean;
};

export default function PlayInner() {
  const params = useSearchParams();
  const router = useRouter();

  const exerciseId = params.get("exerciseId");
  const themeId = params.get("themeId");

  const [tempo, setTempo] = useState<number>(120);
  const [tempoInput, setTempoInput] = useState<string>("120");
  const tempoRef = useRef<number>(120);

  const [logs, setLogs] = useState<Log[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showNextAction, setShowNextAction] = useState(false);

  // 🎧 AudioContext
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 次の拍
  const nextNoteTimeRef = useRef<number>(0);

  // ループ管理
  const rafRef = useRef<number | null>(null);

  const scheduleAheadTime = 0.2;

  useEffect(() => {
    tempoRef.current = tempo;
  }, [tempo]);

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

  // 🔓 iOSアンロック専用（最重要）
  const unlockAudio = (ctx: AudioContext) => {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  };

  // 🎵 クリック音（最小構成・iOS最適）
  const playClick = (time: number) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "square";
    osc.frequency.value = 1200;

    // iOS安定用エンベロープ
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(1.0, time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);

    osc.start(time);
    osc.stop(time + 0.06);
  };

  // 🎯 スケジューラ（AudioContext時間のみ）
  const scheduler = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const secondsPerBeat = 60 / tempoRef.current;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      playClick(nextNoteTimeRef.current);
      nextNoteTimeRef.current += secondsPerBeat;
    }

    rafRef.current = requestAnimationFrame(scheduler);
  };

  // ▶ Start（最重要）
  const startMetronome = async () => {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContextClass();
    }

    const ctx = audioCtxRef.current;

    // ★ iOSでは必ずユーザー操作内
    await ctx.resume();

    // 🚨 状態チェック（保険）
    if (ctx.state !== "running") {
      console.log("AudioContext not running:", ctx.state);
      return;
    }

    // 🔥 最重要：アンロック音（これがないとiOSは黙る）
    unlockAudio(ctx);

    // 少し先から開始
    nextNoteTimeRef.current = ctx.currentTime + 0.1;

    setIsPlaying(true);

    rafRef.current = requestAnimationFrame(scheduler);
  };

  // ⏸ Stop
  const stopMetronome = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    setIsPlaying(false);
  };

  // ■ End
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

  return (
    <div style={{ padding: 24, maxWidth: 500, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button onClick={goExercises} style={backButton}>
          ← 戻る
        </button>
        <h1>Play (Final Audio Engine)</h1>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 36 }}>{tempo} BPM</h2>

        <input
          type="text"
          inputMode="numeric"
          value={tempoInput}
          onChange={(e) => {
            const v = e.target.value;
            setTempoInput(v);

            if (v === "") {
              setTempo(0);
              tempoRef.current = 0;
              return;
            }

            const num = Number(v);
            if (!isNaN(num)) {
              setTempo(num);
              tempoRef.current = num;
            }
          }}
          style={input}
        />
      </div>

      {/* controls */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={startMetronome}
          disabled={isPlaying}
          style={{ ...mainButton, background: "#22c55e" }}
        >
          ▶ Start
        </button>

        <button
          onClick={stopMetronome}
          disabled={!isPlaying}
          style={{ ...mainButton, background: "#f59e0b" }}
        >
          ⏸ Stop
        </button>

        <button onClick={handleEnd} style={dangerButton}>
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

      {/* modal 1 */}
      {showConfirm && (
        <Modal>
          <h3 style={{ textAlign: "center" }}>うまくできた？</h3>

          <button
            onClick={handleComplete}
            style={{ ...bigButton, background: "#22c55e" }}
          >
            👍 OK
          </button>

          <button
            onClick={handleFail}
            style={{ ...bigButton, background: "#ef4444" }}
          >
            👎 NG
          </button>
        </Modal>
      )}

      {/* modal 2 */}
      {showNextAction && (
        <Modal>
          <h3 style={{ textAlign: "center" }}>次どうする？</h3>

          <button onClick={goExercises} style={subButton}>
            終了
          </button>

          <button
            onClick={() => setShowNextAction(false)}
            style={{ ...bigButton, background: "#3b82f6" }}
          >
            🔁 もう一度
          </button>

          <button
            onClick={goNext}
            style={{ ...bigButton, background: "#22c55e" }}
          >
            ▶ 次へ
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ===== UI ===== */

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={overlay}>
      <div style={modal}>{children}</div>
    </div>
  );
}

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

const mainButton: React.CSSProperties = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  color: "#fff",
  border: "none",
};

const dangerButton: React.CSSProperties = {
  flex: 1,
  padding: 12,
  borderRadius: 10,
  background: "#ef4444",
  color: "#fff",
  border: "none",
};

const bigButton: React.CSSProperties = {
  width: "100%",
  padding: 14,
  borderRadius: 10,
  color: "#fff",
  border: "none",
  fontSize: 16,
};

const subButton: React.CSSProperties = {
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