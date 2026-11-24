/** Réservations: mêmes cookies PHP et même proxy Vite que l'étape 4. */
async function verifier(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Réponse inattendue de l'API (HTTP ${response.status}).`);
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || `Erreur HTTP ${response.status}.`);
  }
  return payload.data;
}

async function get(route, signal) {
  const response = await fetch(route, { credentials: 'same-origin', cache: 'no-store', signal });
  return verifier(response);
}

async function post(route, body = {}) {
  // Lire le jeton CSRF depuis la session HttpOnly, jamais depuis localStorage.
  const { csrf_token: token } = await get('/api/auth/csrf');
  const response = await fetch(route, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify(body),
  });
  return verifier(response);
}

export const recupererDeparts = (voyageId, signal) => get(`/api/voyages/${voyageId}/departures`, signal);
export const recupererMesReservations = () => get('/api/reservations');
export const reserverVoyage = ({ departure_id, people, request_key }) =>
  post('/api/reservations', { departure_id, people, request_key });
export const annulerReservation = (reservationId) =>
  post(`/api/reservations/${reservationId}/cancel`);
export const recupererReservationsAdmin = () => get('/api/admin/reservations');
export const confirmerReservation = (reservationId) =>
  post(`/api/admin/reservations/${reservationId}/confirm`);
