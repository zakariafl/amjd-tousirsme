import { ArrowRight } from 'lucide-react';

function DestinationCard({ destination, onSelect }) {
  return (
    <button className="destination-card" type="button" onClick={() => onSelect(destination.nom)} aria-label={`Voir les voyages à ${destination.nom}`}>
      <img loading="lazy" src={destination.image} alt={`Paysage de ${destination.nom}`} />
      <div className="destination-shade" />
      <div className="destination-info">
        <span>{destination.pays}</span>
        <h3>{destination.nom}</h3>
        <p>{destination.texte}</p>
      </div>
      <span className="destination-arrow"><ArrowRight size={20} /></span>
    </button>
  );
}

export default DestinationCard;
