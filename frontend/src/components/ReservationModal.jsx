import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, TicketCheck, Users, X } from 'lucide-react';
import { recupererDeparts, reserverVoyage } from '../services/reservationApi';

function dateFr(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function ReservationModal({ voyage, onClose, onViewReservations }) {
  const [departs, setDeparts] = useState([]);
  const [departureId, setDepartureId] = useState('');
  const [people, setPeople] = useState(1);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [reservation, setReservation] = useState(null);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const onCloseRef = useRef(onClose);
  const envoiRef = useRef(envoi);
  onCloseRef.current = onClose;
  envoiRef.current = envoi;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    const controller = new AbortController();
    recupererDeparts(voyage.id, controller.signal)
      .then((data) => {
        setDeparts(data);
        setDepartureId(String(data.find((d) => d.disponibles > 0)?.id ?? ''));
      })
      .catch((err) => { if (err.name !== 'AbortError') setErreur(err.message); })
      .finally(() => { if (!controller.signal.aborted) setChargement(false); });
    function esc(event) { if (event.key === 'Escape' && !envoiRef.current) onCloseRef.current(); }
    document.addEventListener('keydown', esc);
    return () => {
      controller.abort();
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [voyage.id]);

  const selection = useMemo(() => departs.find((d) => String(d.id) === departureId), [departs, departureId]);
  const maxPlaces = Math.min(6, selection?.disponibles ?? 0);
  const total = voyage.prix * people;

  async function confirmer(event) {
    event.preventDefault();
    if (!selection || !Number.isInteger(people) || people < 1 || people > maxPlaces || envoi) return;
    setEnvoi(true);
    setErreur('');
    try {
      const result = await reserverVoyage({ departure_id: selection.id, people, request_key: requestKey });
      setReservation(result);
    } catch (err) {
      setErreur(err.message);
      // Une réponse 409 de disponibilité signifie qu'un nouveau choix est nécessaire.
      // Une erreur réseau conserve la même clé pour rendre la nouvelle tentative idempotente.
      if (err.message.includes('plus disponible')) {
        setRequestKey(crypto.randomUUID());
        try {
          const updated = await recupererDeparts(voyage.id);
          setDeparts(updated);
          setDepartureId(String(updated.find((d) => d.disponibles > 0)?.id ?? ''));
          setPeople(1);
        } catch { /* Le message principal reste visible. */ }
      }
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="reservation-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !envoi) onClose(); }}>
      <section className="reservation-card" role="dialog" aria-modal="true" aria-labelledby="reservation-title">
        <button type="button" className="reservation-close" onClick={onClose} aria-label="Fermer" disabled={envoi}><X size={20} /></button>
        <span className="auth-kicker">AMJD TOURISME · RÉSERVATION</span>
        {reservation ? (
          <div className="reservation-success" role="status">
            <CheckCircle2 size={45} />
            <h2 id="reservation-title">Demande enregistrée !</h2>
            <p>Votre demande de réservation est en attente de confirmation par l'agence.</p>
            <div className="reservation-summary">
              <strong>{reservation.reference}</strong>
              <span>{reservation.voyage}</span>
              <span>Départ : {dateFr(reservation.date_depart)}</span>
              <span>{reservation.personnes} personne(s) — {reservation.total.toLocaleString('fr-FR')} €</span>
            </div>
            <button type="button" className="button button-primary reservation-submit" onClick={onViewReservations}>Voir mes réservations</button>
          </div>
        ) : (
          <>
            <h2 id="reservation-title">Réserver votre voyage</h2>
            <p className="reservation-subtitle">{voyage.titre} — {voyage.ville}, {voyage.pays}</p>
            {chargement ? <p role="status">Chargement des dates de départ…</p> : (
              <form onSubmit={confirmer} className="reservation-form">
                <label className="auth-field">
                  <span><CalendarDays size={16} /> Date de départ</span>
                  <select value={departureId} onChange={(e) => { setDepartureId(e.target.value); setPeople(1); setRequestKey(crypto.randomUUID()); }} required>
                    <option value="">Choisir un départ</option>
                    {departs.map((d) => (
                      <option key={d.id} value={d.id} disabled={d.disponibles === 0}>
                        {dateFr(d.date)} — {d.disponibles === 0 ? 'Complet' : `${d.disponibles} place(s)`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="auth-field">
                  <span><Users size={16} /> Nombre de participants (1 à 6)</span>
                  <input type="number" min="1" max={maxPlaces || 1} value={people} onChange={(e) => { setPeople(Number(e.target.value)); setRequestKey(crypto.randomUUID()); }} disabled={!selection || maxPlaces === 0} required />
                </label>
                <div className="reservation-total"><span>Prix indicatif total</span><strong>{total.toLocaleString('fr-FR')} €</strong></div>
                <p className="reservation-disclaimer">Données fictives. Demande sans paiement. Le montant définitif est calculé par le serveur.</p>
                {departs.length === 0 && <p className="reservation-empty">Aucun départ programmé pour ce voyage.</p>}
                {erreur && <p className="auth-error" role="alert">{erreur}</p>}
                <button type="submit" className="button button-primary reservation-submit" disabled={!selection || maxPlaces === 0 || envoi || people < 1 || people > maxPlaces}>
                  <TicketCheck size={17} /> {envoi ? 'Enregistrement…' : 'Envoyer ma demande'}
                </button>
              </form>
            )}
            {chargement && erreur && <p className="auth-error" role="alert">{erreur}</p>}
          </>
        )}
      </section>
    </div>
  );
}

export default ReservationModal;
