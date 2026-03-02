/**
 * Validates the SITE_PASSWORD from env against the Authorization header.
 * Clients send:  Authorization: Bearer <password>
 */
export function requirePassword(req, res, next) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return res.status(500).json({ error: 'SITE_PASSWORD no está configurado en el servidor.' });
  }

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || token !== sitePassword) {
    return res.status(401).json({ error: 'Contraseña incorrecta.' });
  }

  next();
}
