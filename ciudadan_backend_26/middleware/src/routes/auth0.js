import express from 'express';
import axios from 'axios';
import { verifyAuth0Token } from '../auth0.js';

const router = express.Router();

router.post('/auth0-login', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });

    const token = auth.replace('Bearer ', '');
    const decoded = await verifyAuth0Token(token);

    const email = decoded.email;

    const response = await axios.get(
      `${process.env.STRAPI_URL}/api/users`,
      {
        params: { 'filters[email][$eq]': email },
        headers: {
          Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
        },
      }
    );

    let user = response.data[0];

    if (!user) {
      const created = await axios.post(
        `${process.env.STRAPI_URL}/api/users`,
        {
          email,
          username: email,
          provider: 'auth0',
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
          },
        }
      );
      user = created.data;
    }

    res.json({ ok: true, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
