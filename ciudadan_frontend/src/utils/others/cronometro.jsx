import { useState, useEffect } from "react";

const Cronometro = ({ startTime }) => {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
      if (!startTime) {
        console.error("No se ha proporcionado startTime a Cronometro");
        return;
      }
      const startDate = new Date(startTime);
      if (isNaN(startDate)) {
        console.error("startTime no es una fecha válida:", startTime);
        return;
      }

      const interval = setInterval(() => {
        const now = new Date();
        const diffSeconds = Math.floor((now - startDate) / 1000);
        setElapsedSeconds(diffSeconds);
      }, 1000);

      return () => clearInterval(interval);
    }, [startTime]);

    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;

    return (
      <span>
        {minutes}:{seconds < 10 ? '0' : ''}
        {seconds}
      </span>
    );
};

export default Cronometro;
