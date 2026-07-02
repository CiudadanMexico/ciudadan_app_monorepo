import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  IconButton,
} from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";

const styles = {
  accentGradient: "linear-gradient(90deg,#8ef56b,#6ae6a6 45%,#b48bff 100%)",
  moradoGradient:
    "linear-gradient(120deg, rgba(132,94,255,0.12) 0%, rgba(175,96,255,0.08) 40%, rgba(58,12,89,0.04) 100%)",
  cardBg:
    "linear-gradient(180deg, rgba(18,10,30,0.6), rgba(40,10,60,0.45))", // morado oscuro sutil
  glassBorder: "rgba(255,255,255,0.04)",
  titleFont: `"Poppins", "Inter", "Segoe UI", Roboto, sans-serif`,
  bodyFont: `"Inter", "Roboto", "Segoe UI", sans-serif`
};

const LocalPlayer = ({ src, poster, width, maxHeight = 420 }) => {
    const localRef = useRef(null);
    const [localMuted, setLocalMuted] = useState(true); // por defecto muted para evitar bloqueo
    const [localLoop, setLocalLoop] = useState(true);

    useEffect(() => {
        if (!localRef.current) return;
        localRef.current.loop = localLoop;
    }, [localLoop, localMuted]);

    return (
        <Box sx={{ mt: 2, borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.03)", background: styles.moradoGradient, position: "relative" }}>
            <video
            ref={localRef}
            src={src}
            poster={poster}
            playsInline
            controls
            style={{ width: width, height: "auto", display: "block", objectFit: "cover", maxHeight }}
            />

            <Box sx={{ position: "absolute", right: 12, bottom: 12, display: "flex", gap: 1, alignItems: "center", zIndex: 30 }}>

            <IconButton
                onClick={() => {
                const next = !localLoop;
                setLocalLoop(next);
                if (localRef.current) localRef.current.loop = next;
                }}
                sx={{ bgcolor: localLoop ? "rgba(124,255,90,0.14)" : "rgba(0,0,0,0.45)", color: localLoop ? "#062e00" : "#fff", "&:hover": { bgcolor: localLoop ? "rgba(124,255,90,0.18)" : "rgba(0,0,0,0.55)" } }}
            >
                <ReplayIcon />
            </IconButton>

            
            </Box>
        </Box>
    );
}

export default LocalPlayer;