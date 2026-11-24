/** Toutes les opérations passent par le proxy Vite /api et la session HttpOnly PHP. */
async function lire(response) {
  let body;
  try { body = await response.json(); }
  catch { throw new Error(`Réponse API invalide (HTTP ${response.status}).`); }
  if (!response.ok || !body.success) throw new Error(body.error || `Erreur HTTP ${response.status}`);
  return body.data;
}
async function req(path, method = 'GET', payload) {
  const headers = {};
  if (method !== 'GET') {
    const response = await fetch('/api/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
    const data = await lire(response);
    headers['X-CSRF-Token'] = data.csrf_token;
    headers['Content-Type'] = 'application/json';
  }
  let response;
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store', headers,
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
  } catch {
    throw new Error('API PHP inaccessible. Vérifiez le serveur sur le port 8000.');
  }
  return lire(response);
}
export const chargerDashboard = () => req('/api/admin/dashboard');
export const listerVoyagesAdmin = () => req('/api/admin/voyages');
export const listerDestinationsAdmin = () => req('/api/admin/destinations');
export const ajouterDestinationAdmin = (body) => req('/api/admin/destinations', 'POST', body);
export const creerVoyageAdmin = (body) => req('/api/admin/voyages', 'POST', body);
export const modifierVoyageAdmin = (id, body) => req(`/api/admin/voyages/${id}`, 'PUT', body);
export const publierVoyageAdmin = (id, published) => req(`/api/admin/voyages/${id}/published`, 'PATCH', { published });
export const listerDepartsAdmin = (id) => req(`/api/admin/voyages/${id}/departures`);
export const creerDepartAdmin = (id, body) => req(`/api/admin/voyages/${id}/departures`, 'POST', body);
