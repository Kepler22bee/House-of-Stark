"use client";
import dynamic from "next/dynamic";
import { BURNER_ADDRESS } from "../../dojo/config";

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
  const shortAddr = `${BURNER_ADDRESS.slice(0, 6)}...${BURNER_ADDRESS.slice(-4)}`;

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#0a0a0a" }}>
      <GameCanvas />
      {/* Burner account indicator */}
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 13,
            color: "#4caf50",
            border: "1px solid #4caf5044",
            background: "#4caf5011",
            padding: "6px 12px",
            borderRadius: 8,
          }}
        >
          {shortAddr}
        </span>
        <span
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 10,
            color: "#fdd835",
            opacity: 0.6,
          }}
        >
          BURNER
        </span>
      </div>
    </div>
  );
}
