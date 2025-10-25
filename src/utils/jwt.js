
import jwt from 'jsonwebtoken'
const SECRET = process.env.JWT_SECRET || 'dev-secret'
export const signJwt = (payload, opts = { expiresIn: '1d' }) => jwt.sign(payload, SECRET, opts)
export const verifyJwt = (token) => jwt.verify(token, SECRET)
