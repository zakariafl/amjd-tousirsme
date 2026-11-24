import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { destinations } from './data/voyages';
import { recupererVoyages } from './services/api';
import { recupererUtilisateur } from './services/authApi';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import AccountPanel from './components/AccountPanel';
import ReservationModal from './components/ReservationModal';
import Hero from './components/Hero';
import RechercheVoyages from './components/RechercheVoyages';
import SectionHeading from './components/SectionHeading';
import DestinationCard from './components/DestinationCard';
import VoyageCard from './components/VoyageCard';
import ModalVoyage from './components/ModalVoyage';
import Avantages from './components/Avantages';
import Contact from './components/Contact';
import Footer from './components/Footer';
import './App.css';
import './styles/auth.css';
import './styles/reservations.css';
import './styles/admin.css';

function App() {
  const [utilisateur, setUtilisateur] = useState(null);
  const [sessionEnChargement, setSessionEnChargement] = useState(true);
  const [authOuverte, setAuthOuverte] = useState(false);
  const [compteOuvert, setCompteOuvert] = useState(false);
  const [voyageAReserver, setVoyageAReserver] = useState(null);
  const [voyageApresConnexion, setVoyageApresConnexion] = useState(null);

  useEffect(() => {
    let active = true;
    recupererUtilisateur()
      .then((data) => { if (active) setUtilisateur(data); })
      .catch((error) => { if (active) console.error('Session :', error.message); })
      .finally(() => { if (active) setSessionEnChargement(false); });
    return () => { active = false; };
  }, []);

  function ouvrirCompte() {
    if (utilisateur) setCompteOuvert(true);
    else setAuthOuverte(true);
  }

  function apresConnexion(data) {
    setUtilisateur(data);
    setAuthOuverte(false);
    if (voyageApresConnexion) {
      setVoyageAReserver(voyageApresConnexion);
      setVoyageApresConnexion(null);
      setCompteOuvert(false);
    } else {
      setCompteOuvert(true);
    }
  }

  function apresDeconnexion() {
    setUtilisateur(null);
    setCompteOuvert(false);
    setVoyageAReserver(null);
  }

  function commencerReservation(voyage) {
    setVoyageSelectionne(null);
    setCompteOuvert(false);
    if (!utilisateur) {
      setVoyageApresConnexion(voyage);
      setAuthOuverte(true);
    } else {
      setVoyageAReserver(voyage);
    }
  }

  function voirMesReservations() {
    setVoyageAReserver(null);
    setCompteOuvert(true);
  }

  const [voyages, setVoyages] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setChargement(true);
    setErreur('');
    recupererVoyages(controller.signal)
      .then((data) => setVoyages(data))
      .catch((error) => {
        if (error.name !== 'AbortError') setErreur(error.message);
      })
      .finally(() => { if (!controller.signal.aborted) setChargement(false); });
    return () => controller.abort();
  }, [tentative]);

  const [recherche, setRecherche] = useState('');
  const [pays, setPays] = useState('');
  const [budget, setBudget] = useState('');
  const [voyageSelectionne, setVoyageSelectionne] = useState(null);

  const resultats = useMemo(() => voyages.filter((voyage) => {
    const texte = `${voyage.titre} ${voyage.ville} ${voyage.pays} ${voyage.categorie}`.toLocaleLowerCase('fr');
    const correspondRecherche = texte.includes(recherche.trim().toLocaleLowerCase('fr'));
    const correspondPays = !pays || voyage.pays === pays;
    const correspondBudget = !budget || (budget === 'moins-700' && voyage.prix < 700) || (budget === '700-1200' && voyage.prix >= 700 && voyage.prix <= 1200) || (budget === 'plus-1200' && voyage.prix > 1200);
    return correspondRecherche && correspondPays && correspondBudget;
  }), [voyages, recherche, pays, budget]);

  function explorer() { document.querySelector('#voyages')?.scrollIntoView({ behavior: 'smooth' }); }
  function choisirDestination(nom) {
    setRecherche(nom);
    setPays('');
    setBudget('');
    explorer();
  }
  function reinitialiser() { setRecherche(''); setPays(''); setBudget(''); }

  return (
    <>
      <Header utilisateur={utilisateur} compteEnChargement={sessionEnChargement} onCompte={ouvrirCompte} />
      <main>
        <Hero onExplorer={explorer} />
        <RechercheVoyages voyages={voyages} recherche={recherche} setRecherche={setRecherche} pays={pays} setPays={setPays} budget={budget} setBudget={setBudget} />
        <section id="destinations" className="section destinations-section container">
          <SectionHeading eyebrow="Cap sur l'évasion" titre="Des lieux qui font rêver" description="Choisissez une destination et laissez-vous inspirer." action="Voir tous les voyages" />
          <div className="destinations-grid">{destinations.map((destination) => <DestinationCard key={destination.nom} destination={destination} onSelect={choisirDestination} />)}</div>
        </section>
        <section id="voyages" className="section trips-section container">
          <SectionHeading eyebrow="Nos inspirations voyage" titre="Votre prochain départ commence ici" description="Parcourez les séjours et trouvez l'expérience qui vous ressemble." />
          <div className="trips-toolbar"><span><strong>{resultats.length}</strong> voyage{resultats.length > 1 ? 's' : ''} trouvé{resultats.length > 1 ? 's' : ''}</span><span className="demo-notice">Offres et prix fictifs pour démonstration</span></div>
          {chargement ? (
            <div className="empty-state" role="status"><h3>Chargement des voyages…</h3><p>Récupération depuis l’API PHP.</p></div>
          ) : erreur ? (
            <div className="empty-state" role="alert"><h3>Impossible de charger les voyages</h3><p>{erreur}</p><button type="button" className="button button-primary" onClick={() => setTentative((n) => n + 1)}>Réessayer</button></div>
          ) : resultats.length ? (
            <div className="trips-grid">{resultats.map((voyage) => <VoyageCard key={voyage.id} voyage={voyage} onDetails={setVoyageSelectionne} />)}</div>
          ) : (
            <div className="empty-state"><Search size={33} /><h3>Aucun voyage trouvé</h3><p>Essayez une autre destination ou un autre budget.</p><button type="button" className="button button-primary" onClick={reinitialiser}>Réinitialiser les filtres</button></div>
          )}
        </section>
        <Avantages />
        <Contact />
      </main>
      <Footer />
      <ModalVoyage voyage={voyageSelectionne} onClose={() => setVoyageSelectionne(null)} onReserve={commencerReservation} />
      {voyageAReserver && utilisateur && <ReservationModal voyage={voyageAReserver} onClose={() => setVoyageAReserver(null)} onViewReservations={voirMesReservations} />}
      {authOuverte && <AuthModal onClose={() => { setAuthOuverte(false); setVoyageApresConnexion(null); }} onAuthenticated={apresConnexion} />}
      {compteOuvert && utilisateur && <AccountPanel utilisateur={utilisateur} onClose={() => setCompteOuvert(false)} onLogout={apresDeconnexion} />}
    </>
  );
}

export default App;
