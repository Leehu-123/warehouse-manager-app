const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const https = require('https');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'admin@dafa.vn' } });
  if (!user) return console.log('User not found');
  
  const payload = { sub: user.id, email: user.email, companyId: user.companyId };
  const token = jwt.sign(payload, 'dafa-warehouse-secret-key-2024', { expiresIn: '7d' });
  console.log('Token:', token);

  const options = {
    hostname: 'coreapi.ldhuy.name.vn',
    path: '/inventory/stats',
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  };

  const req = https.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Response:', res.statusCode, body));
  });
  req.end();
}
main();
