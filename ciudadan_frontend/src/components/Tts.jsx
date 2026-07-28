import React, { useRef, useState } from "react";

const TTSStreaming = () => {
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(null);

  const handleGenerateAudio = async () => {
    setLoading(true);
    try {
      console.log("Enviando solicitud a la API para generar audio (streaming)...");
      const response = await fetch("http://192.168.1.4:4033/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hola, esto es una prueba de texto que es más de 10 veces más larga quisiera recordar como se agrega un lorem ipsum, pero por ahora mandame este audio con el que estamos probando." })
      });
      if (!response.ok) {
        console.error("Error en la solicitud:", response.statusText);
        setLoading(false);
        return;
      }
      console.log("Respuesta recibida, iniciando streaming...");

      const mediaSource = new MediaSource();
      const objectUrl = URL.createObjectURL(mediaSource);
      if (audioRef.current) {
        audioRef.current.src = objectUrl;
      }
      mediaSource.addEventListener("sourceopen", () => {
        console.log("MediaSource abierta");
        const mime = 'audio/mpeg';
        let sourceBuffer;
        try {
          sourceBuffer = mediaSource.addSourceBuffer(mime);
        } catch (e) {
          console.error("Error al crear el sourceBuffer:", e);
          setLoading(false);
          return;
        }
        const reader = response.body.getReader();

        const pump = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              console.log("Fin del streaming");
              try {
                mediaSource.endOfStream();
              } catch (e) {
                console.error("Error al finalizar MediaSource:", e);
              }
              setLoading(false);
              return;
            }
            console.log("Chunk recibido, tamaño:", value.length);
            if (!sourceBuffer.updating) {
              try {
                sourceBuffer.appendBuffer(value);
              } catch (e) {
                console.error("Error al añadir chunk al sourceBuffer:", e);
              }
            } else {
              sourceBuffer.addEventListener("updateend", function handler() {
                sourceBuffer.removeEventListener("updateend", handler);
                try {
                  sourceBuffer.appendBuffer(value);
                } catch (e) {
                  console.error("Error al añadir chunk tras updateend:", e);
                }
              });
            }
            pump();
          }).catch((error) => {
            console.error("Error al leer stream:", error);
            setLoading(false);
          });
        };
        pump();
      });
    } catch (error) {
      console.error("Error al generar audio streaming:", error);
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleGenerateAudio} disabled={loading}>
        {loading ? "Generando audio (streaming)..." : "Generar Audio (Streaming)"}
      </button>
      <audio ref={audioRef} controls />
    </div>
  );
};

export default TTSStreaming;
