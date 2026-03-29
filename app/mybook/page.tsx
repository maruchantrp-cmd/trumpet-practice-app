"use client";

import { useState } from "react";

type ThemeInput = {
  name: string;
  exerciseCount: number;
};

export default function MyBookPage() {
  const [bookName, setBookName] = useState("");
  const [author, setAuthor] = useState("");
  const [themes, setThemes] = useState<ThemeInput[]>([]);

  const addTheme = () => {
    setThemes([...themes, { name: "", exerciseCount: 1 }]);
  };

  const updateTheme = (index: number, field: keyof ThemeInput, value: any) => {
    const newThemes = [...themes];
    newThemes[index] = { ...newThemes[index], [field]: value };
    setThemes(newThemes);
  };

  const removeTheme = (index: number) => {
    const newThemes = themes.filter((_, i) => i !== index);
    setThemes(newThemes);
  };

  const handleSubmit = async () => {
    if (!bookName) {
      alert("Book名は必須です");
      return;
    }

    const res = await fetch("/api/books", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: bookName,
        author,
        themes,
      }),
    });

    if (res.ok) {
      alert("保存しました！");
      setBookName("");
      setAuthor("");
      setThemes([]);
    } else {
      alert("エラーが発生しました");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>My Book 登録</h1>

      <div>
        <label>Book名（必須）</label>
        <br />
        <input
          value={bookName}
          onChange={(e) => setBookName(e.target.value)}
        />
      </div>

      <div>
        <label>著者名（任意）</label>
        <br />
        <input value={author} onChange={(e) => setAuthor(e.target.value)} />
      </div>

      <hr />

      <h2>テーマ</h2>

      {themes.map((theme, index) => (
        <div key={index} style={{ marginBottom: 12 }}>
          <input
            placeholder="テーマ名"
            value={theme.name}
            onChange={(e) =>
              updateTheme(index, "name", e.target.value)
            }
          />
          <input
            type="number"
            placeholder="エクササイズ数"
            value={theme.exerciseCount}
            onChange={(e) =>
              updateTheme(index, "exerciseCount", Number(e.target.value))
            }
            style={{ marginLeft: 8 }}
          />
          <button onClick={() => removeTheme(index)}>削除</button>
        </div>
      ))}

      <button onClick={addTheme}>＋ テーマ追加</button>

      <hr />

      <button onClick={handleSubmit}>保存</button>
    </div>
  );
}