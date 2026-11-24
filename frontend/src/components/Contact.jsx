import { ArrowRight } from 'lucide-react';

function Contact() {
  return (
    <section id="contact" className="contact-section">
      <div className="container contact-inner">
        <div><span className="contact-eyebrow">La suite de l'aventure</span><h2>Prêt à rêver de votre prochain voyage ?</h2><p>Découvrez nos destinations et trouvez l'inspiration pour votre prochaine escapade.</p></div>
        <a href="#voyages" className="button button-white">Voir les voyages <ArrowRight size={19} /></a>
      </div>
    </section>
  );
}

export default Contact;
