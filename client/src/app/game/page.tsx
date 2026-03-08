"use client";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("../../game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
      <p style={{ color: "#fdd835", fontFamily: "'Courier New', monospace", fontSize: "18px" }}>
        Loading world...
      </p>
    </div>
  ),
});

export default function GamePage() {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0a0a" }}>
      <GameCanvas />
    </div>
  );
}
