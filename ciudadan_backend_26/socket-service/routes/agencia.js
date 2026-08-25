const express = require('express');
const router = express.Router();

// Importamos la lógica del servicio que diseñamos
const { otorgarSubsidio } = require('../lib/beneficios.service');

router.post('/subsidio', async (req, res) => {
    // Recibe la wallet del receptor, el monto base y la firma digital
    const { paraWallet, montoBase, firma } = req.body;

    // Validación básica
    if (!paraWallet || !montoBase || !firma) {
        return res.status(400).json({ 
            ok: false, 
            error: "Faltan datos obligatorios: paraWallet, montoBase, firma" 
        });
    }

    try {
        // Ejecutamos la lógica que valida roles (conductor/vendedor) y aplica el nivel
        const resultado = await otorgarSubsidio(paraWallet, montoBase, firma);
        
        res.json({ 
            ok: true, 
            mensaje: `Subsidio aplicado correctamente a ${resultado.tipoUsuario}`,
            detalles: {
                tipo: resultado.tipoUsuario,
                nivel: resultado.nivel,
                montoCalculado: resultado.beneficio
            }
        });
    } catch (error) {
        // Captura cualquier error de validación del servicio (ej. wallet no encontrada)
        res.status(400).json({ ok: false, error: error.message });
    }
});

module.exports = router;