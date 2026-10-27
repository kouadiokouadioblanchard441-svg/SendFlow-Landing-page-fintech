import { ArrowRight, ChevronRight, Globe2, Menu, X } from "lucide-react";
import { useState } from "react";
import sendflowMark from "./assets/sendflow-mark.png";
import sendflowWordmark from "./assets/sendflow-wordmark.png";
import "./_group.css";

const links = [
  "Accueil",
  "Fonctionnalités",
  "Comment ça marche",
  "Développeur",
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

export function Refined() {
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
            aria-modal="true"
            className="sf-menu-refined-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="sf-menu-refined-top">
              <BrandLockup />
              <button
                aria-label="Fermer le menu"
                className="sf-menu-preview-close sf-menu-refined-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sf-menu-refined-intro">
              <p className="sf-menu-refined-eyebrow">Navigation</p>
              <h2 className="sf-menu-refined-heading">Explorer SendFlow</h2>
            </div>

            <nav aria-label="Navigation principale" className="sf-menu-refined-nav">
              {links.map((link, index) => (
                <a
                  aria-current={index === 0 ? "page" : undefined}
                  className="sf-menu-refined-link"
                  href="#"
                  key={link}
                  onClick={(event) => event.preventDefault()}
                >
                  {link}
                  <ChevronRight aria-hidden="true" size={18} />
                </a>
              ))}
            </nav>

            <div className="sf-menu-refined-footer">
              <button className="sf-menu-refined-language" type="button">
                <span>Langue</span>
                <strong>
                  <Globe2 aria-hidden="true" size={15} />
                  English
                </strong>
              </button>
              <a className="sf-menu-refined-download" href="#">
                Télécharger l’application
                <ArrowRight aria-hidden="true" size={16} />
              </a>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
