import { ArrowRight, Check, Sparkles } from 'lucide-react';

function Hero({ onExplorer }) {
  return (
    <section id="accueil" className="hero">
      <div className="hero-overlay" />
      <div className="container hero-content">
        <span className="hero-eyebrow"><Sparkles size={15} /> Le monde vous attend</span>
        <h1>Vos plus belles histoires<br />commencent <em>ici.</em></h1>
        <p>Des destinations inspirantes, des expériences mémorables et des voyages pensés pour vous.</p>
        <button type="button" className="button button-white" onClick={onExplorer}>Explorer les voyages <ArrowRight size={18} /></button>
        <div className="hero-highlights" aria-label="Points forts">
          <span><Check size={15} /> Inspiration voyage</span>
          <span><Check size={15} /> Séjours variés</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
