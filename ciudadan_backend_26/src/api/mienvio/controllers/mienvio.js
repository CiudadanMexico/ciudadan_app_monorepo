'use strict';

module.exports = {
  async connect(ctx) {
    try {
      const res = await fetch("https://api.mienvio.mx/v1/me", {
        headers: {
          Authorization: `Bearer ${process.env.MIENVIO_API_KEY}`,
          "Content-Type": "application/json"
        }
      });

      if (!res.ok) {
        return ctx.badRequest("Error al conectar con Mienvío");
      }

      const data = await res.json();
      return ctx.send({ ok: true, data });
    } catch (err) {
      console.error(err);
      return ctx.internalServerError("Error al conectar con Mienvío");
    }
  }
};
