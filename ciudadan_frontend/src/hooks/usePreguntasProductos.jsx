import { useState } from "react";
import * as service from "../services/preguntasProductosService"

export default function usePreguntasProducto() {

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const obtenerPreguntas = async (productoId) => {
        setLoading(true);
        try {
            return await service.obtenerPreguntasProducto(productoId);
        } catch (error) {
            console.error("Error al obtener preguntas");
            return [];
        } finally {
            setLoading(false);
        }
    };

    const obtenerPreguntasTienda = async ({
        storeId,
        status = "",
        page = 1,
        pageSize = 10,
    }) => {
        setLoading(true);
        try {
            return await service.obtenerPreguntasProductosByStore({ storeId, status, page, pageSize });
        } catch (error) {
            console.error("Error al obtener preguntas");
            return { data: [], meta: {} };
        } finally {
            setLoading(false);
        }
    };

    const crearPregunta = async (data) => {
        setSaving(true);
        try {
            return await service.crearPreguntaProducto(data);
        } catch (error) {
            console.error("Error al crear pregunta:", error);
            return null;
        } finally {
            setSaving(false);
        }
    };

    const registrarRespuesta = async (preguntaId, respuesta) => {
        setSaving(true);
        try {
            return await service.registrarRespuestaPregunta(preguntaId, respuesta);
        } catch (error) {
            console.error("Error al registrar respuesta:", error);
            return null;
        } finally {
            setSaving(false);
        }
    };

    return {
        loading,
        obtenerPreguntas,
        obtenerPreguntasTienda,
        crearPregunta,
        registrarRespuesta,
        saving,
    }

}