const axios = require("axios");

module.exports = async function proxyToStrapi(req, res) {
  const targetUrl = `${process.env.STRAPI_URL}${req.originalUrl}`;

  const incomingAuth = req.headers.authorization;

  console.log(
    incomingAuth ? "🔐 reenviando auth del usuario" : "🔓 usando API token"
  );

  try {
    // MEDIA (binario)
    if (req.originalUrl.startsWith("/uploads")) {
      const response = await axios({
        url: targetUrl,
        method: "GET",
        responseType: "stream",
      });

      Object.entries(response.headers).forEach(([k, v]) =>
        res.setHeader(k, v)
      );

      return response.data.pipe(res);
    }

    // API normal
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        Authorization: incomingAuth
          ? incomingAuth
          : `Bearer ${process.env.STRAPI_API_TOKEN}`,
      },
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    res
      .status(err.response?.status || 500)
      .json(err.response?.data || { error: err.message });
  }
};
