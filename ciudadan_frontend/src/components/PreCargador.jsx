import React, { useMemo } from "react";

export default function PreCargador({ text }) {
  const letters = text.split("");

  /* =======================
     STYLES + KEYFRAMES
     ======================= */
  const styleTag = `
@keyframes grindTop {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(32deg); }
  50% { transform: rotate(-26deg); }
  75% { transform: rotate(36deg); }
  100% { transform: rotate(0deg); }
}
@keyframes grindBottom {
  0% { transform: scale(.88) rotate(0deg); }
  25% { transform: scale(.88) rotate(-30deg); }
  50% { transform: scale(.88) rotate(24deg); }
  75% { transform: scale(.88) rotate(-34deg); }
  100% { transform: scale(.88) rotate(0deg); }
}
@keyframes sparkle {
  0%,100% { opacity:.2; }
  50% { opacity:.9; }
}
@keyframes letterGlow {
  0% { opacity:.25; }
  50% { opacity:1; color:rgba(114, 199, 103, 0.95); }
  100% { opacity:.25; }
}
@keyframes glowLetter {
  0% { opacity:.25; text-shadow:0 0 4px #39ff14; }
  50% { opacity:1; text-shadow:0 0 8px #39ff14,0 0 16px #39ff14; }
  100% { opacity:.25; text-shadow:0 0 4px #39ff14; }
}
`;

  const styles = {
    wrap: {
      width: "100%",
      marginTop: "4.2%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
    },
    stage: {
      position: "relative",
      width: 240,
      height: 240,
    },
    hexBase: {
      position: "absolute",
      inset: 0,
      clipPath:
        "polygon(50% 0%,85% 15%,100% 50%,85% 85%,50% 100%,15% 85%,0% 50%,15% 15%)",
    },
    hexTop: {
      background:
        "linear-gradient(135deg, rgba(81, 255, 0, 0.35), rgba(180,120,255,.25))",
      border: "2px solid rgba(145, 228, 113, 0.6)0.6)",
      animation: "grindTop 4s ease-in-out infinite",
      zIndex: 3,
    },
    hexBottom: {
      background:
        "linear-gradient(225deg, rgba(180,120,255,.45), rgba(80,0,120,.25))",
      border: "2px solid rgba(180,120,255,.7)",
      transform: "scale(.88)",
      animation: "grindBottom 4s ease-in-out infinite",
      zIndex: 2,
    },
    core: {
      position: "absolute",
      inset: 90,
      borderRadius: "50%",
      background:
        "radial-gradient(circle at 30% 30%, rgba(255,255,255,.08), rgba(0,0,0,.55))",
      boxShadow: "0 0 16px rgba(180,120,255,.45)",
      zIndex: 5,
    },
    particle: {
      position: "absolute",
      width: 3,
      height: 3,
      borderRadius: "50%",
      background: "rgba(226, 152, 226, 0.2)",
      boxShadow: "0 0 6px rgba(214, 194, 240, 0.29)",
      animation: "sparkle 2.2s ease-in-out infinite",
    },
    textRing: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
    },
    letter: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transformOrigin: "0 120px",
      fontFamily: "'Montserrat','Poppins',system-ui,sans-serif",
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: 1.5,
      color: "rgba(255,242,0,.35)",
      textShadow: "0 0 6px rgba(180,120,255,.6)",
      animation: "letterGlow 1.6s ease-in-out infinite",
    },
    loaderText: {
      display: "flex",
      gap: 2,
      fontFamily: "'Orbitron','Poppins',system-ui,sans-serif",
      fontSize: 18,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: "#31582aff",
    },
    loaderLetter: {
      opacity: 0.25,
      animation: "glowLetter 1.6s ease-in-out infinite",
    },
  };

  const particles = useMemo(
    () => [
      { top: "42%", left: "52%", delay: "0s" },
      { top: "48%", left: "60%", delay: ".4s" },
      { top: "55%", left: "46%", delay: ".8s" },
      { top: "50%", left: "38%", delay: "1.2s" },
    ],
    []
  );

  return (
    <div style={styles.wrap}>
      {/* KEYFRAMES LOCALES */}
      <style>{styleTag}</style>

      <div style={styles.stage}>
        <div style={{ ...styles.hexBase, ...styles.hexTop }}>
          {particles.map((p, i) => (
            <span
              key={i}
              style={{
                ...styles.particle,
                top: p.top,
                left: p.left,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>

        <div style={{ ...styles.hexBase, ...styles.hexBottom }} />
        <div style={styles.core} />

        
      </div>

      <div style={styles.loaderText}>
        {letters.map((c, i) => (
          <span
            key={i}
            style={{
              ...styles.loaderLetter,
              animationDelay: `${i * 0.12}s`,
            }}
          >
            {c === " " ? "\u00A0" : c}
          </span>
        ))}
      </div>
    </div>
  );
}
