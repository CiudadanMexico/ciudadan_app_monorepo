const express = require('express');
const router = express.Router();
const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL;
const HEADERS = { Authorization: `Bearer ${process.env.STRAPI_TOKEN}` };

// ENDPOINT DE PAGOS: Aplica para Cliente, Conductor y Vendedor
router.post('/pagar', async (req, res) => {
    const { walletEmisor, receptorWallet, porcentaje, firma } = req.body;
    const TASA_PESOS = 80; // Hardcodeado

    try {
        // 1. Validar porcentaje (1% a 10%)
        if (porcentaje < 1 || porcentaje > 10) throw new Error("El porcentaje debe ser entre 1 y 10");

        // 2. Obtener datos del emisor (funciona para cualquier rol)
        const resp = await axios.get(`${STRAPI_URL}/api/carteras?filters[address][$eq]=${walletEmisor}&populate=*`, { headers: HEADERS });
        const emisor = resp.data.data[0];
        
        if (!emisor) throw new Error("Cartera del emisor no encontrada");

        // 3. Calcular monto (Porcentaje del saldo actual)
        const saldoActual = emisor.attributes.laborysSaldo || 0;
        const montoLaborys = saldoActual * (porcentaje / 100);
        const montoPesos = montoLaborys * TASA_PESOS;

        // 4. Descontar saldo al emisor
        await axios.put(`${STRAPI_URL}/api/carteras/${emisor.id}`, { 
            data: { laborysSaldo: saldoActual - montoLaborys } 
        }, { headers: HEADERS });

        // 5. Registrar en pagos con los valores de conversión
        await axios.post(`${STRAPI_URL}/api/laborys-payments`, {
            data: { 
                walletEmisor: walletEmisor, 
                walletReceptor: receptorWallet, 
                monto: montoLaborys, 
                montoPesos: montoPesos,
                firma, 
                tipo: 'pago_rol_general' 
            }
        }, { headers: HEADERS });

        res.json({ 
            ok: true, 
            mensaje: `Pago realizado por ${emisor.attributes.tipoUsuario}`, 
            detalles: { montoLaborys, montoPesos } 
        });

    } catch (error) {
        res.status(400).json({ ok: false, error: error.message });
    }
});

module.exports = router;