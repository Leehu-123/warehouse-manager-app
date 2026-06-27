import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dafa-warehouse-secret-key-2024';
const TOKEN_EXPIRY = '24h';

interface TokenPayload {
  id: number;
  username: string;
  role: string;
  fullName: string;
}

export function generateToken(user: TokenPayload): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
