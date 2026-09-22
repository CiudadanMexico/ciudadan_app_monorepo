const strapiUrl = process.env.REACT_APP_STRAPI_URL || '';
const strapiToken = process.env.REACT_APP_STRAPI_TOKEN || '';

export const sendToWhatsApp = async () => {
    try {
        const url = `${strapiUrl.replace(/\/$/, '')}/api/site-setting`;

        const resp = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...(strapiToken ? { Authorization: `Bearer ${strapiToken}` } : {}),
            },
        });

        if (!resp.ok) throw new Error('Error consultando site settings');
        const json = await resp.json();

        const phoneNumber = json
            ? json.data?.attributes?.whatsapp_number
            : null;
        const message = "Buen día, necesito ayuda";

        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
    } catch (err) {
        console.error('Error consultando número de WhatsApp de site settings', err);
    }
};