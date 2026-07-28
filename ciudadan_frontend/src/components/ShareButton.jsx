import React, { useState, useRef, useEffect } from "react";
import { FiShare2, FiCopy, FiX } from "react-icons/fi";
import logoCuadro from '../assets/logo_cuadro.png';
/**
 * BotonCompartirFix.jsx
 * - Todos los canales reciben la misma urlToShare (por defecto window.location.href).
 * - Enlaces de compartición construidos manualmente para asegurar inserción del link.
 * - Modal centrado verticalmente, con scroll interno. Primera opción visible y enfocada.
 * - uploadedFileUrl: ruta local del archivo subido (la transformas en deployment).
 *
 * Uso: <BotonCompartirFix url="https://mi.url/a/compartir" mensaje="Texto" />
 */

export default function ShareButton({
  url, // opcional; si no se pasa usa window.location.href
  mensaje = "Mira esto en Ciudadan.org 👇",
  open: openProp,
  onOpenChange,
  showButton = true,
}) {
  // ruta local del archivo que subiste (nos la solicitaste usar)
  const uploadedFileUrl = logoCuadro;
  const MAINDOMAIN = 'https://ciudadan.org';
  const urlToShare =
    typeof url === "string" && url.length > 0
      ? url
      : typeof window !== "undefined"
      ? `${MAINDOMAIN}/${window.location.pathname}${window.location.search}${window.location.hash}`
      : MAINDOMAIN;

  const [openState, setOpenState] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [shareError, setShareError] = useState(null);
  const listRef = useRef(null);
  const firstItemRef = useRef(null);

  const isControlled = typeof openProp === 'boolean';
  const open = isControlled ? openProp : openState;
  const setOpen = (value) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setOpenState(value);
    }
  };

  // Centrar modal, scroll top, focus primer item
  useEffect(() => {
    if (open) {
      setCopiado(false);
      setShareError(null);
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = 0;
        if (firstItemRef.current) {
          firstItemRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
          if (typeof firstItemRef.current.focus === "function") firstItemRef.current.focus();
        }
      });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => (document.body.style.overflow = "");
  }, [open]);

  // Abre ventana popup centrada
  const openPopup = (shareUrl, title = "Compartir", w = 640, h = 520) => {
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
    const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth;
    const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight;
    const left = width / 2 - w / 2 + dualScreenLeft;
    const top = height / 2 - h / 2 + dualScreenTop;
    const opts = `toolbar=0,status=0,resizable=1,width=${w},height=${h},top=${top},left=${left}`;
    window.open(shareUrl, title, opts);
  };

  function handleFacebook() {
    const link = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      urlToShare
    )}`;

    openPopup(link, "Compartir en Facebook", 780, 640);
  }

  // ===========================================================
  // ==================  WHATSAPP SHARE ========================
  // ===========================================================

  // Asegura que se muestre como LINK y no como texto
  function handleWhatsapp() {
    // Normalizar urlToShare
    var target = urlToShare && urlToShare.length ? urlToShare : window.location.href;

    // Normalizar mensaje: puede venir string, objeto, array, etc.
    let msgText = "";
    if (!mensaje) {
      msgText = "";
    } else if (typeof mensaje === "string") {
      msgText = mensaje;
    } else if (Array.isArray(mensaje)) {
      // unir arrays con espacios
      msgText = mensaje.map(item => (typeof item === "string" ? item : JSON.stringify(item))).join(" ");
    } else if (typeof mensaje === "object") {
      // si es objeto, priorizar propiedades comunes
      if (typeof mensaje.text === "string" && mensaje.text.trim()) {
        msgText = mensaje.text;
      } else if (typeof mensaje.message === "string" && mensaje.message.trim()) {
        msgText = mensaje.message;
      } else {
        // fallback: tomar valores no vacíos y unirlos
        msgText = Object.values(mensaje)
          .filter(v => v !== null && v !== undefined)
          .map(v => (typeof v === "string" ? v : JSON.stringify(v)))
          .join(" ");
      }
    } else {
      // otros tipos (number, boolean...)
      msgText = String(mensaje);
    }

    // Construir texto: URL primero (mejor para preview), luego mensaje si existe
    const text = `${target}${msgText ? " " + msgText : ""}`;

    // Enlace recomendado: wa.me/?text=...
    const waLink = `https://wa.me/?text=${encodeURIComponent(text)}`;

    // Abrir en nueva pestaña (evita popups que bloqueen en móviles)
    window.open(waLink, "_blank");
  }

  const handleTelegram = () => {
    const text = `${mensaje} ${urlToShare}`;
    const link = `https://t.me/share/url?url=${encodeURIComponent(urlToShare)}&text=${encodeURIComponent(mensaje)}`;
    openPopup(link, "Compartir en Telegram", 650, 560);
  };

  const handleTwitter = () => {
    const text = `${mensaje}`;
    const link = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(urlToShare)}`;
    openPopup(link, "Compartir en Twitter", 600, 450);
  };

  const handleLinkedIn = () => {
    const link = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(urlToShare)}&title=${encodeURIComponent(mensaje)}`;
    openPopup(link, "Compartir en LinkedIn", 700, 600);
  };

  const handleReddit = () => {
    const link = `https://www.reddit.com/submit?url=${encodeURIComponent(urlToShare)}&title=${encodeURIComponent(mensaje)}`;
    openPopup(link, "Compartir en Reddit", 900, 700);
  };

  const handlePinterest = () => {
    // incluye media (imagen) si está disponible
    const media = uploadedFileUrl ? `&media=${encodeURIComponent(uploadedFileUrl)}` : "";
    const link = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(urlToShare)}${media}&description=${encodeURIComponent(mensaje)}`;
    openPopup(link, "Compartir en Pinterest", 900, 700);
  };

  const handleMessenger = () => {
    // Messenger Web Dialog (si no funciona, usamos sharer.php con u param)
    const link = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(urlToShare)}&app_id=123456&redirect_uri=${encodeURIComponent(urlToShare)}`;
    // fallback a sharer si dialog falla
    try {
      openPopup(link, "Compartir en Messenger", 700, 600);
    } catch (e) {
      handleFacebook();
    }
  };

  const handleEmail = () => {
    const subject = mensaje;
    const body = `${mensaje}\n\n${urlToShare}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleInstagram = () => {
    // Instagram no permite compartir link directo en composer web; abrimos perfil o web con query
    const link = `https://www.instagram.com/?url=${encodeURIComponent(urlToShare)}`;
    window.open(link, "_blank");
  };

  const handleTikTok = () => {
    // TikTok no soporta share url directo; abrimos web y dejamos url en query
    const link = `https://www.tiktok.com/share?url=${encodeURIComponent(urlToShare)}`;
    window.open(link, "_blank");
  };

  async function handleDiscord() {
    const target =
      urlToShare && typeof urlToShare === "string" && urlToShare.length
        ? urlToShare
        : window.location.href;

    const fullMessage = `${target}${mensaje ? " " + mensaje : ""}`;

    try {
      await navigator.clipboard.writeText(fullMessage);
    } catch (e) {
      console.warn("Clipboard no permitido, fallback.");
    }

    // Abre Discord Web (no soporta ningún parámetro)
    window.open("https://discord.com/channels/@me", "_blank");
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title || "Compartir", text: mensaje, url: urlToShare });
        setOpen(false);
        setShareError(null);
      } catch (err) {
        setShareError("Compartir nativo cancelado o falló.");
      }
    } else {
      setShareError("Compartir nativo no soportado en este navegador.");
    }
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(urlToShare);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch (e) {
      setShareError("No se pudo copiar. Usa Ctrl+C.");
    }
  };

  // estilos (inline, listos para pegar)
const styles = {
  buttonWrapper: {
    display: "flex",
    justifyContent: "center",
    width: "100%",
    paddingTop: 50,
  },
  mainButton: {
  display: "inline-flex",
  position: "fixed",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "14px 18px",
  borderRadius: 999,
  background: "linear-gradient(135deg,#2ecc71,#7dff9c,#2ecc71)",
  backgroundSize: "300% 300%",
  color: "#0b2e13",
  border: "3px solid #1e8449",
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",

  right: 20,
  bottom: 180, // 👈 más arriba (antes 120)

  zIndex: 9999,
  boxShadow:
    "0 0 12px rgba(46,204,113,0.8), 0 0 28px rgba(46,204,113,0.6)",
  animation: "greenGlow 4s ease infinite",
},

glowText: {
  maxWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  transition: "max-width 0.35s ease, opacity 0.3s ease",
  opacity: 0,
},


    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      zIndex: 99999,
      backdropFilter: "blur(3px)",
      display: "flex",
      alignItems: "center", // CENTRADO vertical
      justifyContent: "center",
      padding: 20,
    },
    modal: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "86vh",
      borderRadius: 18,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      border: "4px solid #2A6400",
      background: "linear-gradient(180deg,#E6FF00 0%, #E1FF66 100%)",
      boxShadow: "0 18px 50px rgba(0,0,0,0.5)",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 12,
      background: "#2CB34B",
      color: "white",
      fontWeight: 900,
      fontSize: 18,
    },
    headerLeft: { display: "flex", gap: 12, alignItems: "center" },
    headerImg: { width: 60, height: 44, objectFit: "cover", borderRadius: 8 },
    list: {
      overflowY: "auto",
      WebkitOverflowScrolling: "touch",
      padding: 8,
    },
    row: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 16px",
      cursor: "pointer",
      fontWeight: 800,
      color: "#101010",
      fontSize: 16,
    },
    bubble: (bg) => ({
      minWidth: 44,
      minHeight: 44,
      borderRadius: 999,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: bg,
      color: "white",
      fontSize: 18,
      boxShadow: "0 6px 0 rgba(0,0,0,0.18)",
    }),
    cancel: {
      padding: 12,
      background: "#C7EA00",
      textAlign: "center",
      fontWeight: 900,
      cursor: "pointer",
      borderTop: "4px solid rgba(0,0,0,0.12)",
    },
    micro: { fontSize: 13, color: "#243424", opacity: 0.95 },
    error: { color: "#7a1111", padding: 10, fontWeight: 800 },
  };


  <style>
    {`
    @keyframes greenGlow {
      0% { background-position: 0% 50%; box-shadow: 0 0 10px #2ecc71; }
      50% { background-position: 100% 50%; box-shadow: 0 0 26px #7dff9c; }
      100% { background-position: 0% 50%; box-shadow: 0 0 10px #2ecc71; }
    }
    `}
  </style>


  return (
    <>
      {/* Botón flotante — ahora con clase para animaciones */}
      {showButton && (
        <div style={styles.buttonWrapper}>
          <button
            aria-label="Compartir"
            onClick={() => setOpen(true)}
            style={styles.mainButton}
            className={`ciudadan-share-btn ${open ? "open" : ""}`} // <-- agregada para control mobile (open)
          >
            {/* Los spans sirven para efectos visuales extra (opcionalmente pueden ser pseudo) */}
            <span className="ciud-glow" aria-hidden="true" />
            <FiShare2 size={18} />
            <span className="label">Compartir</span>
          </button>
        </div>
      )}

      {/* Modal (idéntico a tu implementación, sin cambios en lógica) */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={styles.backdrop}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.header}>
              <div style={styles.headerLeft}>
                <img src={uploadedFileUrl} alt="brand" style={styles.headerImg} />
                <div>
                  <div>Compartir</div>
                  <div style={styles.micro}>Comparte este enlace en tus redes !!</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={handleNativeShare} title="Compartir nativo" style={{ background: "transparent", border: "2px solid rgba(255,255,255,0.16)", color: "white", padding: "6px 8px", borderRadius: 10, fontWeight: 800, cursor: "pointer" }}>
                  Share
                </button>

                <button onClick={() => setOpen(false)} aria-label="Cerrar" style={{ background: "transparent", border: "none", color: "white", padding: 6, fontSize: 20, cursor: "pointer" }}>
                  <FiX />
                </button>
              </div>
            </div>

            <div ref={listRef} style={styles.list}>
              {/* PRIMERA OPCIÓN (se referencia para focus/scroll) */}
              <div ref={firstItemRef} tabIndex={-1} style={{ padding: 8 }}>
                <div onClick={handleFacebook} role="button" style={styles.row}>
                  <div style={styles.bubble("#1877F2")}>f</div>
                  Facebook
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleWhatsapp} role="button" style={styles.row}>
                  <div style={styles.bubble("#25D366")}>W</div>
                  WhatsApp
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleTelegram} role="button" style={styles.row}>
                  <div style={styles.bubble("#2AABEE")}>✈</div>
                  Telegram
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleTwitter} role="button" style={styles.row}>
                  <div style={styles.bubble("#000000")}>X</div>
                  X / Twitter
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleLinkedIn} role="button" style={styles.row}>
                  <div style={styles.bubble("#0A66C2")}>in</div>
                  LinkedIn
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleReddit} role="button" style={styles.row}>
                  <div style={styles.bubble("#FF4500")}>r</div>
                  Reddit
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handlePinterest} role="button" style={styles.row}>
                  <div style={styles.bubble("#E60023")}>P</div>
                  Pinterest
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleMessenger} role="button" style={styles.row}>
                  <div style={styles.bubble("#0078FF")}>m</div>
                  Messenger
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleEmail} role="button" style={styles.row}>
                  <div style={styles.bubble("#BA1E1E")}>✉</div>
                  Email
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleInstagram} role="button" style={styles.row}>
                  <div style={styles.bubble("linear-gradient(45deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5)")}>📸</div>
                  Instagram (fallback)
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleTikTok} role="button" style={styles.row}>
                  <div style={styles.bubble("#000000")}>♪</div>
                  TikTok (fallback)
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={handleDiscord} role="button" style={styles.row}>
                  <div style={styles.bubble("#5865F2")}>💬</div>
                  Discord
                </div>
              </div>

              <div style={{ padding: 8 }}>
                <div onClick={copiarEnlace} role="button" style={styles.row}>
                  <div style={styles.bubble("#007F00")}>
                    <FiCopy />
                  </div>
                  {copiado ? "Enlace copiado ✔" : "Copiar enlace"}
                </div>
              </div>

              {shareError && <div style={styles.error}>{shareError}</div>}
            </div>

            <div onClick={() => setOpen(false)} style={styles.cancel}>
              Cerrar
            </div>
          </div>
        </div>
      )}

      {/*
        Bloque CSS/Keyframes para los efectos:
        - Lo dejo dentro del return para no tocar otros archivos.
        - Si luego quieres moverlo a un CSS global, copia el contenido de <style>{`...`}</style>.
      */}
      <style>{`
        /* contenedor del botón: dejamos overflow visible para glow */
        .ciudadan-share-btn {
          position: relative; /* necesario para los pseudo/children */
          overflow: visible;
          -webkit-tap-highlight-color: transparent;
          transition: transform 200ms cubic-bezier(.2,.9,.3,1);
        }

        /* Sutil elevación al hover / focus */
        .ciudadan-share-btn:hover,
        .ciudadan-share-btn:focus {
          transform: translateY(-6px) scale(1.02);
          outline: none;
        }

        /* ANILLO GLOW (difuso) — pseudo-equivalente al before */
        .ciudadan-share-btn::before{
          content: "";
          position: absolute;
          left: -6px;
          top: -6px;
          right: -6px;
          bottom: -6px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255,242,0,0.95), rgba(231,227,0,0.65), rgba(255,242,0,0.95));
          filter: blur(10px);
          opacity: 0.55;
          z-index: -2;
          pointer-events: none;
          animation: glowShift 3.6s linear infinite;
        }

        /* BARRA LUMINOSA QUE BARRER (efecto "sweep") */
        .ciudadan-share-btn::after {
          content: "";
          position: absolute;
          left: -80%;
          top: -30%;
          width: 40%;
          height: 160%;
          background: linear-gradient(120deg, rgba(255,255,255,0.55), rgba(255,255,255,0.05));
          transform: rotate(18deg);
          opacity: 0.25;
          z-index: 0;
          pointer-events: none;
          animation: sweep 2.2s linear infinite;
        }

        /* pequeña chispa animada (elemento extra si quieres usarlo) */
        .ciud-glow {
          position: absolute;
          right: -6px;
          top: -6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.15));
          filter: blur(4px);
          z-index: -1;
          pointer-events: none;
          animation: pulse 2s infinite;
        }

        /* LABEL (texto) — por defecto oculto, aparece en hover/focus o si .open */
        .ciudadan-share-btn .label {
          display: inline-block;
          margin-left: 8px;
          white-space: nowrap;
          max-width: 0;
          opacity: 0;
          transform: translateX(-6px);
          transition: all 180ms cubic-bezier(.2,.9,.3,1);
          font-weight: 900;
        }

        /* Reveal on hover / focus */
        .ciudadan-share-btn:hover .label,
        .ciudadan-share-btn:focus .label,
        .ciudadan-share-btn.open .label { /* .open -> mobile friendly cuando el modal está abierto */
          max-width: 260px;
          opacity: 1;
          transform: translateX(0);
        }

        /* Accesibilidad: foco visible */
        .ciudadan-share-btn:focus {
          box-shadow: 0 0 0 4px rgba(255,242,0,0.12);
        }

        /* keyframes */
        @keyframes glowShift {
          0% { transform: translateX(-30%); opacity: 0.6; }
          50% { transform: translateX(30%); opacity: 0.8; }
          100% { transform: translateX(-30%); opacity: 0.6; }
        }

        @keyframes sweep {
          0% { left: -80%; opacity: 0.14; }
          50% { left: 30%; opacity: 0.36; }
          100% { left: 140%; opacity: 0.14; }
        }

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }

        /* Mobile tweak: reduce intensidad animaciones en pantallas pequeñas */
        @media (max-width: 520px) {
          .ciudadan-share-btn::before { filter: blur(8px); opacity: 0.45; }
          .ciudadan-share-btn::after { display: none; } /* evita efectos molestos en móvil */
        }
      `}</style>
    </>
  );
}