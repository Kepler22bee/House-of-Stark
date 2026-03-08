"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useConnect, useDisconnect, useProvider } from "@starknet-react/core";
import { RpcProvider } from "starknet";
import {
  approveBet,
  placeBet,
  getTokenIdFromReceipt,
  flipCoin,
  settleBet,
  readGameResult,
  GameResult,
} from "../dojo/contracts";

interface CoinTossOverlayProps {
  onClose: () => void;
}

type Step =
  | { id: "idle" }
  | { id: "approving" }
  | { id: "betting" }
  | { id: "waiting_token" }
  | { id: "flipping" }
  | { id: "settling" }
  | { id: "done"; result: GameResult }
  | { id: "error"; message: string };

const STEP_LABELS: Partial<Record<Step["id"], string>> = {
  approving: "Approving spend...",
  betting: "Placing bet...",
  waiting_token: "Confirming bet...",
  flipping: "Flipping (VRF)...",
  settling: "Settling bet...",
};

export default function CoinTossOverlay({ onClose }: CoinTossOverlayProps) {
  const { account, address, status } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { provider } = useProvider();

  const [choice, setChoice] = useState<number | null>(null);
  const [step, setStep] = useState<Step>({ id: "idle" });
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "e" || e.key === "E") {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  const handleFlip = useCallback(async () => {
    if (!account || choice === null) return;

    try {
      // Step 1: Approve ERC20
      setStep({ id: "approving" });
      const approveTx = await approveBet(account);

      // Wait for approve to land
      await (provider as RpcProvider).waitForTransaction(approveTx.transaction_hash, {
        retryInterval: 1000,
      });

      // Step 2: Place bet
      setStep({ id: "betting" });
      const betTx = await placeBet(account, choice);

      // Step 3: Extract token_id from receipt
      setStep({ id: "waiting_token" });
      const tokenId = await getTokenIdFromReceipt(
        provider as RpcProvider,
        betTx.transaction_hash
      );

      // Step 4: VRF request + flip (multicall)
      setStep({ id: "flipping" });
      const flipTx = await flipCoin(account, tokenId, choice);
      await (provider as RpcProvider).waitForTransaction(flipTx.transaction_hash, {
        retryInterval: 1000,
      });

      // Step 5: Settle
      setStep({ id: "settling" });
      const settleTx = await settleBet(account, tokenId);
      await (provider as RpcProvider).waitForTransaction(settleTx.transaction_hash, {
        retryInterval: 1000,
      });

      // Step 6: Read result
      const result = await readGameResult(provider as RpcProvider, tokenId);
      setStep({ id: "done", result });
    } catch (err: any) {
      const msg = err?.message ?? "Transaction failed";
      setStep({ id: "error", message: msg.slice(0, 160) });
    }
  }, [account, choice, provider]);

  const reset = useCallback(() => {
    setStep({ id: "idle" });
    setChoice(null);
  }, []);

  const isConnected = status === "connected" && !!account;
  const isProcessing = ["approving", "betting", "waiting_token", "flipping", "settling"].includes(step.id);
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  return (
    <div
      ref={overlayRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.8)",
        outline: "none",
      }}
    >
      <div
        style={{
          background: "#0a0a14",
          border: "2px solid #fdd835",
          borderRadius: 12,
          padding: "32px 40px",
          maxWidth: 460,
          width: "90%",
          fontFamily: "'Courier New', monospace",
          color: "#e0e0e0",
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 12,
            right: 16,
            background: "none",
            border: "none",
            color: "#fdd835",
            fontSize: 18,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ✕
        </button>

        {/* Title */}
        <h2 style={{ textAlign: "center", color: "#fdd835", fontSize: 22, margin: "0 0 4px" }}>
          COIN TOSS
        </h2>
        <p style={{ textAlign: "center", color: "#555", fontSize: 12, margin: "0 0 24px" }}>
          0.001 ETH · Double or nothing
        </p>

        {!isConnected ? (
          /* Connect wallet */
          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
              style={btnStyle("#fdd835")}
            >
              CONNECT WALLET
            </button>
          </div>
        ) : (
          <>
            {/* Address */}
            <div style={{ textAlign: "center", fontSize: 11, color: "#555", marginBottom: 20 }}>
              {shortAddr}{" "}
              <button
                onClick={() => disconnect()}
                style={{ background: "none", border: "none", color: "#e94560", cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}
              >
                [disconnect]
              </button>
            </div>

            {/* IDLE: choose + flip */}
            {step.id === "idle" && (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  <button
                    onClick={() => setChoice(0)}
                    style={choiceBtn(choice === 0)}
                  >
                    HEADS
                  </button>
                  <button
                    onClick={() => setChoice(1)}
                    style={choiceBtn(choice === 1)}
                  >
                    TAILS
                  </button>
                </div>
                <button
                  onClick={handleFlip}
                  disabled={choice === null}
                  style={btnStyle(choice !== null ? "#fdd835" : "#333", choice !== null)}
                >
                  FLIP COIN
                </button>
              </>
            )}

            {/* PROCESSING */}
            {isProcessing && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Spinner />
                <p style={{ color: "#fdd835", marginTop: 14, fontSize: 14 }}>
                  {STEP_LABELS[step.id as keyof typeof STEP_LABELS]}
                </p>
                <StepDots current={step.id} />
                <p style={{ color: "#444", fontSize: 11, marginTop: 8 }}>
                  Confirm each prompt in your wallet
                </p>
              </div>
            )}

            {/* DONE */}
            {step.id === "done" && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>
                  {step.result.won ? "🪙" : "💸"}
                </div>
                <p style={{ fontSize: 22, fontWeight: "bold", color: step.result.won ? "#4caf50" : "#e94560", marginBottom: 8 }}>
                  {step.result.won ? "YOU WON!" : "YOU LOST"}
                </p>
                <p style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>
                  You called: <strong style={{ color: "#fdd835" }}>{choice === 0 ? "Heads" : "Tails"}</strong>
                </p>
                <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
                  {step.result.won
                    ? "2x payout sent to your wallet"
                    : "House keeps the bet"}
                </p>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={reset} style={btnStyle("#fdd835")}>
                    PLAY AGAIN
                  </button>
                  <button onClick={onClose} style={btnStyle("#333", true, "#888")}>
                    CLOSE
                  </button>
                </div>
              </div>
            )}

            {/* ERROR */}
            {step.id === "error" && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ color: "#e94560", fontSize: 13, marginBottom: 16 }}>
                  {step.message}
                </p>
                <button onClick={reset} style={btnStyle("#e94560")}>
                  TRY AGAIN
                </button>
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 10, color: "#333", marginTop: 16 }}>
          Press ESC to close
        </p>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function Spinner() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        border: "3px solid #333",
        borderTop: "3px solid #fdd835",
        borderRadius: "50%",
        margin: "0 auto",
        animation: "spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const STEPS_ORDER = ["approving", "betting", "waiting_token", "flipping", "settling"];

function StepDots({ current }: { current: string }) {
  const idx = STEPS_ORDER.indexOf(current);
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
      {STEPS_ORDER.map((s, i) => (
        <div
          key={s}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i < idx ? "#4caf50" : i === idx ? "#fdd835" : "#333",
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

function btnStyle(borderColor: string, enabled = true, color?: string): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    padding: "13px 0",
    fontSize: 15,
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.1em",
    border: `2px solid ${borderColor}`,
    borderRadius: 8,
    background: enabled && borderColor !== "#333" ? `${borderColor}22` : "#111",
    color: color ?? (enabled ? borderColor : "#555"),
    cursor: enabled ? "pointer" : "not-allowed",
    transition: "all 0.2s",
  };
}

function choiceBtn(selected: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: "16px 0",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    border: `2px solid ${selected ? "#fdd835" : "#333"}`,
    borderRadius: 8,
    background: selected ? "rgba(253,216,53,0.12)" : "#111",
    color: selected ? "#fdd835" : "#666",
    cursor: "pointer",
    transition: "all 0.15s",
  };
}
