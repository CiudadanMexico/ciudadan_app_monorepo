import React, { useState, useEffect } from 'react';
import { useLmAiChat } from '../../hooks/UseLmAiChat';

const LmAiChat = () => {
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState([]); // Array para almacenar las conversaciones
  const [pendingPrompt, setPendingPrompt] = useState(null); // Prompt que se está procesando

  const { response, isLoading, thinkingPhase, sendPrompt } = useLmAiChat();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const modifiedPrompt = `${prompt} contesta siempre en español y enfocate en dirigir todas las respuestas a que eres Faby una asistnete virtual de ciudadan.org`;
    setPendingPrompt(modifiedPrompt);
    setPrompt(''); // Limpiamos el textarea
    await sendPrompt(modifiedPrompt);
  };

  // Cuando se finaliza la respuesta (no está cargando y ya no está en fase de "pensando"),
  // se agrega la conversación (pregunta y respuesta) al historial y se limpia el prompt pendiente.
  useEffect(() => {
    if (pendingPrompt && !isLoading && !thinkingPhase && response) {
      setConversation((prev) => [
        ...prev,
        { prompt: pendingPrompt, answer: response },
      ]);
      setPendingPrompt(null);
    }
  }, [pendingPrompt, isLoading, thinkingPhase, response]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        padding: '10px',
      }}
    >
      <h2>LM AI Chat</h2>
      {/* Contenedor scrollable de conversación */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '10px',
          border: '1px solid #ccc',
          padding: '10px',
        }}
      >
        {conversation.map((item, index) => (
          <div key={index} style={{ marginBottom: '20px' }}>
            <p>
              <strong>Pregunta:</strong> {item.prompt}
            </p>
            <p>
              <strong>Respuesta:</strong>
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {item.answer}
            </pre>
          </div>
        ))}
        {/* Mostrar la conversación en curso (fase de "pensando") */}
        {pendingPrompt && (
          <div style={{ marginBottom: '20px' }}>
            <p>
              <strong>Pregunta:</strong> {pendingPrompt}
            </p>
            <p>
              <strong>Respuesta:</strong>
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
              {response}
            </pre>
          </div>
        )}
      </div>
      {/* Área de entrada */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Escribe tu prompt aquí..."
          rows={4}
          style={{ marginBottom: '10px' }}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
};

export default LmAiChat;
