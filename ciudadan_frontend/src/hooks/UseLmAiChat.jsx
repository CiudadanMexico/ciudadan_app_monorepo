import { useState, useRef } from 'react';

export const useLmAiChat = () => {
  const [conversation, setConversation] = useState([
    { role: 'system', content: 'Eres MariaBot, la asistente virtual de ciudadan.org. Contesta siempre en español.' }
  ]);
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState(true);
  const lastUpdateTimeRef = useRef(Date.now());

  const insertSpaces = (text) => {
    return text
      .replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/g, '$1 $2')
      .replace(/([a-zA-ZÁÉÍÓÚÜÑ])([水-龯])/g, '$1 $2')
      .replace(/([水-龯])([a-zA-ZÁÉÍÓÚÜÑ])/g, '$1 $2');
  };

  const sendPrompt = async (prompt) => {
    setResponse('');
    setIsLoading(true);
    setThinkingPhase(true);

    // Actualizamos la conversación agregando el prompt del usuario
    const updatedConversation = [...conversation, { role: 'user', content: prompt }];
    setConversation(updatedConversation);

    try {
      const res = await fetch(`${process.env_REACT_APP_AI_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Enviamos la conversación completa para retener el contexto
        body: JSON.stringify({
          messages: updatedConversation,
        }),
      });
      if (!res.ok) throw new Error('Error al conectar con el servidor');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let finalPhase = false;
      let thinkingBuffer = '';
      let finalAnswer = '';

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        let chunk = decoder.decode(value, { stream: true });
        if (chunk.startsWith("data:")) {
          chunk = chunk.slice("data:".length);
        }
        chunk = chunk.replace(/^[\r\n]+|[\r\n]+$/g, '');
        if (chunk.trim() === "[DONE]") continue;
        
        if (!finalPhase) {
          const endIndex = chunk.indexOf('</think>');
          if (endIndex !== -1) {
            let thinkingChunk = chunk.substring(0, endIndex);
            thinkingChunk = insertSpaces(thinkingChunk);
            thinkingBuffer += thinkingChunk;
            finalPhase = true;
            setThinkingPhase(false);
            const postThink = chunk.substring(endIndex + '</think>'.length);
            finalAnswer += postThink;
            setResponse(finalAnswer);
          } else {
            chunk = insertSpaces(chunk);
            thinkingBuffer = chunk;
            if (Date.now() - lastUpdateTimeRef.current > 500) {
              setResponse(thinkingBuffer);
              lastUpdateTimeRef.current = Date.now();
            }
          }
        } else {
          finalAnswer += chunk;
          if (Date.now() - lastUpdateTimeRef.current > 500) {
            setResponse(finalAnswer);
            lastUpdateTimeRef.current = Date.now();
          }
        }
      }
      setResponse(finalPhase ? finalAnswer : thinkingBuffer);
      setThinkingPhase(false);
      
      // Una vez recibida la respuesta final, la agregamos al historial
      setConversation(prev => [...prev, { role: 'assistant', content: finalPhase ? finalAnswer : thinkingBuffer }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setThinkingPhase(false);
    }
  };

  return { conversation, response, isLoading, thinkingPhase, sendPrompt };
};
