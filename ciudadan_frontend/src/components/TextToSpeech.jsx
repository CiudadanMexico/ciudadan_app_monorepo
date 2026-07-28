import React, { useState, useEffect } from "react";

const TextToSpeech = () => {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  // Obtener las voces disponibles
  useEffect(() => {
    const handleVoicesChanged = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (!selectedVoice) {
        setSelectedVoice(availableVoices[0]);
      }
    };

    // Escuchar el evento de cambio de voces
    speechSynthesis.onvoiceschanged = handleVoicesChanged;

    // Obtener las voces inicialmente
    handleVoicesChanged();

    return () => {
      // Limpiar el evento al desmontar el componente
      speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  const speakText = () => {
    if (text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div>
      <h1>Texto a Voz</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe algo para leer"
      />
      <br />
      <label>Seleccionar voz:</label>
      <select onChange={(e) => setSelectedVoice(voices[e.target.value])}>
        {voices.map((voice, index) => (
          <option key={index} value={index}>
            {voice.name} - {voice.lang}
          </option>
        ))}
      </select>
      <br />
      <button onClick={speakText}>Hablar</button>
    </div>
  );
};

export default TextToSpeech;
