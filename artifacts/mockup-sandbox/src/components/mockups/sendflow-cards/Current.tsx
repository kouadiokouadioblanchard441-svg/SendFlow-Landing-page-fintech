import { ArrowRight } from 'lucide-react';
import crossNetworkIcon from './assets/sendflow-icon-cross-network.svg';
import internationalIcon from './assets/sendflow-icon-international-transfer.svg';
import momoMtnOperatorLogo from './assets/operator-logo-momo-mtn.png';
import waveOperatorLogo from './assets/operator-logo-03.png';
import mixxByYasOperatorLogo from './assets/operator-logo-08.png';
import './_group.css';

function ProtectedImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return <img src={src} alt={alt} draggable={false} className={className} />;
}

function TransferRoute({
  destination,
  international = false,
}: {
  destination: 'wave' | 'tmoney';
  international?: boolean;
}) {
  const isTmoney = destination === 'tmoney';
  return (
    <div className="sf-features-card-route" aria-label={international ? 'MTN Côte d’Ivoire vers T-Money Togo' : 'MTN vers Wave'}>
      <div className="sf-features-route-brand">
        <span className="sf-features-route-flag" aria-hidden="true">🇨🇮</span>
        <span className="sf-features-route-logo">
          <ProtectedImage src={momoMtnOperatorLogo} alt="MTN MoMo" />
        </span>
        <small>{international ? 'Côte d’Ivoire' : 'MTN'}</small>
      </div>
      <ArrowRight className="sf-features-route-arrow" size={20} strokeWidth={2.5} aria-hidden="true" />
      <div className="sf-features-route-brand">
        <span className="sf-features-route-flag" aria-hidden="true">{isTmoney ? '🇹🇬' : '🇨🇮'}</span>
        <span className={`sf-features-route-logo ${isTmoney ? 'sf-features-tmoney-logo' : ''}`}>
          {isTmoney ? <ProtectedImage src={mixxByYasOperatorLogo} alt="Mixx by Yas" /> : <ProtectedImage src={waveOperatorLogo} alt="Wave" />}
        </span>
        <small>{isTmoney ? 'Togo' : 'Wave'}</small>
      </div>
    </div>
  );
}

export function Current() {
  return (
    <main className="sf-features-page">
      <section className="sf-features-card-area" aria-label="Fonctionnalités">
        <div className="sf-features-card-grid">
          <article className="sf-features-card">
            <div className="sf-features-card-icon">
              <ProtectedImage src={crossNetworkIcon} alt="" />
            </div>
            <TransferRoute destination="wave" />
            <h2>Transfert inter-réseaux</h2>
            <p>Envoyez de l’argent d’un réseau Mobile Money à un autre, sans demander au bénéficiaire de changer ses habitudes. SendFlow relie les réseaux pour rendre chaque transfert plus simple.</p>
            <span className="sf-features-card-tag">01</span>
          </article>
          <article className="sf-features-card">
            <div className="sf-features-card-icon">
              <ProtectedImage src={internationalIcon} alt="" />
            </div>
            <TransferRoute destination="tmoney" international />
            <h2>Transfert international</h2>
            <p>Envoyez de l’argent à vos proches au-delà des frontières, avec un parcours clair et des informations visibles à chaque étape.</p>
            <span className="sf-features-card-tag">02</span>
          </article>
        </div>
      </section>
    </main>
  );
}
