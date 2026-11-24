import { CalendarDays, ChevronDown, MapPin, Search, SlidersHorizontal } from 'lucide-react';

function RechercheVoyages({ voyages, recherche, setRecherche, pays, setPays, budget, setBudget }) {
  const paysDisponibles = [...new Set(voyages.map((voyage) => voyage.pays))];

  function rechercher(event) {
    event.preventDefault();
    document.querySelector('#voyages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="container search-overlap">
      <form className="search-box" onSubmit={rechercher} role="search">
        <div className="search-label"><SlidersHorizontal size={17} /> Trouvez le voyage qui vous ressemble</div>
        <div className="search-fields">
          <label className="search-field">
            <span><Search size={16} /> Destination</span>
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} type="search" placeholder="Ville ou mot-clé" />
          </label>
          <label className="search-field">
            <span><MapPin size={16} /> Pays</span>
            <span className="select-wrapper">
              <select value={pays} onChange={(e) => setPays(e.target.value)}>
                <option value="">Tous les pays</option>
                {paysDisponibles.map((nom) => <option key={nom} value={nom}>{nom}</option>)}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <label className="search-field">
            <span><CalendarDays size={16} /> Budget</span>
            <span className="select-wrapper">
              <select value={budget} onChange={(e) => setBudget(e.target.value)}>
                <option value="">Tous les budgets</option>
                <option value="moins-700">Moins de 700 €</option>
                <option value="700-1200">700 € à 1 200 €</option>
                <option value="plus-1200">Plus de 1 200 €</option>
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </span>
          </label>
          <button className="button button-primary search-submit" type="submit"><Search size={18} /> Rechercher</button>
        </div>
      </form>
    </div>
  );
}

export default RechercheVoyages;
