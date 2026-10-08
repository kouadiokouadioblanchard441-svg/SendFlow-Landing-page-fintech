import './_group.css';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Globe2,
  MoveRight,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from 'lucide-react';

const mark = '/__mockup/images/sendflow-discover-mark.png';
const heroImage = '/__mockup/images/sendflow-discover-hero.png';
const founderImage = '/__mockup/images/sendflow-discover-founder.png';
const handshakeImage = '/__mockup/images/sendflow-discover-handshake.png';
const connectedNetworks = '/__mockup/images/sendflow-discover-cross-network.svg';
const clearDetails = '/__mockup/images/sendflow-discover-visible-details.svg';
const globalMovement = '/__mockup/images/sendflow-discover-international.svg';

const story = [
  {
    label: 'Le déclic',
    title: 'Observer avant de construire',
    text: 'Sur le terrain, une question revenait : pourquoi envoyer de l’argent devait-il encore demander autant d’explications, de confiance et de patience ?',
  },
  {
    label: 'Le virage',
    title: 'De la finance-comptabilité à la tech',
    text: 'Avec une formation en finance-comptabilité, notre fondateur a appris à regarder les chiffres, les risques et les détails. Puis il a choisi de mettre cette rigueur au service d’un produit numérique utile.',
  },
  {
    label: 'Aujourd’hui',
    title: 'Relier les réseaux, rapprocher les personnes',
    text: 'SendFlow transforme la complexité des réseaux Mobile Money en un parcours simple : choisir, vérifier, envoyer. Une petite interface, pour une grande liberté de mouvement.',
  },
];

const benefits = [
  'Comprendre chaque étape avant de confirmer',
  'Passer d’un réseau à l’autre sans jargon',
  'Garder une trace claire de chaque transfert',
  'Envoyer avec une confiance construite dans les détails',
];

const features = [
  {
    image: connectedNetworks,
    alt: 'Illustration de réseaux de paiement reliés',
    title: 'Un seul point de départ',
    text: 'Choisissez un pays, un réseau et un bénéficiaire depuis un parcours pensé pour être compris du premier coup.',
  },
  {
    image: clearDetails,
    alt: 'Illustration d’informations de transfert visibles',
    title: 'Une confiance lisible',
    text: 'Les informations essentielles restent visibles : qui reçoit, combien, quand et où en est le transfert.',
  },
  {
    image: globalMovement,
    alt: 'Illustration d’un mouvement de transfert autour du monde',
    title: 'Des frontières moins lourdes',
    text: 'SendFlow rapproche les réseaux locaux pour que la distance géographique ne dicte plus la distance humaine.',
  },
];

function Eyebrow({ children, icon: Icon }: { children: string; icon: typeof Sparkles }) {
  return (
    <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#5d32c9] sm:text-xs">
      <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
      {children}
    </p>
  );
}

export function Editorial() {
  return (
    <main id="top" className="noise min-h-[100dvh] overflow-hidden bg-white font-['Work_Sans'] text-[#17243e]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-white px-4 py-3 text-sm font-semibold text-[#173e9e] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1769ff]"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-30 border-b border-[#e8edf5] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a href="#top" className="inline-flex items-center gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]" aria-label="SendFlow, accueil">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[#ece9f6]">
              <img src={mark} alt="" className="h-9 w-9 object-contain" />
            </span>
            <span className="text-[19px] font-extrabold tracking-[-0.055em] text-[#17243e]">Send<span className="text-[#6739d2]">Flow</span></span>
          </a>
          <nav aria-label="Navigation de la page" className="hidden items-center gap-8 md:flex">
            <a href="#notre-histoire" className="rounded-sm text-sm font-medium text-[#526078] transition-colors hover:text-[#1769ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]">Notre histoire</a>
            <a href="#mission" className="rounded-sm text-sm font-medium text-[#526078] transition-colors hover:text-[#1769ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]">Notre mission</a>
            <a href="#fondateur" className="rounded-sm text-sm font-medium text-[#526078] transition-colors hover:text-[#1769ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1769ff]">Le fondateur</a>
          </nav>
          <a href="#application" className="inline-flex items-center gap-2 rounded-full bg-[#1769ff] px-4 py-2.5 text-xs font-bold text-white shadow-[0_5px_14px_rgba(23,105,255,.17)] transition-colors hover:bg-[#1256d2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#5d32c9] sm:px-5 sm:text-sm">
            Découvrir SendFlow <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="flex gap-5 overflow-x-auto border-t border-[#f1f3f7] px-5 py-2.5 md:hidden">
          <a href="#notre-histoire" className="shrink-0 rounded-sm text-xs font-semibold text-[#526078] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1769ff]">Notre histoire</a>
          <a href="#mission" className="shrink-0 rounded-sm text-xs font-semibold text-[#526078] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1769ff]">Notre mission</a>
          <a href="#fondateur" className="shrink-0 rounded-sm text-xs font-semibold text-[#526078] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#1769ff]">Le fondateur</a>
        </div>
      </header>

      <div id="main-content">
        <section className="relative border-b border-[#e8edf5] bg-[#fbfcff]">
          <div className="pointer-events-none absolute -right-40 -top-36 h-[470px] w-[470px] rounded-full border-[1px] border-[#1769ff]/10 sm:h-[650px] sm:w-[650px]" />
          <div className="pointer-events-none absolute -right-24 top-20 h-[320px] w-[320px] rounded-full bg-[#f1edff] sm:right-[3%] sm:top-28 sm:h-[410px] sm:w-[410px]" />
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.03fr_.97fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-20">
            <div className="rise relative z-10 max-w-[660px]">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e4ddfa] bg-white px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5d32c9] shadow-[0_3px_12px_rgba(35,49,83,.04)] sm:text-xs">
                <Sparkles size={14} aria-hidden="true" />
                L’histoire derrière SendFlow
              </div>
              <h1 className="max-w-[700px] text-[clamp(2.7rem,7.1vw,5.55rem)] font-extrabold leading-[1.02] tracking-[-0.065em] text-[#17243e]">
                L’argent circule mieux quand les gens <span className="text-[#1769ff]">se comprennent.</span>
              </h1>
              <p className="mt-6 max-w-[565px] text-[16px] leading-7 text-[#526078] sm:mt-7 sm:text-[18px] sm:leading-8">
                SendFlow est né d’une intuition simple : la technologie financière ne devrait pas ajouter de distance. Elle devrait rendre les liens plus directs, les choix plus lisibles et les transferts plus humains.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a href="#fondateur" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1769ff] px-6 py-3 text-sm font-bold text-white shadow-[0_9px_22px_rgba(23,105,255,.19)] transition-colors hover:bg-[#1256d2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#5d32c9]">
                  Rencontrer le fondateur <ArrowRight size={17} aria-hidden="true" />
                </a>
                <a href="#mission" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#dfe5ef] bg-white px-6 py-3 text-sm font-bold text-[#22304a] transition-colors hover:border-[#1769ff]/50 hover:bg-[#f7f9ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#1769ff]">
                  Notre raison d’être <ArrowDown size={16} aria-hidden="true" />
                </a>
              </div>
              <div className="mt-9 flex items-center gap-3 border-t border-[#e7ebf2] pt-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ede8fb] text-[#5d32c9]"><MoveRight size={17} aria-hidden="true" /></span>
                <p className="text-xs font-medium leading-5 text-[#65718a] sm:text-sm">Des choix plus lisibles. Des transferts plus humains.</p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[560px]">
              <div className="absolute inset-x-[12%] bottom-[5%] top-[7%] rounded-[45%] bg-[#f0edfc]" />
              <div className="absolute left-[4%] top-[18%] h-16 w-16 rounded-full border border-[#1769ff]/20 sm:left-[8%] sm:h-20 sm:w-20" />
              <div className="absolute right-[5%] top-[10%] h-3 w-3 rounded-full bg-[#5d32c9] sm:right-[8%]" />
              <div className="relative mx-auto aspect-[.91] w-[82%] max-w-[430px] overflow-hidden rounded-[34px] border-[7px] border-white bg-[#f1f4fa] shadow-[0_26px_70px_rgba(36,52,91,.15)] sm:rounded-[42px] sm:border-[9px]">
                <img
                  src={heroImage}
                  alt="Une utilisatrice présente SendFlow sur son téléphone"
                  className="h-full w-full object-cover object-[center_25%]"
                />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/95 p-3.5 shadow-[0_12px_28px_rgba(31,45,77,.13)] sm:bottom-5 sm:left-5 sm:right-5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1edff]">
                      <img src={mark} alt="" className="h-8 w-8 object-contain" />
                    </span>
                    <div>
                      <p className="text-sm font-bold tracking-[-0.02em] text-[#17243e]">Tout circule.</p>
                      <p className="mt-0.5 text-[11px] text-[#65718a]">L’esprit SendFlow</p>
                    </div>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1769ff] text-white"><ArrowUpRight size={17} aria-hidden="true" /></span>
                </div>
              </div>
              <div className="absolute -bottom-3 left-0 flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white shadow-[0_12px_25px_rgba(36,52,91,.14)] sm:-left-3 sm:h-24 sm:w-24">
                <img src={handshakeImage} alt="Illustration de deux personnes qui se serrent la main" className="h-full w-full object-cover" />
              </div>
              <div className="absolute right-0 top-[38%] hidden items-center gap-2 rounded-full border border-[#e7eaf2] bg-white px-4 py-2.5 text-xs font-bold text-[#25324a] shadow-[0_8px_24px_rgba(36,52,91,.1)] sm:flex">
                <span className="h-2 w-2 rounded-full bg-[#1769ff]" /> Plus clair, à chaque étape
              </div>
            </div>
          </div>
        </section>

        <section id="mission" className="scroll-mt-24 mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[.82fr_1.18fr] lg:gap-20">
            <div className="max-w-[470px]">
              <Eyebrow icon={Target}>Une conviction concrète</Eyebrow>
              <h2 className="text-[clamp(2.2rem,5vw,3.6rem)] font-bold leading-[1.06] tracking-[-0.055em] text-[#17243e]">
                Rendre la simplicité accessible à tous.
              </h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
              <article className="border-t-2 border-[#1769ff] pt-5">
                <span className="text-sm font-bold tracking-[0.12em] text-[#1769ff]">01 / NOTRE MISSION</span>
                <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[#17243e]">Connecter les réseaux et les personnes</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#526078]">
                  Connecter les réseaux de paiement et les personnes qui les utilisent, sans imposer la complexité technique à ceux qui veulent simplement aider, recevoir ou avancer.
                </p>
              </article>
              <article className="border-t-2 border-[#6d35d8] pt-5">
                <span className="text-sm font-bold tracking-[0.12em] text-[#5d32c9]">02 / NOTRE VISION</span>
                <h3 className="mt-4 text-xl font-bold tracking-[-0.03em] text-[#17243e]">Un parcours compréhensible</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#526078]">
                  Faire de chaque transfert un parcours compréhensible, fiable et ouvert, où les réseaux rapprochent les personnes au lieu de créer de nouvelles frontières.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="notre-histoire" className="scroll-mt-24 border-y border-[#e7ebf2] bg-[#f8faff]">
          <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.78fr_1.22fr] lg:gap-24 lg:px-12">
            <div className="max-w-[430px]">
              <Eyebrow icon={Compass}>Le chemin</Eyebrow>
              <h2 className="text-[clamp(2.2rem,5vw,3.55rem)] font-bold leading-[1.06] tracking-[-0.055em] text-[#17243e]">
                Une idée qui a pris racine dans le réel.
              </h2>
              <p className="mt-5 text-[15px] leading-7 text-[#526078]">
                Pas de raccourci spectaculaire. Un apprentissage patient : écouter, comprendre les contraintes, puis construire quelque chose qui tient.
              </p>
              <div className="mt-8 hidden overflow-hidden rounded-[26px] border border-[#e8eaf1] bg-white p-4 shadow-[0_12px_30px_rgba(35,49,83,.05)] sm:block">
                <img src={handshakeImage} alt="Illustration SendFlow d’un accord entre deux personnes" className="mx-auto aspect-[1.45] w-full rounded-[18px] object-cover" />
              </div>
            </div>
            <div className="relative space-y-9 pl-8 sm:space-y-11 sm:pl-12">
              <div className="absolute bottom-4 left-[7px] top-3 w-px bg-[#dce3ef] sm:left-[15px]" aria-hidden="true" />
              {story.map((item, index) => (
                <article key={item.label} className="relative">
                  <span className={`absolute -left-[37px] top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border-[4px] border-[#f8faff] sm:-left-[45px] ${index === 1 ? 'bg-[#6d35d8]' : 'bg-[#1769ff]'}`} aria-hidden="true">
                    <span className="h-1 w-1 rounded-full bg-white" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#5d32c9]">{item.label}</p>
                  <h3 className="mt-2 text-[23px] font-bold leading-tight tracking-[-0.04em] text-[#17243e] sm:text-[27px]">{item.title}</h3>
                  <p className="mt-3 max-w-[620px] text-[15px] leading-7 text-[#526078]">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="mb-9 max-w-[680px] sm:mb-12">
            <Eyebrow icon={Zap}>Ce que SendFlow rend possible</Eyebrow>
            <h2 className="text-[clamp(2.2rem,5vw,3.55rem)] font-bold leading-[1.06] tracking-[-0.055em] text-[#17243e]">Moins de friction. Plus de mouvement.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <article key={feature.title} className="group rounded-[24px] border border-[#e4e9f1] bg-white p-5 shadow-[0_8px_30px_rgba(35,49,83,.035)] transition-transform duration-300 hover:-translate-y-1 sm:p-6">
                <div className="mb-6 flex h-[150px] items-center justify-center overflow-hidden rounded-[17px] bg-[#f5f7fc] p-4 sm:h-[170px]">
                  <img src={feature.image} alt={feature.alt} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]" />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6d35d8]">0{index + 1} / SEND FLOW</p>
                <h3 className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.04em] text-[#17243e]">{feature.title}</h3>
                <p className="mt-3 text-[14px] leading-6 text-[#526078]">{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[#e7ebf2] bg-[#eef4ff]">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_.85fr] lg:items-center lg:gap-20 lg:px-12">
            <div className="max-w-[600px]">
              <Eyebrow icon={ShieldCheck}>Le bénéfice au quotidien</Eyebrow>
              <h2 className="text-[clamp(2.2rem,5vw,3.45rem)] font-bold leading-[1.06] tracking-[-0.055em] text-[#17243e]">
                Une technologie qui s’efface quand elle fait bien son travail.
              </h2>
              <p className="mt-5 max-w-[480px] text-[15px] leading-7 text-[#526078]">
                Un parcours lisible aide chacun à avancer sans perdre de vue les informations importantes.
              </p>
            </div>
            <ul className="space-y-0 rounded-[22px] border border-[#dfe7f5] bg-white px-5 sm:px-7">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 border-b border-[#e8edf5] py-4 text-[14px] font-medium leading-6 text-[#28364e] last:border-0 sm:py-5 sm:text-[15px]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1769ff] text-white"><Check size={12} strokeWidth={3} aria-hidden="true" /></span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="fondateur" className="scroll-mt-24 mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow icon={UserRound}>À l’origine du mouvement</Eyebrow>
              <h2 className="text-[clamp(2.2rem,5vw,3.55rem)] font-bold leading-[1.06] tracking-[-0.055em] text-[#17243e]">Le visage derrière le produit.</h2>
            </div>
            <p className="max-w-[385px] text-[14px] leading-6 text-[#526078]">
              Un profil finance-comptabilité devenu bâtisseur de produits numériques, avec une conviction : la technologie doit clarifier les mouvements d’argent.
            </p>
          </div>
          <article className="grid overflow-hidden rounded-[28px] border border-[#e4e9f1] bg-white shadow-[0_14px_45px_rgba(35,49,83,.055)] lg:grid-cols-[.76fr_1.24fr]">
            <div className="relative min-h-[300px] bg-[#f1f4fa] sm:min-h-[390px] lg:min-h-[470px]">
              <img src={founderImage} alt="Portrait du fondateur de SendFlow" className="absolute inset-0 h-full w-full object-cover object-[center_27%]" />
              <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 text-xs font-bold text-[#17243e] shadow-sm sm:bottom-6 sm:left-6">
                <img src={mark} alt="" className="h-5 w-5 object-contain" />
                SendFlow
              </div>
            </div>
            <div className="flex flex-col justify-between p-6 sm:p-9 lg:p-12">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#6d35d8]">Une conviction, un parcours</p>
                <blockquote className="mt-5 text-[clamp(1.35rem,3vw,2.25rem)] font-semibold leading-[1.28] tracking-[-0.045em] text-[#17243e]">
                  « Je viens de la finance-comptabilité, un univers qui apprend à regarder les chiffres, les risques et les détails. En me lançant dans la tech, j’ai voulu transformer cette rigueur en une expérience concrète : aider les personnes à envoyer de l’argent entre réseaux sans se perdre dans la complexité. »
                </blockquote>
                <div className="mt-7 border-l-2 border-[#1769ff] pl-4">
                  <h3 className="text-lg font-bold tracking-[-0.025em] text-[#17243e]">Fondateur de SendFlow</h3>
                  <p className="mt-1 text-sm font-semibold text-[#5d32c9]">Fondateur &amp; CEO</p>
                  <p className="mt-2 text-xs leading-5 text-[#65718a]">Formation en finance-comptabilité · Côte d’Ivoire</p>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3 border-t border-[#e8edf5] pt-5 text-sm font-medium text-[#526078]">
                <Globe2 size={17} className="text-[#1769ff]" aria-hidden="true" />
                Une rigueur financière au service d’un produit numérique utile.
              </div>
            </div>
          </article>
        </section>

        <section id="application" className="px-5 pb-12 sm:px-8 lg:px-12">
          <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] bg-[#17243e] px-6 py-12 sm:px-10 sm:py-16 lg:px-16 lg:py-[76px]">
            <div className="pointer-events-none absolute -right-20 -top-28 h-[310px] w-[310px] rounded-full border-[24px] border-[#6d35d8]/55 sm:h-[420px] sm:w-[420px]" />
            <div className="pointer-events-none absolute bottom-[-130px] right-[28%] h-[230px] w-[230px] rounded-full bg-[#1769ff]/20 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
              <div className="max-w-[700px]">
                <Eyebrow icon={Sparkles}>La suite s’écrit ensemble</Eyebrow>
                <h2 className="text-[clamp(2.25rem,5.5vw,4.4rem)] font-bold leading-[1.04] tracking-[-0.06em] text-white">
                  Prêt à faire circuler les possibles ?
                </h2>
                <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-[#c5d1e6]">
                  Découvrez SendFlow et sa manière de rendre les transferts plus simples à comprendre.
                </p>
              </div>
              <a href="#top" className="group inline-flex min-h-12 shrink-0 items-center gap-3 rounded-full bg-[#1769ff] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#347cff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white">
                Découvrir SendFlow <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </div>

      <footer className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 pb-8 pt-2 text-xs text-[#65718a] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#ece9f6]"><img src={mark} alt="" className="h-7 w-7 object-contain" /></span>
          <span className="font-semibold text-[#35435b]">SendFlow · Des liens qui avancent.</span>
        </div>
        <span>Une initiative Flow Digital SARL.</span>
      </footer>
    </main>
  );
}
