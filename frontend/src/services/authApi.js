/** Authentification avec session HttpOnly via le proxy /api de Vite. */
async function lireReponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Réponse inattendue du backend (HTTP ${response.status}).`);
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || `Erreur HTTP ${response.status}`);
  }
  return payload.data;
}

async function getJson(route) {
  let response;
  try {
    response = await fetch(route, { credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new Error('API PHP inaccessible. Démarrez le serveur sur le port 8000.');
  }
  return lireReponse(response);
}

async function postJson(route, values) {
  // Le serveur gère le jeton CSRF en session ; ne jamais le stocker en localStorage.
  const { csrf_token: token } = await getJson('/api/auth/csrf');
  let response;
  try {
    response = await fetch(route, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      },
      body: JSON.stringify(values),
    });
  } catch {
    throw new Error('API PHP inaccessible. Réessayez.');
  }
  return lireReponse(response);
}

export async function recupererUtilisateur() {
  return getJson('/api/auth/me');
}

export async function inscription({ name, email, password }) {
  return postJson('/api/auth/register', { name, email, password });
}

export async function connexion({ email, password }) {
  return postJson('/api/auth/login', { email, password });
}

export async function deconnexion() {
  return postJson('/api/auth/logout', {});
}

export async function recupererStatsAdmin() {
  return getJson('/api/admin/stats');
}
