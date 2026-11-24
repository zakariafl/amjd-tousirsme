import { useEffect, useState } from 'react';
import {
  BarChart3, CalendarPlus, CheckCircle, Edit3, Eye, EyeOff, Plus, RefreshCw,
  Save, XCircle,
} from 'lucide-react';
import {
  CartesianGrid, Legend, Line, LineChart, BarChart, Bar,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  chargerDashboard, listerVoyagesAdmin, listerDestinationsAdmin,
  ajouterDestinationAdmin, creerVoyageAdmin, modifierVoyageAdmin,
  publierVoyageAdmin, listerDepartsAdmin, creerDepartAdmin,
} from '../services/adminApi';

const formatEUR = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const formVide = { title: '', destination_id: '', duration_days: 7, price_eur: '', category: 'Circuit',
  badge: '', image_url: '', description: '', included_services: '' };

function CarteKpi({ label, value, note }) {
  return <div className="admin6-kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Analytics({ stats }) {
  if (!stats) return <p>Aucune donnée statistique disponible.</p>;
  const monthly = stats.evolution_mensuelle.map((m) => ({ ...m,
    libelle: new Date(`${m.mois}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }) }));
  return <>
    <div className="admin6-kpis">
      <CarteKpi label="Clients" value={stats.clients} note="Comptes client" />
      <CarteKpi label="Voyages publiés" value={stats.voyages_publies} note="Visibles sur le site" />
      <CarteKpi label="Réservations" value={stats.reservations} note="Toutes demandes confondues" />
      <CarteKpi label="Valeur confirmée" value={formatEUR(stats.valeur_confirmee_eur)} note="Aucun paiement enregistré" />
    </div>
    <div className="admin6-status-row">
      <div><span className="admin6-dot admin6-wait" /> En attente <strong>{stats.statuts.pending.nombre}</strong></div>
      <div><span className="admin6-dot admin6-confirm" /> Confirmées <strong>{stats.statuts.confirmed.nombre}</strong></div>
      <div><span className="admin6-dot admin6-cancel" /> Annulées <strong>{stats.statuts.cancelled.nombre}</strong></div>
      <div>Départs futurs ouverts <strong>{stats.departures_future}</strong></div>
    </div>
    <div className="admin6-chart-grid">
      <section className="admin6-chart">
        <h4>Évolution des demandes</h4>
        <p>Sur les six derniers mois, selon la date de création</p>
        <div className="admin6-chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ top: 10, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e6eeee" />
              <XAxis dataKey="libelle" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="demandes" name="Demandes" stroke="#067c82" strokeWidth={3} />
              <Line type="monotone" dataKey="confirmees" name="Confirmées" stroke="#d29e36" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="admin6-chart">
        <h4>Destinations populaires</h4>
        <p>Voyageurs sur réservations confirmées</p>
        {stats.top_destinations.length === 0 ? <p className="admin6-muted">Aucune réservation confirmée.</p> :
          <div className="admin6-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.top_destinations.map(d => ({ ...d, label: d.destination.split(',')[0] }))}
                layout="vertical" margin={{ top: 8, right: 12, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6eeee" />
                <XAxis type="number" allowDecimals={false} fontSize={11} />
                <YAxis type="category" dataKey="label" width={78} fontSize={11} />
                <Tooltip />
                <Bar dataKey="voyageurs" name="Voyageurs" fill="#078b83" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>}
      </section>
    </div>
    <p className="admin6-notice">La « valeur confirmée » correspond au total des réservations confirmées, pas à un chiffre d'affaires encaissé. Les offres de cette démo sont fictives.</p>
  </>;
}

function VoyageForm({ initial, destinations, busy, onSubmit, onCancel }) {
  const [form, setForm] = useState(() => initial ? {
    ...initial, included_services: (initial.included_services || []).join(', '),
  } : { ...formVide, destination_id: destinations[0]?.id ?? '' });
  function change(key, value) { setForm(old => ({ ...old, [key]: value })); }
  function submit(event) {
    event.preventDefault();
    onSubmit({
      title: form.title.trim(), destination_id: Number(form.destination_id),
      duration_days: Number(form.duration_days), price_eur: Number(form.price_eur),
      category: form.category.trim(), badge: form.badge.trim(), image_url: form.image_url.trim(),
      description: form.description.trim(),
      included_services: form.included_services.split(',').map(s => s.trim()).filter(Boolean),
    });
  }
  return <form className="admin6-form" onSubmit={submit}>
    <div className="admin6-form-title"><strong>{initial ? `Modifier le voyage #${initial.id}` : 'Ajouter un voyage'}</strong>
      <button type="button" onClick={onCancel} aria-label="Fermer le formulaire"><XCircle size={18} /></button></div>
    <label>Titre du voyage<input required minLength={4} maxLength={180} value={form.title} onChange={e => change('title', e.target.value)} /></label>
    <div className="admin6-two">
      <label>Destination<select required value={form.destination_id} onChange={e => change('destination_id', e.target.value)}>
        <option value="" disabled>Choisir une destination</option>
        {destinations.map(d => <option key={d.id} value={d.id}>{d.city}, {d.country}</option>)}
      </select></label>
      <label>Catégorie<input required maxLength={80} value={form.category} onChange={e => change('category', e.target.value)} /></label>
      <label>Prix (€) par personne<input required type="number" min="0" max="100000" step="0.01" value={form.price_eur} onChange={e => change('price_eur', e.target.value)} /></label>
      <label>Durée (jours)<input required type="number" min="1" max="90" value={form.duration_days} onChange={e => change('duration_days', e.target.value)} /></label>
    </div>
    <label>URL de l'image (HTTPS)<input required type="url" placeholder="https://..." value={form.image_url} onChange={e => change('image_url', e.target.value)} /></label>
    <label>Badge (facultatif)<input maxLength={80} value={form.badge} onChange={e => change('badge', e.target.value)} /></label>
    <label>Description<textarea required rows={3} minLength={10} maxLength={1500} value={form.description} onChange={e => change('description', e.target.value)} /></label>
    <label>Services inclus (séparés par des virgules)<input placeholder="Hôtel, Transport, Petit-déjeuner" value={form.included_services} onChange={e => change('included_services', e.target.value)} /></label>
    <div className="admin6-form-actions"><button className="admin6-btn" type="submit" disabled={busy || !destinations.length}><Save size={16} /> {initial ? 'Enregistrer' : 'Créer le brouillon'}</button>
      <button type="button" className="admin6-btn-light" onClick={onCancel}>Annuler</button></div>
    {!initial && <p className="admin6-hint">Un nouveau voyage est créé en brouillon. Ajoute un départ, puis publie-le.</p>}
  </form>;
}

function VoyagesAdmin({ voyages, destinations, busy, onRefresh, onError, onMessage }) {
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [newDestination, setNewDestination] = useState({ city: '', country: '' });
  const [departureTrip, setDepartureTrip] = useState(null);
  const [departures, setDepartures] = useState([]);
  const [date, setDate] = useState('');
  const [capacity, setCapacity] = useState(12);
  const [saving, setSaving] = useState(false);

  async function action(work, message, { refresh = true } = {}) {
    setSaving(true); onError(''); onMessage('');
    try { await work(); if (refresh) await onRefresh(); onMessage(message); return true; }
    catch (e) { onError(e.message); return false; }
    finally { setSaving(false); }
  }
  async function save(input) {
    const ok = await action(() => editing ? modifierVoyageAdmin(editing.id, input) : creerVoyageAdmin(input),
      editing ? 'Voyage modifié.' : 'Voyage créé en brouillon. Ajoutez un départ puis publiez-le.');
    if (ok) { setEditing(null); setFormOpen(false); }
  }
  async function toggle(v) {
    if (v.published && !window.confirm('Archiver ce voyage ? Il sera masqué du catalogue public. Les réservations seront conservées.')) return;
    await action(() => publierVoyageAdmin(v.id, !v.published), v.published ? 'Voyage archivé.' : 'Voyage publié.');
  }
  async function addDestination(event) {
    event.preventDefault();
    const ok = await action(() => ajouterDestinationAdmin(newDestination), 'Destination ajoutée.');
    if (ok) setNewDestination({ city: '', country: '' });
  }
  async function openDepartures(v) {
    setDepartureTrip(v); setDepartures([]); onError(''); setDate('');
    try { setDepartures(await listerDepartsAdmin(v.id)); }
    catch (e) { onError(e.message); }
  }
  async function addDeparture(event) {
    event.preventDefault();
    const ok = await action(() => creerDepartAdmin(departureTrip.id,
      { departure_date: date, capacity: Number(capacity) }), 'Départ ajouté.');
    if (ok) { setDepartures(await listerDepartsAdmin(departureTrip.id)); setDate(''); }
  }
  return <>
    <div className="admin6-tools">
      <div><strong>Gestion du catalogue</strong><p>Les voyages archivés restent dans MySQL pour préserver l'historique.</p></div>
      <button type="button" className="admin6-btn" onClick={() => { setEditing(null); setFormOpen(true); setDepartureTrip(null); }}><Plus size={17} /> Ajouter un voyage</button>
    </div>
    <form className="admin6-add-destination" onSubmit={addDestination}>
      <span>Ajouter une destination :</span>
      <input aria-label="Ville" required placeholder="Ville" maxLength={120} value={newDestination.city} onChange={e => setNewDestination(s => ({ ...s, city: e.target.value }))} />
      <input aria-label="Pays" required placeholder="Pays" maxLength={120} value={newDestination.country} onChange={e => setNewDestination(s => ({ ...s, country: e.target.value }))} />
      <button type="submit" disabled={busy || saving}>Ajouter</button>
    </form>
    {formOpen && <VoyageForm key={editing?.id ?? 'create'} initial={editing} destinations={destinations} busy={saving} onSubmit={save}
      onCancel={() => { setFormOpen(false); setEditing(null); }} />}
    <div className="admin6-table-wrap"><table className="admin6-table"><thead><tr><th>Voyage</th><th>Destination</th><th>Prix</th><th>Départs</th><th>Statut</th><th>Actions</th></tr></thead>
      <tbody>{voyages.map(v => <tr key={v.id}>
        <td><strong>{v.title}</strong><small>#{v.id} · {v.duration_days} jours</small></td><td>{v.city}, {v.country}</td>
        <td>{formatEUR(v.price_eur)}</td><td>{v.departures_count}</td>
        <td><span className={`admin6-pill ${v.published ? 'is-public' : 'is-draft'}`}>{v.published ? 'Publié' : 'Archivé / brouillon'}</span></td>
        <td><div className="admin6-actions">
          <button type="button" disabled={saving} onClick={() => { setEditing(v); setFormOpen(true); setDepartureTrip(null); }} title="Modifier"><Edit3 size={16} /></button>
          <button type="button" disabled={saving} onClick={() => openDepartures(v)} title="Départs"><CalendarPlus size={17} /></button>
          <button type="button" disabled={saving} onClick={() => toggle(v)} title={v.published ? 'Archiver' : 'Publier'}>{v.published ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div></td>
      </tr>)}</tbody></table></div>
    {!voyages.length && <p className="admin6-muted">Aucun voyage pour le moment.</p>}
    {departureTrip && <section className="admin6-departures">
      <div className="admin6-form-title"><strong>Départs — {departureTrip.title}</strong><button type="button" onClick={() => setDepartureTrip(null)}><XCircle size={18} /></button></div>
      <form onSubmit={addDeparture} className="admin6-add-destination">
        <label>Date de départ<input type="date" required min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>Capacité<input type="number" required min={1} max={200} value={capacity} onChange={e => setCapacity(e.target.value)} /></label>
        <button type="submit" disabled={saving}>Ajouter un départ</button>
      </form>
      {departures.length === 0 ? <p className="admin6-muted">Aucun départ défini.</p> :
        <div className="admin6-table-wrap"><table className="admin6-table"><thead><tr><th>Date</th><th>Places libres</th><th>Capacité</th><th>Statut</th></tr></thead>
          <tbody>{departures.map(d => <tr key={d.id}><td>{d.date}</td><td>{d.available}</td><td>{d.capacity}</td><td>{d.status}</td></tr>)}</tbody></table></div>}
    </section>}
  </>;
}

export default function AdminDashboard({ refreshVersion = 0 }) {
  const [tab, setTab] = useState('analytics');
  const [stats, setStats] = useState(null);
  const [voyages, setVoyages] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  async function reload() {
    const [dashboard, trips, destinationsData] = await Promise.all([
      chargerDashboard(), listerVoyagesAdmin(), listerDestinationsAdmin(),
    ]);
    setStats(dashboard); setVoyages(trips); setDestinations(destinationsData);
  }
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([chargerDashboard(), listerVoyagesAdmin(), listerDestinationsAdmin()])
      .then(([a, b, c]) => { if (alive) { setStats(a); setVoyages(b); setDestinations(c); setError(''); } })
      .catch(e => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [refreshVersion, refresh]);
  return <section className="admin6" aria-label="Administration et analytics">
    <div className="admin6-head"><div><h3><BarChart3 size={21} /> Tableau de bord administrateur</h3><p>Les indicateurs proviennent de ta base MySQL.</p></div>
      <button type="button" className="admin6-refresh" disabled={loading} onClick={() => setRefresh(v => v + 1)}><RefreshCw size={16} /> Actualiser</button></div>
    <div className="admin6-tabs" role="tablist" aria-label="Section d'administration">
      <button type="button" role="tab" aria-selected={tab === 'analytics'} className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>Analytics</button>
      <button type="button" role="tab" aria-selected={tab === 'voyages'} className={tab === 'voyages' ? 'active' : ''} onClick={() => setTab('voyages')}>Gestion des voyages</button>
    </div>
    {error && <div role="alert" className="admin6-error">{error}</div>}
    {message && <div role="status" className="admin6-success"><CheckCircle size={16} /> {message}</div>}
    {loading ? <p className="admin6-muted">Chargement de l'administration…</p>
      : tab === 'analytics' ? <Analytics stats={stats} />
        : <VoyagesAdmin voyages={voyages} destinations={destinations} onRefresh={reload} onError={setError} onMessage={setMessage} busy={loading} />}
  </section>;
}
