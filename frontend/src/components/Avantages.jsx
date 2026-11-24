import { BadgeCheck, Compass, Headphones, ShieldCheck } from 'lucide-react';
import SectionHeading from './SectionHeading';

function Avantages() {
  const liste = [
    { icon: Compass, titre: 'Destinations inspirantes', texte: 'Des idées de séjours pour explorer de nouveaux horizons.' },
    { icon: ShieldCheck, titre: 'Expérience rassurante', texte: 'Une interface claire pour préparer votre prochain voyage.' },
    { icon: Headphones, titre: 'À votre écoute', texte: 'Une relation de proximité au cœur du projet.' },
    { icon: BadgeCheck, titre: 'Offres faciles à comparer', texte: 'Des informations réunies au même endroit.' },
  ];
  return (
    <section id="avantages" className="advantages-section">
      <div className="container">
        <SectionHeading eyebrow="Pourquoi AMJD Tourisme" titre="Voyager devient plus simple" description="Une plateforme imaginée pour trouver et comparer les séjours en toute simplicité." />
        <div className="advantages-grid">
          {liste.map(({ icon: Icon, titre, texte }) => <div className="advantage" key={titre}><div className="advantage-icon"><Icon size={25} /></div><h3>{titre}</h3><p>{texte}</p></div>)}
        </div>
      </div>
    </section>
  );
}

export default Avantages;
