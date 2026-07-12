const fs = require('fs');
const path = './server/src/index.ts';
let code = fs.readFileSync(path, 'utf8');
if (!code.includes('clientDistPath')) {
    const serveCode = `
// Serve frontend (client/dist) in production
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});
`;
    code = code.replace('// Start server', serveCode + '\n// Start server');
    fs.writeFileSync(path, code);
}
