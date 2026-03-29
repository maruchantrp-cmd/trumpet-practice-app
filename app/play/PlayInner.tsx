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

  const [tempo, setTempo] = useState<number | "">("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showNextAction, setShowNextAction] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!exerciseId) return;

    fetch(`/api/play?exerciseId=${exerciseId}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTempo(data.maxTempo || data.startTempo || "");
      });
  }, [exerciseId]);

  useEffect(() => {
    audioRef.current = new Audio("/click.mp3");
  }, []);

  const startMetronome = () => {
    if (isPlaying || tempo === "") return;

    const interval = (60 / Number(tempo)) * 1000;

    intervalRef.current = setInterval(() => {
      audioRef.current?.play();
    }, interval);

    setIsPlaying(true);
  };

  const stopMetronome = () => {
    clearInterval(intervalRef.current!);
    setIsPlaying(false);
  };

  const handleEnd = () => {
    stopMetronome();
    setShowConfirm(true);
  };

  const handleComplete = async () => {
    if (tempo === "") return;

    await fetch("/api/exercise-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exerciseId,
        tempo: Number(tempo),
        success: true,
      }),
    });

    setShowConfirm(false);
    setShowNextAction(true);
  };

  const handleFail = async () => {
    if (tempo === "") return;

    await fetch("/api/exercise-logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exerciseId,
        tempo: Number(tempo),
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
      {/* ヘッダー */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <button style={backButton} onClick={goExercises}>
          ← 戻る
        </button>
        <h1>Play</h1>
      </div>

      {/* テンポ */}
      <div style={card}>
        <h2 style={{ fontSize: 36 }}>
          {tempo === "" ? "--" : tempo} BPM
        </h2>

        <input
          type="number"
          value={tempo}
          onChange={(e) =>
            setTempo(e.target.value === "" ? "" : Number(e.target.value))
          }
          style={input}
        />
      </div>

      {/* 操作 */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          onClick={startMetronome}
          disabled={isPlaying || tempo === ""}
          style={{ ...mainButton, background: "#22c55e" }}
        >
          ▶ Start
        </button>

        <button onClick={handleEnd} style={dangerButton}>
          ■ End
        </button>
      </div>

      {/* 履歴 */}
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

      {/* ===== 判定モーダル ===== */}
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

      {/* ===== 次アクション ===== */}
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