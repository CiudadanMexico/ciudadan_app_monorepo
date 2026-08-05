const express = require('express');
const router = express.Router();
const axios = require('axios');

const STRAPI_URL = process.env.STRAPI_URL;
const HEADERS = { Authorization: `Bearer ${process.env.STRAPI_TOKEN}` };
const AGENCIA_WALLET = "AGENCIA_MAESTRA_001";

// 1. CREACIÓN DE CARTERA
router.post('/crear', async (req, res) => {
    const { address, tipoUsuario, usuarioId } = req.body;
    try {
        const response = await axios.post(`${STRAPI_URL}/api/carteras`, {
            data: { address, tipoUsuario, usuarioId, laborysSaldo: 5, nivel: 1 }
        }, { headers: HEADERS });
        res.json({ ok: true, mensaje: "Cartera creada con bono de 5 Laborys", datos: response.data });
    } catch (error) {
        res.status(400).json({ ok: false, error: error.message });
    }
});

// 2. CONSULTA DE SALDOS
router.get('/saldo/:address', async (req, res) => {
    try {
        const resp = await axios.get(`${STRAPI_URL}/api/carteras?filters[address][$eq]=${req.params.address}`, { headers: HEADERS });
        if (!resp.data.data[0]) return res.status(404).json({ error: "Wallet no encontrada" });
        res.json({ ok: true, saldo: resp.data.data[0].attributes.laborysSaldo });
    } catch (error) {
        res.status(400).json({ ok: false, error: error.message });
    }
});

// 3. TRANSFERENCIAS (Lógica unificada)
router.post('/transferir', async (req, res) => {
    const { deWallet, paraWallet, monto, esPesos, firma, tipoAccion, tareaId } = req.body;

    try {
        const montoLaborys = esPesos ? (monto / 5.50) : monto;

        // Obtener emisores y receptores con populate para ver tipoUsuario
        const emisorResp = await axios.get(`${STRAPI_URL}/api/carteras?filters[address][$eq]=${deWallet}&populate=*`, { headers: HEADERS });
        const receptorResp = await axios.get(`${STRAPI_URL}/api/carteras?filters[address][$eq]=${paraWallet}&populate=*`, { headers: HEADERS });
        
        const emisor = emisorResp.data.data[0];
        const receptor = receptorResp.data.data[0];

        if (!emisor || !receptor) throw new Error("Dirección de cartera no válida");

        // Lógica de Cliente: límite 1-10 Laborys
        if (deWallet !== AGENCIA_WALLET && emisor.attributes.tipoUsuario === 'cliente') {
            if (montoLaborys < 1 || montoLaborys > 10) throw new Error("El cliente solo puede transferir entre 1 y 10 Laborys");
            if (emisor.attributes.laborysSaldo < montoLaborys) throw new Error("Saldo insuficiente");
            
            // Restar saldo al cliente
            await axios.put(`${STRAPI_URL}/api/carteras/${emisor.id}`, { 
                data: { laborysSaldo: emisor.attributes.laborysSaldo - montoLaborys } 
            }, { headers: HEADERS });
        }

        // Sumar saldo al receptor
        await axios.put(`${STRAPI_URL}/api/carteras/${receptor.id}`, { 
            data: { laborysSaldo: (receptor.attributes.laborysSaldo || 0) + montoLaborys } 
        }, { headers: HEADERS });

        // Guardar movimiento inmutable
        await axios.post(`${STRAPI_URL}/api/laborys-payments`, {
            data: { walletEmisor: deWallet, walletReceptor: paraWallet, monto: montoLaborys, firma, tipo: tipoAccion, tareaId }
        }, { headers: HEADERS });

        res.json({ ok: true, mensaje: "Transferencia procesada correctamente" });
    } catch (error) {
        res.status(400).json({ ok: false, error: error.message });
    }
});

module.exports = router;