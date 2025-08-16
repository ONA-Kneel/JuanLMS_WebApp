import jwt from 'jsonwebtoken';

export const authenticateToken = (req, res, next) => {
  try {
    console.log('Authenticating request...');
    const authHeader = req.headers['authorization'];
    console.log('Auth header:', authHeader);

    if (!authHeader) {
      console.log('No auth header found');
      return res.status(401).json({ message: 'No authorization header' });
    }

    // Check if the header starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return res.status(401).json({ message: 'Invalid authorization header format' });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token === 'null' || token === 'undefined') {
      console.log('No valid token found in auth header');
      return res.status(401).json({ message: 'No valid token provided' });
    }

    console.log('Verifying token...');
    // Use the same secret key that was used to sign the token during login
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, secret);
    console.log('Decoded token:', decoded);

    if (!decoded._id) {
      console.log('No user ID in token');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    req.user = decoded;
    console.log('Authentication successful');
    next();
  } catch (error) {
    console.error('Auth error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ 
      message: 'Authentication error',
      details: error.message
    });
  }
}; 