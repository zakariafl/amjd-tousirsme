import { ArrowRight } from 'lucide-react';

function SectionHeading({ eyebrow, titre, description, action }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{titre}</h2>
        <p>{description}</p>
      </div>
      {action && <a className="text-link" href="#voyages">{action} <ArrowRight size={18} /></a>}
    </div>
  );
}

export default SectionHeading;
