import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

function ModalVoyage({ voyage, onClose, onReserve }) {
  useEffect(() => {
    if (!voyage) return;
    function surTouche(event) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', surTouche);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = oldOverflow;
    };
  }, [voyage, onClose]);

  if (!voyage) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="voyage-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fermer"><X size={22} /></button>
        <img src={voyage.image} alt={`Vue de ${voyage.ville}`} className="modal-image" />
        <div className="modal-content">
          <span className="eyebrow">Découvrir le voyage</span>
          <h2 id="modal-title">{voyage.titre}</h2>
          <p>{voyage.description}</p>
          <h3>Exemple de programme</h3>
          <ul className="included-list">{voyage.inclus.map((point) => <li key={point}><Check size={17} /> {point}</li>)}</ul>
          <div className="modal-bottom">
            <div><span className="from-label">Prix indicatif · données fictives</span><strong>{voyage.prix.toLocaleString('fr-FR')} €</strong></div>
            <button className="button button-primary" type="button" onClick={() => onReserve(voyage)}>Réserver ce voyage</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ModalVoyage;
