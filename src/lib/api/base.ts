const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

// Fallback para produção no Vercel
const FALLBACK_API_URL = 'https://dashboard-secti-backend-c239a3e8dccd.herokuapp.com';

export const API_BASE_URL = configuredApiBaseUrl
  ? configuredApiBaseUrl.replace(/\/$/, '')
  : FALLBACK_API_URL;

export const API_URL = `${API_BASE_URL}/api`;
