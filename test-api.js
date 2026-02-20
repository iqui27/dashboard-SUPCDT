import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const token = jwt.sign({ id: 'test', role: 'admin' }, '3748509e495a495d495d495a3458495d495a495d49495a495d4958495d495a495d495a4958495d495a', { expiresIn: '1h' });

fetch('http://localhost:4000/api/projetos', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(res => res.json()).then(data => console.log(data)).catch(console.error);
