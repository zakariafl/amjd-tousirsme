import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { connexion, inscription } from '../services/authApi';

function AuthModal({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('input')?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialog.current?.querySelectorAll('button:not(:disabled), input:not(:disabled)') ?? []);
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await connexion({ email, password })
        : await inscription({ name, email, password });
      onAuthenticated(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function changerMode() {
    setMode((old) => old === 'login' ? 'register' : 'login');
    setError('');
    setPassword('');
  }

  return (
    <div className="auth-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section ref={dialog} className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" type="button" aria-label="Fermer" onClick={onClose}><X size={20} /></button>
        <div className="auth-symbol"><LockKeyhole size={24} /></div>
        <span className="auth-kicker">AMJD TOURISME</span>
        <h2 id="auth-title">{mode === 'login' ? 'Heureux de vous revoir' : 'Créer votre compte'}</h2>
        <p className="auth-subtitle">{mode === 'login' ? 'Connectez-vous à votre espace personnel.' : 'Inscrivez-vous pour préparer vos prochains voyages.'}</p>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <label className="auth-field"><span><UserRound size={16} /> Nom complet</span>
              <input autoComplete="name" type="text" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} placeholder="Ex. Salma Karim" required />
            </label>
          )}
          <label className="auth-field"><span><Mail size={16} /> Adresse email</span>
            <input autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={190} placeholder="exemple@email.com" required />
          </label>
          <label className="auth-field"><span><LockKeyhole size={16} /> Mot de passe</span>
            <span className="auth-password-wrap">
              <input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={visible ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === 'register' ? 12 : undefined} required placeholder={mode === 'register' ? '12 caractères minimum' : 'Votre mot de passe'} />
              <button type="button" aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setVisible((old) => !old)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </label>
          {mode === 'register' && <p className="auth-hint">Utilisez une phrase de passe de 12 caractères minimum (72 octets maximum).</p>}
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={loading}>
            {loading ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
          <button type="button" onClick={changerMode} disabled={loading}>{mode === 'login' ? "S'inscrire" : 'Se connecter'}</button>
        </p>
      </section>
    </div>
  );
}

export default AuthModal;
