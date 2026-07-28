import { useState, useEffect, useRef } from "react";
import { FaMicrophone } from "react-icons/fa";
import BotonCircular from "./../Usuarios/BotonCircular";

const AIInput = () => {
  const [searchText, setSearchText] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Referencias para el reconocimiento de voz
  const recognitionRef = useRef(null);

  // Configurar el reconocimiento de voz
  useEffect(() => {
    if ("webkitSpeechRecognition" in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "es-ES";

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSearchText(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Error en el reconocimiento de voz:", event.error);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn("Tu navegador no soporta reconocimiento de voz. Usa Google Chrome.");
    }
  }, []);

  // Iniciar el reconocimiento de voz
  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    } else {
      alert("Tu navegador no soporta reconocimiento de voz.");
    }
  };

  return (
    <span>
      <input
        type="text"
        placeholder="Buscar/Chatear/Controlar con I.A."
        className="nav-input"
        style={{ padding: "8px", top: "-11px" }}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      <span>
        {/* Pasamos searchText como prop a BotonCircular */}
        <BotonCircular clase="boton-busca" searchText={searchText} />
      </span>
      <span>
        <button onClick={startListening} className="boton-microfono">
          <FaMicrophone color={isListening ? "red" : "black"} />
        </button>
      </span>
    </span>
  );
};

export default AIInput;
