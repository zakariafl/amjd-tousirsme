import { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, LogOut, ShieldCheck, UserRound, X } from 'lucide-react';
import { deconnexion } from '../services/authApi';
import AdminDashboard from './AdminDashboard';
import { annulerReservation, confirmerReservation, recupererMesReservations, recupererReservationsAdmin } from '../services/reservationApi';

function afficherDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const libelles = { pending: 'En attente', confirmed: 'Confirmée', cancelled: 'Annulée' };

function aujourdHuiLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function BookingRow({ reservation, onCancel, busy, admin = false, onConfirm }) {
  const futur = reservation.date_depart > aujourdHuiLocal();
  return (
    <article className="booking-row">
      <div className="booking-row-head"><strong>{reservation.voyage}</strong><span className={`booking-status booking-status-${reservation.statut}`}>{libelles[reservation.statut]}</span></div>
      <div className="booking-reference">{reservation.reference}</div>
      {admin && <p className="booking-customer">{reservation.client_nom} — {reservation.client_email}</p>}
      <p><CalendarDays size={14} /> {afficherDate(reservation.date_depart)} · {reservation.personnes} personne(s)</p>
      <div className="booking-bottom"><strong>{reservation.total.toLocaleString('fr-FR')} €</strong>
        {admin && reservation.statut === 'pending' && futur && (
          <button type="button" className="booking-action" disabled={busy} onClick={() => onConfirm(reservation.id)}><CheckCircle2 size={15} /> Confirmer</button>
        )}
        {!admin && reservation.statut !== 'cancelled' && futur && (
          <button type="button" className="booking-action booking-cancel" disabled={busy} onClick={() => onCancel(reservation.id)}>Annuler</button>
        )}
      </div>
    </article>
  );
}

function AccountPanel({ utilisateur, onClose, onLogout }) {
  const [dashboardVersion, setDashboardVersion] = useState(0);
  const [mesReservations, setMesReservations] = useState([]);
  const [adminReservations, setAdminReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; previous?.focus?.(); };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    const promises = [recupererMesReservations()];
    if (utilisateur.role === 'admin') promises.push(recupererReservationsAdmin());
    Promise.all(promises).then(([mine, admins]) => {
      if (!alive) return;
      setMesReservations(mine);
      if (admins) setAdminReservations(admins);
    }).catch((err) => { if (alive) setError(err.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [utilisateur.role]);

  async function logout() {
    setBusy(true); setError(''); setMessage('');
    try { await deconnexion(); onLogout(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function annuler(id) {
    if (!window.confirm('Annuler cette réservation et libérer les places ?')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await annulerReservation(id);
      setMesReservations((list) => list.map((r) => r.id === id ? result : r));
      setMessage('Réservation annulée : les places ont été restituées.');
      setDashboardVersion(v => v + 1);
      if (utilisateur.role === 'admin') {
        setAdminReservations((list) => list.map((r) => r.id === id ? { ...r, ...result } : r));
      }
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function confirmer(id) {
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await confirmerReservation(id);
      setAdminReservations((list) => list.map((r) => r.id === id ? { ...r, ...result } : r));
      setMesReservations((list) => list.map((r) => r.id === id ? result : r));
      setMessage('Demande confirmée. Aucun paiement n’a été effectué.');
      setDashboardVersion(v => v + 1);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <section className="account-section" aria-labelledby="account-title" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`account-card account-card-bookings ${utilisateur.role === 'admin' ? 'account-card-admin6' : ''}`} role="dialog" aria-modal="true">
        <button type="button" className="account-close" aria-label="Fermer l'espace personnel" onClick={onClose}><X size={20} /></button>
        <div className="account-top"><span className="auth-symbol"><UserRound size={26} /></span><div>
          <span className="auth-kicker">ESPACE PERSONNEL</span>
          <h2 id="account-title">Bonjour, {utilisateur.name} !</h2>
          <p>{utilisateur.email}</p>
        </div></div>
        <div className="account-role"><ShieldCheck size={17} /> Rôle : {utilisateur.role === 'admin' ? 'Administrateur' : 'Client'}</div>
        {utilisateur.role === 'admin' && <AdminDashboard refreshVersion={dashboardVersion} />}
        <div className="booking-section">
          <h3><CalendarDays size={19} /> Mes réservations</h3>
          {loading ? <p>Chargement des réservations…</p> : mesReservations.length === 0 ? <p className="booking-empty">Aucune réservation pour le moment. Découvrez nos voyages pour commencer.</p> : (
            <div className="booking-list">{mesReservations.map((r) => <BookingRow key={r.id} reservation={r} busy={busy} onCancel={annuler} />)}</div>
          )}
        </div>
        {utilisateur.role === 'admin' && (
          <div className="booking-section booking-admin">
            <h3><CheckCircle2 size={19} /> Demandes des clients</h3>
            <p>Les nouvelles demandes sont en attente jusqu'à leur confirmation. Aucun paiement n'est traité.</p>
            {!loading && adminReservations.length === 0 && <p className="booking-empty">Aucune réservation client.</p>}
            <div className="booking-list">{adminReservations.map((r) => <BookingRow key={r.id} reservation={r} admin busy={busy} onConfirm={confirmer} />)}</div>
          </div>
        )}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {message && <p className="booking-message" role="status">{message}</p>}
        <button type="button" className="button account-logout" disabled={busy} onClick={logout}><LogOut size={17} /> {busy ? 'Veuillez patienter…' : 'Se déconnecter'}</button>
      </div>
    </section>
  );
}

export default AccountPanel;
