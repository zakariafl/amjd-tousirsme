import { Compass } from 'lucide-react';

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div><a className="brand brand-footer" href="#accueil"><span className="brand-symbol"><Compass size={23} /></span><span className="brand-text">AMJD<span>TOURISME</span></span></a><p>Votre prochaine destination commence par une belle idée.</p></div>
        <div className="footer-links"><strong>Navigation</strong><a href="#accueil">Accueil</a><a href="#destinations">Destinations</a><a href="#voyages">Voyages</a></div>
        <div className="footer-links"><strong>Le projet</strong><span>Prototype React + Vite</span><span>API PHP à venir</span><span>Données de démonstration</span></div>
      </div>
      <div className="container footer-bottom"><span>© {new Date().getFullYear()} AMJD Tourisme — Démonstration portfolio.</span><span>Design & développement Full-Stack</span></div>
    </footer>
  );
}

export default Footer;
