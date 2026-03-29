"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Exercise = {
  id: string;
  index: number;
  name: string;
  bestTempo: number;
  startTempo?: number;
  targetTempo?: number;
  percent: number;
  isCleared: boolean;
};

export default function ExercisesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const themeId = params.get("themeId");

  const [data, setData] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] =
    useState<Exercise | null>(null);

  const [startTempo, setStartTempo] = useState("");
  const [targetTempo, setTargetTempo] = useState("");

  useEffect(() => {
    if (!themeId) return;

    fetch(`/api/exercises?themeId=${themeId}`)
      .then((res) => res.json())
      .then(setData);
  }, [themeId]);

  // クリック時
  const handleClick = (ex: Exercise) => {
    // 既に設定済みならそのまま遷移
    if (ex.startTempo && ex.targetTempo) {
      router.push(`/play?exerciseId=${ex.id}`);
      return;
    }

    // 未設定ならモーダル表示
    setSelectedExercise(ex);
  };

  // 保存して遷移
  const handleSave = async () => {
    if (!selectedExercise) return;

    if (!startTempo || !targetTempo) {
      alert("テンポを入力してください");
      return;
    }

    await fetch("/api/exercise-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        exerciseId: selectedExercise.id,
        startTempo: Number(startTempo),
        targetTempo: Number(targetTempo),
      }),
    });

    router.push(`/play?exerciseId=${selectedExercise.id}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>エクササイズ一覧</h1>

      {data.map((ex) => (
        <div
          key={ex.id}
          onClick={() => handleClick(ex)}
          style={{
            border: "1px solid #ccc",
            borderRadius: 10,
            padding: 16,
            marginBottom: 12,
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {/* チェック + タイトル */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <span
              style={{
                fontSize: 20,
                marginRight: 8,
                color: ex.isCleared ? "green" : "#ccc",
              }}
            >
              ✔
            </span>

            <strong>
              No.{ex.index} {ex.name || ""}
            </strong>
          </div>

          {/* テンポ情報 */}
          <div style={{ marginTop: 8 }}>
            {ex.targetTempo ? (
              <>
                <ProgressBar percent={ex.percent} />
                <p style={{ marginTop: 4 }}>
                  {ex.bestTempo} / {ex.targetTempo}
                </p>
              </>
            ) : (
              <p style={{ color: "#888" }}>目標未設定</p>
            )}
          </div>
        </div>
      ))}

      {/* ===== モーダル ===== */}
      {selectedExercise && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2>テンポ設定</h2>

            <p>No.{selectedExercise.index}</p>

            <div style={{ marginTop: 8 }}>
              <label>開始テンポ</label>
              <br />
              <input
                type="number"
                value={startTempo}
                onChange={(e) => setStartTempo(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 8 }}>
              <label>目標テンポ</label>
              <br />
              <input
                type="number"
                value={targetTempo}
                onChange={(e) => setTargetTempo(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <button onClick={handleSave}>保存して開始</button>
              <button
                onClick={() => setSelectedExercise(null)}
                style={{ marginLeft: 8 }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== プログレスバー ===== */
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={{ background: "#eee", height: 10 }}>
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: "green",
        }}
      />
    </div>
  );
}

/* ===== モーダルスタイル ===== */
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
  width: 300,
};