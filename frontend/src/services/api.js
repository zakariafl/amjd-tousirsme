// Dans Vite, /api est transféré à PHP (voir vite.config.js).
export async function recupererVoyages(signal) {
  let response;
  try {
    response = await fetch('/api/voyages', { signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('API inaccessible. Vérifiez que le serveur PHP fonctionne sur le port 8000.');
  }

  if (!response.ok) {
    throw new Error(`Erreur API (${response.status}). Vérifiez PHP et MySQL.`);
  }

  const payload = await response.json();
  if (!payload.success || !Array.isArray(payload.data)) {
    throw new Error('Réponse API inattendue.');
  }
  return payload.data;
}
