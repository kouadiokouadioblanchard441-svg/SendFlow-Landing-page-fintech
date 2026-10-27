import { ArrowRight, Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import sendflowMark from "./assets/sendflow-mark.png";
import sendflowWordmark from "./assets/sendflow-wordmark.png";
import "./_group.css";

const links = [
  "Accueil",
  "Fonctionnalités",
  "Comment ça marche",
  "International",
  "Sécurité",
  "À propos",
];
function BrandLockup() {
  return (
    <span className="sf-menu-preview-logo">
      <img
        className="sf-menu-preview-logo-mark"
        src={sendflowMark}
        alt=""
      />
      <img
        className="sf-menu-preview-logo-wordmark"
        src={sendflowWordmark}
        alt="SendFlow"
      />
    </span>
  );
}

export function Current() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="sf-menu-preview">
      <header className="sf-menu-preview-header">
        <BrandLockup />
        <button
          aria-label="Ouvrir le menu"
          className="sf-menu-preview-trigger"
          onClick={() => setIsOpen(true)}
          type="button"
        >
          <Menu size={21} />
        </button>
      </header>
      <section className="sf-menu-preview-copy">
        <p>SendFlow</p>
        <h1>L’argent circule. Les réseaux aussi.</h1>
        <span>
          Une expérience plus claire pour les transferts entre réseaux de
          paiement.
        </span>
      </section>
      {isOpen && (
        <div
          aria-label="Fond du menu"
          className="sf-menu-preview-backdrop"
          onClick={() => setIsOpen(false)}
        >
          <aside
            aria-label="Menu principal"
            className="sf-menu-current-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="sf-menu-current-top">
              <BrandLockup />
              <button
                aria-label="Fermer le menu"
                className="sf-menu-preview-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={19} />
              </button>
            </div>
            <nav aria-label="Navigation principale" className="sf-menu-current-nav">
              {links.map((link) => (
                <a href="#" key={link} onClick={(event) => event.preventDefault()}>
                  {link}
                </a>
              ))}
            </nav>
            <button className="sf-menu-current-language" type="button">
              <span aria-hidden="true">🇬🇧</span>
              Passer en anglais
              <Globe2 size={15} />
            </button>
            <a className="sf-menu-current-download" href="#">
              Télécharger l’application <ArrowRight size={16} />
            </a>
          </aside>
        </div>
      )}
    </main>
  );
}
