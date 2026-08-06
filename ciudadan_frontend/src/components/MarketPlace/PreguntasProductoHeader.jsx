import { useEffect, useState } from "react";
import { Typography } from "@mui/material";
import usePreguntasProducto from "../../hooks/usePreguntasProductos";

const PreguntasProductoHeader = ({ productoId }) => {

    const { obtenerPreguntas } = usePreguntasProducto();

    const [total, setTotal] = useState(0);

    useEffect(() => {

        const cargar = async () => {

            const preguntas = await obtenerPreguntas(productoId);

            setTotal(preguntas?.length ?? 0);

        };

        cargar();

    }, [productoId]);

    return (
        <Typography
            variant="h6"
            fontWeight={700}
        >
            Preguntas ({total})
        </Typography>
    );

};

export default PreguntasProductoHeader;