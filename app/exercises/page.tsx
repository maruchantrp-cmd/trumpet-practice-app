"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Exercise = {
  id: string;
  index: number;
  name: string;
  bestTempo: number;
  startTempo?: number | null;
  targetTempo?: number | null;
  percent: number;
  isCleared: boolean;
};

export default function ExercisesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <ExercisesInner />
    </Suspense>
  );
}

function ExercisesInner() {
  const params = useSearchParams();
  const router = useRouter();

  const themeId = params.get("themeId");
  const bookId = params.get("bookId");

  const [data, setData] = useState<Exercise[]>([]);
  const [selected, setSelected] = useState<Exercise | null>(null);

  const [startTempo, setStartTempo] = useState("");
  const [targetTempo, setTargetTempo] = useState("");

  const [bookName, setBookName] = useState("");
  const [themeName, setThemeName] = useState(""); // 👈 追加

  useEffect(() => {
    if (!themeId) return;

    fetch(`/api/exercises?themeId=${themeId}&bookId=${bookId}`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((res) => {
        setData(res.exercises || res);

        if (res.bookName) setBookName(res.bookName);
        if (res.themeName) setThemeName(res.themeName); // 👈 追加
      });
  }, [themeId, bookId]);

  const goHome = () => {
    router.push("/");
  };

  const handleClick = (ex: Exercise) => {
    if (ex.startTempo && ex.targetTempo) {
      router.push(
        `/play?exerciseId=${ex.id}&themeId=${themeId}&bookId=${bookId}`
      );
    } else {
      setStartTempo("");
      setTargetTempo("");
      setSelected(ex);
    }
  };

  const handleSave = async () => {
    if (!selected) return;

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
        exerciseId: selected.id,
        startTempo: Number(startTempo),
        targetTempo: Number(targetTempo),
      }),
    });

    router.push(
      `/play?exerciseId=${selected.id}&themeId=${themeId}&bookId=${bookId}`
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      {/* ===== ヘッダー ===== */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={homeButton} onClick={goHome}>
            🏠 Home
          </button>
          <h1 style={{ margin: 0 }}>エクササイズ一覧</h1>
        </div>

        {/* 👇 Book + Theme 表示 */}
        {(bookName || themeName) && (
          <div style={{ fontSize: 14, color: "#666" }}>
            📘 {bookName}
            {themeName && ` / 🎵 ${themeName}`}
          </div>
        )}
      </div>

      {/* ===== 一覧 ===== */}
      {data.map((ex) => {
        const percent =
          ex.targetTempo && ex.targetTempo > 0
            ? Math.min(
                100,
                Math.round((ex.bestTempo / ex.targetTempo) * 100)
              )
            : 0;

        return (
          <div key={ex.id} onClick={() => handleClick(ex)} style={card}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  marginRight: 8,
                  color: ex.isCleared ? "#22c55e" : "#ccc",
                  fontSize: 18,
                }}
              >
                ✔
              </span>

              <strong>
                No.{ex.index} {ex.name}
              </strong>
            </div>

            <div style={{ marginTop: 8 }}>
              {ex.targetTempo ? (
                <>
                  <ProgressBar percent={percent} />
                  <p style={{ marginTop: 4 }}>
                    {ex.bestTempo} / {ex.targetTempo}
                  </p>
                </>
              ) : (
                <p style={{ color: "#888" }}>目標未設定</p>
              )}
            </div>
          </div>
        );
      })}

      {/* ===== モーダル ===== */}
      {selected && (
        <div style={overlay}>
          <div style={modal}>
            <h2>テンポ設定</h2>

            <p style={{ marginBottom: 12 }}>
              No.{selected.index} を始める前に設定しましょう
            </p>

            <div style={{ marginBottom: 12 }}>
              <label>開始テンポ</label>
              <input
                type="number"
                placeholder="例: 60"
                value={startTempo}
                onChange={(e) => setStartTempo(e.target.value)}
                style={input}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>目標テンポ</label>
              <input
                type="number"
                placeholder="例: 120"
                value={targetTempo}
                onChange={(e) => setTargetTempo(e.target.value)}
                style={input}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button style={primaryButton} onClick={handleSave}>
                保存して開始
              </button>

              <button
                style={secondaryButton}
                onClick={() => setSelected(null)}
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

/* ===== UI ===== */

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div style={bar}>
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: "#22c55e",
          borderRadius: 6,
        }}
      />
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
  background: "#fff",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
};

const bar: React.CSSProperties = {
  background: "#eee",
  height: 10,
  borderRadius: 6,
};

const homeButton: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};

const overlay: React.CSSProperties = {
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

const modal: React.CSSProperties = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  width: 320,
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginTop: 4,
  borderRadius: 6,
  border: "1px solid #ccc",
};

const primaryButton: React.CSSProperties = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "none",
  background: "#22c55e",
  color: "#fff",
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  cursor: "pointer",
};