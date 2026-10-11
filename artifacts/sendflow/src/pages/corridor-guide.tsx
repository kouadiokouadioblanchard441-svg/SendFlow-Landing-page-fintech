import { useState } from 'react';
import { useSeo } from '@/lib/seo';
import { getLocaleFromPath, getLocalizedPath } from '@/lib/localized-routes';

const content = {
  fr: {
    title: 'Envoyer de l’argent de la France au Sénégal',
    description: 'Préparez un transfert de la France vers le Sénégal. Vérifiez frais, délais, conversion et réseaux Mobile Money disponibles avant confirmation.',
    intro: 'Ce guide explique les points à vérifier avant un transfert entre la France et le Sénégal. Les options dépendent des services effectivement disponibles pour votre compte et votre parcours.',
    fees: 'Les frais peuvent dépendre du montant, du mode de paiement, de la conversion monétaire et du réseau de réception. Avant toute confirmation, vérifiez le coût total et le montant que le bénéficiaire recevra dans le parcours proposé.',
    timing: 'Le délai dépend notamment des vérifications, du mode de paiement et du partenaire qui effectue le versement. Utilisez uniquement l’estimation affichée pour votre transfert ; elle ne constitue pas une garantie universelle.',
    networks: 'Wave, Orange Money et d’autres réseaux Mobile Money peuvent être recherchés par les utilisateurs, mais leur disponibilité varie selon le pays, le partenaire et le parcours. Ne considérez un réseau comme disponible que s’il apparaît dans le choix de réception du transfert.',
    safety: 'Avant d’envoyer, vérifiez l’identité du bénéficiaire, le numéro ou compte de réception, les frais, le taux de conversion et le montant final. Ne communiquez jamais votre mot de passe ou code de validation.',
    faq: [
      ['Quels frais prévoir pour un transfert de la France vers le Sénégal ?', 'Les frais varient selon le montant, le mode de paiement, la conversion et le réseau de réception. Vérifiez le coût total affiché avant de confirmer.'],
      ['Combien de temps faut-il pour recevoir un transfert ?', 'Le délai dépend du parcours, des vérifications et du partenaire de paiement. Consultez l’estimation affichée pour le transfert concerné.'],
      ['Peut-on recevoir l’argent avec Wave ou Orange Money ?', 'Uniquement si le réseau est proposé pour le pays et le parcours sélectionnés. Les options disponibles doivent être vérifiées dans le parcours de transfert.'],
    ],
    updated: 'Mis à jour le 11 octobre 2026',
  },
  en: {
    title: 'Send money from France to Senegal',
    description: 'Prepare a transfer from France to Senegal. Check fees, timing, exchange and available Mobile Money networks before confirming.',
    intro: 'This guide explains what to check before a transfer between France and Senegal. Options depend on the services actually available for your account and transfer route.',
    fees: 'Fees may depend on the amount, payment method, currency conversion and receiving network. Before confirming, check the total cost and the amount the recipient will receive in the route offered.',
    timing: 'Timing may depend on verification, payment method and the payout partner. Use only the estimate shown for your transfer; it is not a universal guarantee.',
    networks: 'Wave, Orange Money and other Mobile Money networks may be relevant to users, but availability varies by country, partner and transfer route. Treat a network as available only when it appears as a receiving option for the transfer.',
    safety: 'Before sending, verify the recipient, destination number or account, fees, exchange rate and final amount. Never share your password or verification code.',
    faq: [
      ['What fees apply to a transfer from France to Senegal?', 'Fees vary by amount, payment method, conversion and receiving network. Check the total cost shown before confirming.'],
      ['How long does a transfer take?', 'Timing depends on the route, checks and payment partner. Check the estimate shown for the specific transfer.'],
      ['Can the recipient receive money through Wave or Orange Money?', 'Only if that network is offered for the selected country and transfer route. Check the available options in the transfer flow.'],
    ],
    updated: 'Updated October 11, 2026',
  },
} as const;

export default function CorridorGuidePage() {
  const [locale] = useState(() => getLocaleFromPath(window.location.pathname));
  const t = content[locale];
  useSeo({
    path: '/france-senegal',
    locale,
    title: locale === 'fr'
      ? 'Envoyer de l’argent de France au Sénégal | SendFlow'
      : 'Send money from France to Senegal | SendFlow',
    description: t.description,
    imagePath: '/sendflow-favicon.png',
    breadcrumbs: [
      { name: locale === 'fr' ? 'Accueil' : 'Home', path: '/' },
      { name: t.title, path: '/france-senegal' },
    ],
    faqItems: t.faq.map(([question, answer]) => ({ question, answer })),
  });

  return (
    <main className="min-h-screen bg-white px-5 py-12 text-[#17131f] sm:px-8 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <a className="text-sm font-semibold text-violet-700 underline" href={getLocalizedPath('/', locale)}>
          {locale === 'fr' ? 'Accueil SendFlow' : 'SendFlow home'}
        </a>
        <p className="mt-10 text-sm font-semibold uppercase tracking-widest text-violet-700">SendFlow · {locale === 'fr' ? 'Guide de transfert' : 'Transfer guide'}</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-6 text-lg leading-8 text-slate-700">{t.intro}</p>
        <p className="mt-5 text-sm text-slate-500">{t.updated}</p>
        <section className="mt-12 space-y-8 text-base leading-8 text-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{locale === 'fr' ? 'Frais et montant reçu' : 'Fees and amount received'}</h2>
            <p className="mt-3">{t.fees}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{locale === 'fr' ? 'Délais et suivi' : 'Timing and tracking'}</h2>
            <p className="mt-3">{t.timing}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{locale === 'fr' ? 'Mobile Money et réseaux de réception' : 'Mobile Money and receiving networks'}</h2>
            <p className="mt-3">{t.networks}</p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{locale === 'fr' ? 'Vérifications avant confirmation' : 'Checks before confirming'}</h2>
            <p className="mt-3">{t.safety}</p>
          </div>
        </section>
        <section className="mt-12" aria-labelledby="corridor-faq">
          <h2 id="corridor-faq" className="text-2xl font-bold">{locale === 'fr' ? 'Questions fréquentes' : 'Frequently asked questions'}</h2>
          <div className="mt-5 divide-y divide-slate-200">
            {t.faq.map(([question, answer]) => (
              <div className="py-5" key={question}>
                <h3 className="font-bold">{question}</h3>
                <p className="mt-2 leading-7 text-slate-700">{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}
