import { ArrowRight, CalendarDays, MapPin, Star } from 'lucide-react';

function VoyageCard({ voyage, onDetails }) {
  return (
    <article className="voyage-card">
      <div className="voyage-image-wrap">
        <img loading="lazy" src={voyage.image} alt={`Séjour à ${voyage.ville}`} />
        {voyage.badge && <span className="voyage-badge">{voyage.badge}</span>}
      </div>
      <div className="voyage-body">
        <span className="voyage-location"><MapPin size={14} /> {voyage.ville}, {voyage.pays}</span>
        <h3>{voyage.titre}</h3>
        <div className="voyage-meta">
          <span><CalendarDays size={15} /> {voyage.duree}</span>
          <span className="voyage-review"><Star size={15} fill="currentColor" /> {voyage.note} <span>({voyage.avis})</span></span>
        </div>
        <div className="voyage-footer">
          <div><span className="from-label">À partir de</span><strong>{voyage.prix.toLocaleString('fr-FR')} €</strong><small>/ personne</small></div>
          <button type="button" className="card-action" onClick={() => onDetails(voyage)} aria-label={`Voir les détails du voyage ${voyage.titre}`}><ArrowRight size={20} /></button>
        </div>
      </div>
    </article>
  );
}

export default VoyageCard;
