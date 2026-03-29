"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Log = {
  created_at: string;
  tempo: number;
  success: boolean;
};

export default function PlayPage() {
  const params = useSearchParams();
  const router = useRouter();
  const exerciseId = params.get("exerciseId");

  const [tempo, setTempo] = useState<number | "">("");
  const [targetTempo, setTargetTempo] = useState<number | "">("");
  const [logs, setLogs] = useState<Log[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [showNextAction, setShowNextAction] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初期ロード
  useEffect(() => {
    if (!exerciseId) return;

    // モーダルリセット
    setShowConfirm(false);
    setShowNextAction(false);
    setShowSetupModal(false);

    fetch(`/api/play?exerciseId=${exerciseId}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);

        if (data.maxTempo) {
          setTempo(data.maxTempo);
        } else if (data.startTempo) {
          setTempo(data.startTempo);
        } else {
          setTempo(""); // ← 空欄
        }

        if (data.targetTempo) {
          setTargetTempo(data.targetTempo);
        } else {
          setTargetTempo("");
        }

        // 未設定ならモーダル
        if (!data.startTempo || !data.targetTempo) {
          setTempo("");
          setTargetTempo("");
          setShowSetupModal(true);
        }
      });
  }, [exerciseId]);

  // 音準備
  useEffect(() => {
    audioRef.current = new Audio("/click.mp3");
  }, []);

  // メトロノーム開始
  const startMetronome = () => {
    if (isPlaying || tempo === "") return;

    const interval = (60 / Number(tempo)) * 1000;

    intervalRef.current = setInterval(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    }, interval);

    setIsPlaying(true);
  };

  // 停止
  const stopMetronome = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
  };

  const handleEnd = () => {
    stopMetronome();
    setShowConfirm(true);
  };

  // 成功
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

  // 失敗
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

  // 次へ
  const goNext = async () => {
    const res = await fetch(`/api/next-exercise?exerciseId=${exerciseId}`);
    const data = await res.json();

    setShowNextAction(false);

    if (data.nextId) {
      router.push(`/play?exerciseId=${data.nextId}`);
    } else {
      router.push("/exercises");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>Play</h1>

      {/* テンポ表示 */}
      <div style={{ marginBottom: 16 }}>
        <h2>{tempo === "" ? "--" : tempo} BPM</h2>

        <input
          type="number"
          placeholder="例: 60"
          value={tempo}
          onChange={(e) =>
            setTempo(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      </div>

      {/* ボタン */}
      <div>
        <button onClick={startMetronome} disabled={isPlaying || tempo === ""}>
          Start
        </button>

        <button onClick={handleEnd} style={{ marginLeft: 8 }}>
          End
        </button>
      </div>

      {/* 履歴 */}
      <div style={{ marginTop: 24 }}>
        <h3>履歴</h3>

        <table border={1} cellPadding={6}>
          <thead>
            <tr>
              <th>日付</th>
              <th>BPM</th>
              <th>結果</th>
            </tr>
          </thead>

          <tbody>
            {logs.map((log, i) => (
              <tr key={i}>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.tempo}</td>
                <td>{log.success ? "成功" : "失敗"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== 判定モーダル ===== */}
      {showConfirm && (
        <Modal>
          <p>
            テンポだけでなく発音、アーティキュレーション、音程も正確でしたか？
            <br />
            問題なければ完了にしましょう！
          </p>

          <div style={{ marginTop: 16 }}>
            <button onClick={handleComplete}>完了</button>

            <button onClick={handleFail} style={{ marginLeft: 8 }}>
              キャンセル
            </button>
          </div>
        </Modal>
      )}

      {/* ===== 次アクションモーダル ===== */}
      {showNextAction && (
        <Modal>
          <h3>次はどうする？</h3>

          <div style={{ marginTop: 16 }}>
            <button onClick={() => router.push("/exercises")}>
              中止
            </button>

            <button
              onClick={() => setShowNextAction(false)}
              style={{ marginLeft: 8 }}
            >
              再チャレンジ
            </button>

            <button onClick={goNext} style={{ marginLeft: 8 }}>
              次のエクササイズ
            </button>
          </div>
        </Modal>
      )}

      {/* ===== 初期設定モーダル ===== */}
      {showSetupModal && (
        <Modal>
          <h2>テンポ設定</h2>

          <div>
            <label>開始テンポ</label>
            <input
              type="number"
              placeholder="例: 60"
              value={tempo}
              onChange={(e) =>
                setTempo(e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>

          <div style={{ marginTop: 8 }}>
            <label>目標テンポ</label>
            <input
              type="number"
              placeholder="例: 120"
              value={targetTempo}
              onChange={(e) =>
                setTargetTempo(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
            />
          </div>

          <button
            style={{ marginTop: 12 }}
            onClick={async () => {
              if (tempo === "" || targetTempo === "") {
                alert("テンポを入力してください");
                return;
              }

              await fetch("/api/exercise-settings", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  exerciseId,
                  startTempo: Number(tempo),
                  targetTempo: Number(targetTempo),
                }),
              });

              setShowSetupModal(false);
            }}
          >
            保存して開始
          </button>
        </Modal>
      )}
    </div>
  );
}

/* ===== モーダル ===== */
function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>{children}</div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle: React.CSSProperties = {
  background: "#fff",
  padding: 24,
  borderRadius: 10,
  width: 320,
};