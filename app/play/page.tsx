"use client";

import { Suspense } from "react";
import PlayInner from "./PlayInner";

export default function PlayPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading...</div>}>
      <PlayInner />
    </Suspense>
  );
}