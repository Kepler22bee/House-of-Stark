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
      {/* Wallet */}
      <div
        style={{
          position: "fixed",
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          background: "rgba(0,0,0,0.85)",
          border: "2px solid #fdd835",
          borderRadius: 12,
          padding: "8px 24px",
          fontFamily: "'Courier New', monospace",
          fontSize: 18,
          fontWeight: "bold",
          color: "#fdd835",
          letterSpacing: 1,
          boxShadow: "0 0 20px rgba(253,216,53,0.3)",
        }}
      >
        {shortAddr}
      </div>
    </div>
  );
}
