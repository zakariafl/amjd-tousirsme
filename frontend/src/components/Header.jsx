import { useState } from 'react';
import { ArrowRight, Compass, Menu, UserRound, X } from 'lucide-react';

function Header({ utilisateur, compteEnChargement, onCompte }) {
  const [menuOuvert, setMenuOuvert] = useState(false);
  const liens = [
    { label: 'Accueil', href: '#accueil' },
    { label: 'Destinations', href: '#destinations' },
    { label: 'Nos voyages', href: '#voyages' },
    { label: 'Pourquoi nous ?', href: '#avantages' },
  ];

  function ouvrirCompte() {
    setMenuOuvert(false);
    onCompte();
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <a className="brand" href="#accueil" aria-label="AMJD Tourisme - Accueil" onClick={() => setMenuOuvert(false)}>
          <span className="brand-symbol"><Compass size={24} strokeWidth={2.2} /></span>
          <span className="brand-text">AMJD<span>TOURISME</span></span>
        </a>
        <nav className={`main-nav ${menuOuvert ? 'nav-open' : ''}`} aria-label="Navigation principale">
          {liens.map((lien) => (
            <a key={lien.href} href={lien.href} onClick={() => setMenuOuvert(false)}>{lien.label}</a>
          ))}
          <button className="nav-account-mobile" type="button" onClick={ouvrirCompte} disabled={compteEnChargement}>
            <UserRound size={17} /> {utilisateur ? `Mon compte (${utilisateur.name})` : 'Connexion / Inscription'}
          </button>
          <a className="nav-contact-mobile" href="#contact" onClick={() => setMenuOuvert(false)}>Nous contacter</a>
        </nav>
        <div className="nav-actions">
          <button type="button" className="account-trigger" onClick={ouvrirCompte} disabled={compteEnChargement}>
            <UserRound size={17} /> <span>{utilisateur ? 'Mon compte' : 'Connexion'}</span>
          </button>
          <a href="#contact" className="button button-primary nav-contact">Nous contacter <ArrowRight size={16} /></a>
        </div>
        <button className="menu-toggle" type="button" aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOuvert} onClick={() => setMenuOuvert(!menuOuvert)}>
          {menuOuvert ? <X size={25} /> : <Menu size={25} />}
        </button>
      </div>
    </header>
  );
}

export default Header;
