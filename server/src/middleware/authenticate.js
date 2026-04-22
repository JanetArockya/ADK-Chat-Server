const { getSession } = require('../utils/authStore');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const user = await getSession(token);
    if (!user) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }
    req.user = user;
    req.token = token;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}

module.exports = { authenticate };
