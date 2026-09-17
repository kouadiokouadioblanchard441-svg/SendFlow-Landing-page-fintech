import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.NEON_DATABASE_URL;
if (!databaseUrl) throw new Error("NEON_DATABASE_URL must be set");

const pool = new Pool({ connectionString: databaseUrl });

const content = [
  ["nav.home", "navigation", "Accueil", "Home"],
  ["nav.features", "navigation", "Fonctionnalités", "Features"],
  ["nav.how", "navigation", "Comment ça marche", "How it works"],
  ["nav.international", "navigation", "International", "International"],
  ["nav.security", "navigation", "Sécurité", "Security"],
  ["nav.about", "navigation", "À propos", "About"],
  ["cta.download", "cta", "Télécharger l’application", "Download the app"],
  ["cta.discover", "cta", "Découvrir SendFlow", "Discover SendFlow"],
  ["cta.newsletter", "cta", "Me tenir au courant", "Keep me posted"],
  ["cta.newsletter.note", "cta", "Démo uniquement · Aucun engagement", "Demo only · No commitment"],
  ["cta.nextMove", "cta", "Le prochain mouvement", "The next move"],
  ["cta.download.title", "cta", "Votre prochain transfert\ncommence ici.", "Your next transfer\nstarts here."],
  ["cta.download.body", "cta", "Téléchargez bientôt l’application SendFlow et simplifiez vos transferts entre réseaux.", "Download the SendFlow app soon and simplify transfers across networks."],
  ["download.nav.home", "download", "Accueil", "Home"],
  ["download.nav.features", "download", "Fonctionnalités", "Features"],
  ["download.nav.support", "download", "Assistance", "Support"],
  ["download.language", "download", "EN", "FR"],
  ["download.menu.open", "download", "Ouvrir le menu", "Open menu"],
  ["download.menu.close", "download", "Fermer le menu", "Close menu"],
  ["download.hero.kicker", "download", "L’application SendFlow", "The SendFlow app"],
  ["download.hero.title", "download", "Téléchargez SendFlow", "Download SendFlow"],
  ["download.hero.body", "download", "Gratuit, sans frais cachés. Disponible sur iOS et Android.", "Free, with no hidden fees. Available on iOS and Android."],
  ["download.hero.free", "download", "Gratuit, sans frais cachés. Disponible sur iOS et Android.", "Free to download. Available on iOS and Android."],
  ["download.cta", "download", "Télécharger", "Download"],
  ["download.store.available", "download", "Disponible sur", "Available on"],
  ["download.store.comingSoon", "download", "Bientôt disponible", "Coming soon"],
  ["download.apk.title", "download", "Télécharger l’APK (Android)", "Download APK (Android)"],
  ["download.apk.meta", "download", "Android direct · bientôt disponible", "Direct Android install · coming soon"],
  ["download.apk.ready", "download", "Android direct", "Direct Android install"],
  ["download.steps.kicker", "download", "Le premier mouvement", "Your first move"],
  ["download.steps.title", "download", "Comment démarrer ?", "How to get started"],
  ["download.steps.1.title", "download", "Téléchargez l’application", "Download the app"],
  ["download.steps.1.body", "download", "Disponible gratuitement sur App Store et Google Play.", "Available free on the App Store and Google Play."],
  ["download.steps.2.title", "download", "Créez votre compte", "Create your account"],
  ["download.steps.2.body", "download", "Inscription en 2 minutes avec votre numéro de téléphone.", "Sign up in two minutes with your phone number."],
  ["download.steps.3.title", "download", "Ajoutez votre compte mobile", "Add your mobile account"],
  ["download.steps.3.body", "download", "Liez votre compte Orange, MTN, Moov ou Wave en toute sécurité.", "Link your Orange, MTN, Moov or Wave account securely."],
  ["download.steps.4.title", "download", "Commencez à transférer", "Start transferring"],
  ["download.steps.4.body", "download", "Choisissez un réseau, vérifiez les détails, puis envoyez.", "Choose a network, review the details, then send."],
  ["download.support.kicker", "download", "Besoin d’aide ?", "Need a hand?"],
  ["download.support.title", "download", "Une question avant de commencer ?", "Questions before you start?"],
  ["download.support.body", "download", "Notre équipe est là pour vous accompagner dans vos premiers transferts.", "Our team is here to guide you through your first transfers."],
  ["download.support.cta", "download", "Contacter l’assistance", "Contact support"],
  ["download.footer.lead", "download", "Une façon plus claire de faire circuler l’argent entre les réseaux.", "A clearer way to move money across payment networks."],
  ["download.footer.products", "download", "Produit", "Product"],
  ["download.footer.company", "download", "Entreprise", "Company"],
  ["download.footer.legal", "download", "Légal", "Legal"],
  ["download.footer.features", "download", "Fonctionnalités", "Features"],
  ["download.footer.security", "download", "Sécurité", "Security"],
  ["download.footer.about", "download", "À propos de nous", "About us"],
  ["download.footer.support", "download", "Support & aide", "Support & help"],
  ["download.footer.terms", "download", "Conditions générales d’utilisation", "Terms of use"],
  ["download.footer.privacy", "download", "Politique de confidentialité", "Privacy policy"],
  ["download.footer.mentions", "download", "Mentions légales", "Legal notice"],
  ["download.footer.address", "download", "Nos adresses", "Our offices"],
  ["download.footer.note", "download", "SendFlow connecte les réseaux de paiement et les personnes qui les utilisent.", "SendFlow connects payment networks and the people who use them."],
  ["download.footer.residence", "download", "Pays de résidence", "Country of residence"],
  ["download.footer.legalIdentity", "download", "Identité légale", "Legal identity"],
  ["download.footer.regulator", "download", "Réglementé par", "Regulated by"],
  ["download.footer.legalContact", "download", "Contact légal", "Legal contact"],
  ["download.footer.legalNotice", "download", "SendFlow est une solution de technologie financière développée par Flow Digital SARL. Nous ne sommes pas une banque ; nos services s’appuient sur des partenaires agréés.", "SendFlow is a financial technology solution developed by Flow Digital SARL. We are not a bank; our services rely on licensed partners."],
  ["download.footer.rights", "download", "Tous droits réservés.", "All rights reserved."],
  ["footer.product.africa", "footer", "SendFlow Afrique", "SendFlow Africa"],
  ["footer.product.europe", "footer", "SendFlow Europe", "SendFlow Europe"],
  ["footer.product.business", "footer", "SendFlow Business", "SendFlow Business"],
  ["footer.referral", "footer", "Parrainage", "Referral"],
  ["footer.address.title", "footer", "Nos adresses", "Our offices"],
  ["footer.address.country", "footer", "Côte d’Ivoire", "Côte d’Ivoire"],
  ["footer.address.value", "footer", "Abidjan, Cocody Riviera Palmeraie", "Abidjan, Cocody Riviera Palmeraie"],
  ["footer.legal.disclaimer", "footer", "SendFlow est une solution de technologie financière développée par Flow Digital SARL. Nous ne sommes pas une banque ; nos services s’appuient sur des partenaires agréés.", "SendFlow is a financial technology solution developed by Flow Digital SARL. We are not a bank; our services rely on licensed partners."],
  ["footer.legal.partners", "footer", "Les services de paiement SendFlow sont proposés via des partenaires agréés dans les territoires où le service est disponible, conformément aux règles locales.", "SendFlow payment services are offered through licensed partners in territories where the service is available, in accordance with local rules."],
  ["footer.legal.identity", "footer", "Identité légale", "Legal identity"],
  ["footer.legal.address", "footer", "Adresse légale", "Legal address"],
  ["footer.legal.contact", "footer", "Contact légal", "Legal contact"],
  ["footer.legal.short", "footer", "SendFlow est une solution de technologie financière développée par Flow Digital SARL.", "SendFlow is a financial technology solution developed by Flow Digital SARL."],
  ["features.principles.kicker", "features", "Une expérience, trois repères", "One experience, three principles"],
  ["features.principles.title", "features", "Pensé pour une Afrique connectée.", "Built for a connected Africa."],
  ["security.title", "security", "Chaque étape\nà découvert.", "Every step,\nin the clear."],
  ["security.body", "security", "Le calme vient de ce que l’on comprend. SendFlow rend les détails lisibles, les choix explicites et le contrôle toujours à portée de main.", "Calm comes from understanding. SendFlow makes details readable, choices explicit, and control always within reach."],
  ["security.visible.title", "security", "Détails visibles", "Visible details"],
  ["security.visible.body", "security", "Comprendre avant de confirmer.", "Understand before you confirm."],
  ["security.private.title", "security", "Pensé privé", "Privacy-minded"],
  ["security.private.body", "security", "Moins de données, plus de sérénité.", "Less data, more peace of mind."],
  ["join.kicker", "cta", "The next move", "The next move"],
  ["join.title", "cta", "Prêt·e à faire bouger les choses ?", "Ready to move things?"],
  ["join.body", "cta", "Recevez les prochaines nouvelles de SendFlow. Pas de bruit, juste les avancées.", "Get the next SendFlow updates. No noise, just progress."],
  ["about.hero.kicker", "about", "L’histoire derrière SendFlow", "The story behind SendFlow"],
  ["about.hero.title", "about", "L’argent circule mieux quand les gens se comprennent.", "Money moves better when people understand each other."],
  ["about.hero.intro", "about", "SendFlow est né d’une intuition simple : la technologie financière ne devrait pas ajouter de distance. Elle devrait rendre les liens plus directs, les choix plus lisibles et les transferts plus humains.", "SendFlow was born from a simple intuition: financial technology should not add distance. It should make connections more direct, choices clearer, and transfers more human."],
  ["about.hero.founderCta", "about", "Rencontrer le fondateur", "Meet the founder"],
  ["about.hero.missionCta", "about", "Notre raison d’être", "Our reason why"],
  ["about.mission.kicker", "about", "Une conviction concrète", "A practical conviction"],
  ["about.mission.title", "about", "Rendre la simplicité accessible à tous.", "Make simplicity accessible to everyone."],
  ["about.mission.label", "about", "Notre mission", "Our mission"],
  ["about.vision.label", "about", "Notre vision", "Our vision"],
  ["about.path.kicker", "about", "Le chemin", "The path"],
  ["about.path.title", "about", "Une idée qui a pris racine dans le réel.", "An idea rooted in real life."],
  ["about.path.intro", "about", "Pas de raccourci spectaculaire. Un apprentissage patient : écouter, comprendre les contraintes, puis construire quelque chose qui tient.", "No spectacular shortcut. A patient practice: listen, understand the constraints, then build something that holds."],
  ["about.benefits.kicker", "about", "Ce que SendFlow rend possible", "What SendFlow makes possible"],
  ["about.benefits.title", "about", "Moins de friction. Plus de mouvement.", "Less friction. More movement."],
  ["about.founder.kicker", "about", "À l’origine du mouvement", "At the origin of the movement"],
  ["about.founder.title", "about", "Le visage derrière le produit.", "The person behind the product."],
  ["about.cta.kicker", "about", "La suite s’écrit ensemble", "The next chapter is shared"],
  ["about.cta.title", "about", "Prêt à faire circuler les possibles ?", "Ready to keep possibilities moving?"],
  ["about.cta.button", "about", "Découvrir SendFlow", "Discover SendFlow"],
  ["about.card.tagline", "about", "Tout circule.", "Keep it moving."],
  ["about.feature.start.title", "about", "Un seul point de départ", "One starting point"],
  ["about.feature.start.body", "about", "Choisissez un pays, un réseau et un bénéficiaire depuis un parcours pensé pour être compris du premier coup.", "Choose a country, a network, and a recipient through a journey designed to be understood at first glance."],
  ["about.feature.trust.title", "about", "Une confiance lisible", "Trust you can read"],
  ["about.feature.trust.body", "about", "Les informations essentielles restent visibles : qui reçoit, combien, quand et où en est le transfert.", "The essentials stay visible: who receives, how much, when, and where the transfer stands."],
  ["about.feature.borders.title", "about", "Des frontières moins lourdes", "Lighter borders"],
  ["about.feature.borders.body", "about", "SendFlow rapproche les réseaux locaux pour que la distance géographique ne dicte plus la distance humaine.", "SendFlow brings local networks closer so geography does not dictate human distance."],
  ["about.footer.tagline", "about", "Des liens qui avancent.", "Connections in motion."],
  ["about.footer.initiative", "about", "Une initiative Flow Digital SARL.", "An initiative by Flow Digital SARL."],
];

const legalSections = {
  "mentions-legales": [
    [1, "Éditeur du site et coordonnées", "Site publisher and contact details", `Le site et les pages publiques SendFlow sont édités par Flow Digital SARL, société à responsabilité limitée de droit ivoirien, exploitant la marque et la solution technologique SendFlow.

Adresse de l’éditeur : Immeuble Horizon, Boulevard Latrille, Cocody, Abidjan, Côte d’Ivoire.

Pour toute question relative au site, à une publication ou à l’identité de l’éditeur, vous pouvez écrire à legal@sendflow.studio.`, `The SendFlow website and public pages are published by Flow Digital SARL, an Ivorian limited liability company operating the SendFlow brand and technology solution.

Publisher address: Immeuble Horizon, Boulevard Latrille, Cocody, Abidjan, Côte d’Ivoire.

For questions about the website, a publication, or the publisher’s identity, contact legal@sendflow.studio.`],
    [2, "Directrice de la publication", "Publication director", `La directrice de la publication est Aïcha Koné, Gérante de Flow Digital SARL.

Elle assure le suivi éditorial des contenus publiés sur le site, la coordination des mises à jour et la réception des demandes relatives aux contenus, aux marques et aux informations diffusées.`, `The publication director is Aïcha Koné, Managing Director of Flow Digital SARL.

She oversees editorial content, updates, and requests relating to published information, brands, and materials.`],
    [3, "Hébergement et infrastructure", "Hosting and infrastructure", `Le site SendFlow est hébergé par Horizon Compute Ltd., 42 River Lane, Dublin 2, Irlande.

Contact juridique de l’hébergeur : +353 1 555 0148.

Région de stockage indiquée : Union européenne.`, `The SendFlow website is hosted by Horizon Compute Ltd., 42 River Lane, Dublin 2, Ireland.

Hosting legal contact: +353 1 555 0148.

Stated storage region: European Union.`],
    [4, "Objet du site", "Purpose of the website", `SendFlow présente une solution technologique destinée à simplifier la compréhension, la préparation et le suivi de transferts d’argent entre réseaux de paiement et opérateurs de mobile money.

Les pages publiques peuvent présenter des fonctionnalités, des corridors, des réseaux, des cartes, des visuels, des démonstrations et des informations de contact. Une information de présentation ne constitue pas, à elle seule, une garantie de disponibilité, de délai, de prix ou d’exécution d’une opération.`, `SendFlow presents technology designed to simplify the understanding, preparation, and tracking of money transfers between payment networks and mobile-money operators.

Public pages may describe features, corridors, networks, maps, visuals, demonstrations, and contact information. Presentation information alone does not guarantee availability, timing, pricing, or execution of a transaction.`],
    [5, "Statut de SendFlow et partenaires", "SendFlow status and partners", `Sauf mention contraire dans un parcours précis, SendFlow agit comme une interface technologique et ne se présente pas comme une banque, un établissement de monnaie électronique, un opérateur de télécommunications ou un service autonome de conservation de fonds.

L’exécution d’un paiement, la conservation des fonds, la vérification d’identité, la conversion et la remise des fonds peuvent relever d’un opérateur, d’une banque ou d’un prestataire de paiement partenaire. Les informations propres à un partenaire sont présentées dans le parcours lorsqu’il intervient.`, `Unless a specific flow says otherwise, SendFlow operates as a technology interface and does not present itself as a bank, electronic-money institution, telecom operator, or standalone custody service.

Payment execution, custody, identity verification, conversion, and payout may be handled by a partner operator, bank, or payment provider. Partner-specific information is shown in the relevant flow when a partner is involved.`],
    [6, "Propriété intellectuelle", "Intellectual property", `La marque SendFlow, les textes, interfaces, illustrations, animations, composants logiciels, bases de données et éléments graphiques sont protégés par les règles applicables de propriété intellectuelle.

Sauf mention d’un titulaire différent, ces éléments appartiennent à Flow Digital SARL ou sont utilisés avec l’autorisation de leur titulaire. Les logos et noms d’opérateurs, de banques ou de réseaux restent la propriété de leurs titulaires respectifs.`, `The SendFlow brand, text, interfaces, illustrations, animations, software components, databases, and graphic elements are protected by applicable intellectual-property laws.

Unless another owner is identified, these elements belong to Flow Digital SARL or are used with permission. Operator, bank, and network names and logos remain the property of their respective owners.`],
    [7, "Données personnelles et signalements", "Personal data and reports", `Les traitements de données personnelles sont décrits dans la Politique de confidentialité SendFlow. Une demande relative à vos droits, une erreur de publication, une usurpation, une atteinte à un droit ou un contenu illicite peut être signalé à legal@sendflow.studio.

Le signalement doit préciser la page concernée, les faits observés, l’identité et le moyen de contact du demandeur ainsi que tout justificatif utile. Ne transmettez jamais de mot de passe, de code OTP ou de clé secrète.`, `Personal-data processing is described in the SendFlow Privacy Policy. Rights requests, publication errors, impersonation, rights violations, or unlawful content may be reported to legal@sendflow.studio.

Reports should identify the page, explain the facts, provide the reporter’s identity and contact details, and include useful evidence. Never send a password, OTP, or secret key.`],
    [8, "Mise à jour et droit applicable", "Updates and applicable law", `Les présentes informations peuvent être mises à jour lorsque l’éditeur, l’infrastructure, la marque, le service ou le cadre réglementaire évolue.

La page est rédigée en français et s’inscrit dans le cadre juridique de l’éditeur établi en Côte d’Ivoire, sous réserve des règles impératives applicables à l’utilisateur, au pays de consultation et au partenaire qui exécute une opération. Dernière mise à jour : 17 septembre 2026.`, `This information may be updated when the publisher, infrastructure, brand, service, or regulatory framework changes.

This page is written in French and follows the legal framework of the publisher established in Côte d’Ivoire, subject to mandatory rules applicable to users, their country, and the partner executing a transaction. Last updated: September 17, 2026.`],
  ],
  "conditions-utilisation": [
    [1, "Objet et champ d’application", "Purpose and scope", `Les présentes conditions générales d’utilisation encadrent l’accès au site, à l’application, aux interfaces de suivi, aux formulaires et aux fonctionnalités SendFlow.

Elles expliquent les services proposés, les règles d’utilisation, les responsabilités de l’utilisateur et de Flow Digital SARL, ainsi que les conditions particulières qui peuvent s’appliquer à un pays, un réseau, un opérateur ou un partenaire.`, `These Terms of Use govern access to the SendFlow website, application, tracking interfaces, forms, and features.

They explain the services, usage rules, responsibilities of the user and Flow Digital SARL, and any special terms that may apply to a country, network, operator, or partner.`],
    [2, "Définitions", "Definitions", `Dans les présentes conditions :

- « SendFlow » désigne la marque et les interfaces exploitées par Flow Digital SARL.
- « Partenaire » désigne un opérateur, une banque, un établissement de paiement ou un prestataire intervenant dans un parcours.
- « Opération » désigne une demande de transfert, de paiement, de suivi ou de service initiée depuis SendFlow.
- « Utilisateur » désigne toute personne qui consulte le site ou utilise une fonctionnalité SendFlow.
- « Données de sécurité » désigne les mots de passe, codes PIN, OTP, clés et informations permettant d’accéder à un compte.`, `In these Terms:

- “SendFlow” means the brand and interfaces operated by Flow Digital SARL.
- “Partner” means an operator, bank, payment institution, or provider involved in a flow.
- “Transaction” means a transfer, payment, tracking, or service request started through SendFlow.
- “User” means anyone viewing the website or using a SendFlow feature.
- “Security data” means passwords, PINs, OTPs, keys, and information used to access an account.`],
    [3, "Description du service", "Service description", `SendFlow est une couche technologique de connexion, d’information et de suivi. Elle aide l’utilisateur à choisir un pays, un réseau, un bénéficiaire et un montant, puis à comprendre les étapes d’une opération.

Sauf indication contraire affichée dans un parcours, SendFlow n’est ni une banque, ni un établissement de monnaie électronique, ni un opérateur de télécommunications, ni un wallet autonome. Les services réglementés peuvent être fournis directement par un partenaire.`, `SendFlow is a technology layer for connection, information, and tracking. It helps users choose a country, network, recipient, and amount, and understand the stages of a transaction.

Unless a flow says otherwise, SendFlow is not a bank, electronic-money institution, telecom operator, or standalone wallet. Regulated services may be provided directly by a partner.`],
    [4, "Accès au compte et éligibilité", "Account access and eligibility", `L’utilisateur doit fournir des informations exactes, à jour et complètes. Lorsqu’un compte est nécessaire, il doit utiliser ses propres coordonnées et ne pas créer de compte au nom d’une autre personne sans autorisation valable.

Les fonctionnalités de transfert sont destinées aux personnes qui peuvent légalement conclure un contrat dans leur pays. Un partenaire peut imposer un âge minimum, une résidence, un numéro de téléphone local ou une vérification supplémentaire.`, `Users must provide accurate, current, and complete information. When an account is required, they must use their own details and may not create an account for another person without valid authorization.

Transfer features are intended for people who can legally enter into a contract in their country. A partner may impose an age requirement, residency rule, local phone number, or additional verification.`],
    [5, "Vérification d’identité et conformité", "Identity verification and compliance", `Flow Digital SARL et ses partenaires peuvent demander des informations d’identité, des justificatifs, l’origine des fonds, la relation avec le bénéficiaire ou le motif d’une opération.

L’utilisateur s’engage à répondre honnêtement et à ne pas contourner une limite, une procédure KYC, une sanction, un contrôle de fraude ou une obligation de lutte contre le blanchiment. Une opération peut être retardée, refusée, bloquée ou signalée lorsqu’un contrôle le justifie.`, `Flow Digital SARL and its partners may request identity information, supporting documents, source of funds, relationship to the recipient, or the purpose of a transaction.

Users agree to answer honestly and not circumvent a limit, KYC procedure, sanction, fraud control, or anti-money-laundering obligation. A transaction may be delayed, refused, blocked, or reported when a control requires it.`],
    [6, "Instructions de transfert, frais et confirmation", "Transfer instructions, fees, and confirmation", `Avant de confirmer une opération, l’utilisateur doit vérifier :

- le bénéficiaire et ses coordonnées ;
- le pays et le réseau de destination ;
- le montant, la devise, les frais et le taux affiché ;
- le délai estimé et le montant reçu ;
- le récapitulatif final présenté par le partenaire.

Une confirmation donnée avec des informations erronées peut être irréversible. Les frais peuvent comprendre des frais SendFlow, de partenaire, de réseau, de change ou des taxes.`, `Before confirming a transaction, users must check:

- the recipient and recipient details;
- the destination country and network;
- the amount, currency, fees, and displayed rate;
- the estimated timing and amount received;
- the final summary shown by the partner.

A confirmation containing incorrect information may be irreversible. Fees may include SendFlow, partner, network, exchange, or tax charges.`],
    [7, "Sécurité du compte et des appareils", "Account and device security", `L’utilisateur est responsable de la confidentialité de ses identifiants, codes, appareils et moyens de récupération. Il doit activer les protections disponibles, utiliser un appareil à jour et signaler immédiatement toute perte, connexion inconnue ou activité inhabituelle.

Le support SendFlow ne demande jamais un mot de passe, un code PIN mobile money, un OTP ou une clé secrète par e-mail ou par téléphone. Ces informations ne doivent être communiquées à personne.`, `Users are responsible for keeping their credentials, codes, devices, and recovery methods confidential. They should use an up-to-date device, enable available protections, and immediately report loss, unknown access, or unusual activity.

SendFlow support never asks for a password, mobile-money PIN, OTP, or secret key by email or phone. Such information must never be shared.`],
    [8, "Utilisations interdites", "Prohibited uses", `Il est interdit d’utiliser SendFlow pour une activité illégale, frauduleuse, trompeuse ou portant atteinte aux droits d’autrui, notamment :

- le blanchiment, le financement du terrorisme, la fraude ou la dissimulation de l’origine des fonds ;
- l’usurpation d’identité, les faux bénéficiaires ou les collectes trompeuses ;
- le contournement d’une sanction, d’un plafond, d’une restriction géographique ou d’un contrôle ;
- le scraping, l’injection de code, le test de charge abusif ou toute tentative de compromettre le service ;
- la copie, la revente ou l’exploitation commerciale d’une interface sans autorisation.`, `SendFlow may not be used for illegal, fraudulent, misleading, or rights-infringing activity, including:

- money laundering, terrorist financing, fraud, or concealing the source of funds;
- identity theft, false recipients, or misleading collections;
- circumventing a sanction, limit, geographic restriction, or control;
- scraping, code injection, abusive load testing, or attempts to compromise the service;
- copying, reselling, or commercially exploiting an interface without authorization.`],
    [9, "Disponibilité et partenaires", "Availability and partners", `Flow Digital SARL s’efforce de maintenir un service accessible, sécurisé et compréhensible. Une disponibilité permanente ne peut toutefois pas être garantie.

Une interruption peut provenir d’une maintenance, d’un incident de réseau, d’un opérateur, d’un partenaire, d’une autorité ou d’un événement extérieur. Les délais, statuts, frais et montants peuvent dépendre des informations reçues d’un partenaire et évoluer avant la confirmation finale.`, `Flow Digital SARL works to keep the service accessible, secure, and understandable. Continuous availability cannot be guaranteed.

An interruption may result from maintenance, a network incident, an operator, a partner, an authority, or an external event. Timing, status, fees, and amounts may depend on partner information and may change before final confirmation.`],
    [10, "Données personnelles et communications", "Personal data and communications", `Les données personnelles sont traitées conformément à la Politique de confidentialité SendFlow. L’utilisateur peut recevoir des communications nécessaires à la sécurité, à la confirmation, au suivi ou à la résolution d’un incident.

Les communications commerciales suivent les choix disponibles et les règles applicables. Pour protéger un compte, certaines notifications peuvent être envoyées même lorsque les communications commerciales ont été refusées.`, `Personal data is processed according to the SendFlow Privacy Policy. Users may receive communications needed for security, confirmation, tracking, or incident resolution.

Marketing communications follow available choices and applicable rules. To protect an account, certain notices may be sent even when marketing communications have been declined.`],
    [11, "Propriété intellectuelle", "Intellectual property", `La marque SendFlow, ses noms, logos, textes, interfaces, illustrations, animations, composants, logiciels et bases de données appartiennent à Flow Digital SARL ou sont utilisés avec l’autorisation de leurs titulaires.

L’accès au service ne transfère aucun droit de propriété. Toute reproduction, adaptation, extraction, diffusion, sous-licence ou exploitation commerciale non autorisée est interdite.`, `The SendFlow brand, names, logos, text, interfaces, illustrations, animations, components, software, and databases belong to Flow Digital SARL or are used with permission.

Access to the service transfers no ownership rights. Unauthorized reproduction, adaptation, extraction, distribution, sublicensing, or commercial use is prohibited.`],
    [12, "Suspension et fermeture", "Suspension and closure", `L’utilisateur peut cesser d’utiliser SendFlow à tout moment. Flow Digital SARL ou un partenaire peut limiter ou suspendre un accès afin de protéger l’utilisateur, respecter une obligation légale, prévenir une fraude, traiter un incident ou constater une violation des présentes conditions.

Lorsque la sécurité et la loi le permettent, l’utilisateur peut être informé du motif général. Certaines informations ne peuvent pas être divulguées lorsqu’elles concernent une enquête, un signalement ou une obligation de confidentialité.`, `Users may stop using SendFlow at any time. Flow Digital SARL or a partner may limit or suspend access to protect users, comply with a legal obligation, prevent fraud, address an incident, or identify a breach of these Terms.

Where security and law allow, users may be told the general reason. Some information cannot be disclosed when it concerns an investigation, report, or confidentiality obligation.`],
    [13, "Responsabilité et limites", "Liability and limits", `Les présentes conditions ne limitent pas les droits impératifs d’un consommateur ni les responsabilités qui ne peuvent légalement être exclues.

Dans la mesure permise par la loi, Flow Digital SARL ne répond pas des pertes résultant d’une information fournie par l’utilisateur, d’un bénéficiaire erroné, du partage d’un code, d’un appareil compromis, d’un réseau indisponible ou d’un acte d’un partenaire indépendant.`, `These Terms do not limit mandatory consumer rights or liabilities that cannot legally be excluded.

To the extent permitted by law, Flow Digital SARL is not responsible for losses resulting from information supplied by the user, an incorrect recipient, code sharing, a compromised device, an unavailable network, or an act of an independent partner.`],
    [14, "Réclamations, droit applicable et mise à jour", "Complaints, applicable law, and updates", `Toute réclamation doit être adressée à legal@sendflow.studio avec l’identité du demandeur, la date concernée, la référence disponible, l’objet de la demande et le résultat attendu. Ne transmettez jamais de mot de passe, de code OTP ou de clé secrète.

Les présentes conditions sont interprétées selon le droit applicable en Côte d’Ivoire, sous réserve des règles impératives protectrices de l’utilisateur et des conditions particulières du partenaire. Elles peuvent être mises à jour lorsque le service, la sécurité, les partenaires ou la réglementation évoluent. Dernière mise à jour : 17 septembre 2026.`, `Complaints should be sent to legal@sendflow.studio with the requester’s identity, relevant date, available reference, subject, and expected outcome. Never send a password, OTP, or secret key.

These Terms are interpreted under the law applicable in Côte d’Ivoire, subject to mandatory user-protection rules and partner-specific terms. They may be updated when the service, security, partners, or regulations change. Last updated: September 17, 2026.`],
  ],
  confidentialite: [
    [1, "Responsable du traitement", "Data controller", `Le responsable du traitement présenté dans cette politique est Flow Digital SARL, opérateur de la marque SendFlow, établi à Immeuble Horizon, Boulevard Latrille, Cocody, Abidjan, Côte d’Ivoire.

Pour toute question relative aux données personnelles ou pour exercer un droit, contactez legal@sendflow.studio. Lorsqu’un partenaire exécute directement une opération, il peut agir comme responsable indépendant ou conjoint pour certains traitements.`, `The controller described in this policy is Flow Digital SARL, operator of the SendFlow brand, established at Immeuble Horizon, Boulevard Latrille, Cocody, Abidjan, Côte d’Ivoire.

For questions about personal data or to exercise a right, contact legal@sendflow.studio. When a partner directly executes a transaction, it may act as an independent or joint controller for certain processing.`],
    [2, "Périmètre de la politique", "Scope of this policy", `Cette politique s’applique au site SendFlow, à l’application, aux parcours de transfert, au suivi des opérations, aux formulaires de contact, aux communications liées au service et aux pages publiques associées.

Elle ne remplace pas la politique d’un opérateur, d’une banque, d’un prestataire de paiement ou d’un partenaire qui collecte directement des informations dans son propre environnement.`, `This policy applies to the SendFlow website, application, transfer flows, transaction tracking, contact forms, service communications, and related public pages.

It does not replace the policy of an operator, bank, payment provider, or partner that directly collects information in its own environment.`],
    [3, "Catégories de données collectées", "Categories of data collected", `Selon le parcours utilisé, SendFlow peut traiter :

- des données d’identité et de contact : nom, téléphone, e-mail, pays et préférences ;
- des données de compte : identifiant, statut, consentements et paramètres de sécurité ;
- des données de transfert : bénéficiaire, pays, réseau, montant, devise, référence, date et statut ;
- des données de vérification : justificatifs, origine des fonds et éléments de conformité ;
- des données techniques : adresse IP, appareil, système, version, journaux d’erreur et événements de sécurité ;
- des données de support : demande, correspondance et pièce jointe envoyée volontairement.

SendFlow ne demande pas de mot de passe bancaire, de code PIN mobile money ou de code OTP par e-mail.`, `Depending on the flow, SendFlow may process:

- identity and contact data such as name, phone, email, country, and preferences;
- account data such as identifiers, status, consents, and security settings;
- transaction data such as recipient, country, network, amount, currency, reference, date, and status;
- verification data such as documents, source of funds, and compliance information;
- technical data such as IP address, device, system, version, error logs, and security events;
- support data such as requests, correspondence, and voluntarily submitted attachments.

SendFlow does not ask for a bank password, mobile-money PIN, or OTP by email.`],
    [4, "Origine des données", "Data sources", `Les données peuvent être fournies directement par l’utilisateur, générées lors de l’utilisation du service, reçues d’un partenaire avec lequel l’utilisateur demande l’exécution d’une opération, ou collectées automatiquement depuis l’appareil et le navigateur.

Lorsqu’un utilisateur saisit les informations d’un bénéficiaire, il doit s’assurer qu’il a le droit de les utiliser pour la demande concernée et, lorsque cela est nécessaire, informer le bénéficiaire.`, `Data may be provided directly by the user, generated through service use, received from a partner involved in a requested transaction, or collected automatically from a device and browser.

When a user enters recipient information, they must ensure they have the right to use it for the request and, where necessary, inform the recipient.`],
    [5, "Finalités et bases de traitement", "Purposes and legal bases", `Les données sont utilisées pour :

- créer et gérer un compte et répondre à une demande ;
- préparer, transmettre, suivre, rapprocher ou résoudre une opération ;
- afficher les réseaux, pays, frais, statuts et informations utiles ;
- prévenir la fraude et protéger les utilisateurs ;
- respecter les obligations légales, judiciaires et réglementaires ;
- assurer le support, traiter les réclamations et améliorer le service ;
- envoyer des communications commerciales lorsque le consentement ou la loi le permet.

Selon le traitement, la base peut être l’exécution d’un service demandé, une obligation légale, le consentement ou l’intérêt légitime de sécurité et d’amélioration.`, `Data is used to:

- create and manage an account and answer a request;
- prepare, transmit, track, reconcile, or resolve a transaction;
- display networks, countries, fees, statuses, and useful information;
- prevent fraud and protect users;
- meet legal, judicial, and regulatory obligations;
- provide support, handle complaints, and improve the service;
- send marketing communications where consent or law allows.

Depending on the processing, the legal basis may be a requested service, a legal obligation, consent, or a legitimate interest in security and improvement.`],
    [6, "Données de paiement et financières", "Payment and financial data", `SendFlow peut afficher ou transmettre les informations nécessaires à un transfert, mais les coordonnées de carte, codes secrets et identifiants sensibles sont en principe traités par le prestataire de paiement ou l’opérateur concerné.

Lorsqu’elle reçoit une référence, un statut ou une information de rapprochement, Flow Digital SARL l’utilise pour fournir le service, le support, la prévention de la fraude et les obligations de preuve.`, `SendFlow may display or transmit information needed for a transfer, but card details, secret codes, and sensitive identifiers are generally handled by the relevant payment provider or operator.

When it receives a reference, status, or reconciliation detail, Flow Digital SARL uses it to provide the service, support, fraud prevention, and proof obligations.`],
    [7, "Partage avec les partenaires et prestataires", "Sharing with partners and providers", `Les données peuvent être communiquées uniquement dans la mesure nécessaire :

- aux opérateurs, banques, établissements de paiement et prestataires qui exécutent ou vérifient l’opération ;
- aux prestataires d’hébergement, de stockage, de sécurité, de messagerie, de support et de supervision ;
- aux prestataires de vérification d’identité, de lutte contre la fraude et de conformité ;
- aux conseils, auditeurs et assureurs soumis à une obligation de confidentialité ;
- aux autorités lorsqu’une demande légale l’exige.

Les prestataires techniques reçoivent des instructions et des accès limités à leur rôle.`, `Data may be shared only as necessary with:

- operators, banks, payment institutions, and providers executing or verifying a transaction;
- hosting, storage, security, messaging, support, and monitoring providers;
- identity-verification, fraud-prevention, and compliance providers;
- advisers, auditors, and insurers bound by confidentiality;
- authorities when legally required.

Technical providers receive instructions and access limited to their role.`],
    [8, "Transferts internationaux", "International transfers", `Les données peuvent être traitées dans un pays différent de celui où le service est utilisé lorsque les partenaires ou prestataires techniques y sont établis.

Flow Digital SARL prend en compte le cadre applicable, les garanties contractuelles et les mesures de sécurité nécessaires. Les partenaires de paiement peuvent appliquer leurs propres règles de localisation, de conservation et de communication.`, `Data may be processed in a country different from where the service is used when partners or technical providers are established there.

Flow Digital SARL considers the applicable framework, contractual safeguards, and necessary security measures. Payment partners may apply their own localization, retention, and disclosure rules.`],
    [9, "Conservation des données", "Data retention", `Les données sont conservées pendant la durée nécessaire à la finalité pour laquelle elles ont été collectées, puis supprimées, anonymisées ou archivées lorsque la loi impose une conservation plus longue.

Les données de compte, de transfert, de support, de sécurité et de consentement peuvent être conservées pendant des durées différentes selon la preuve, la comptabilité, la fiscalité, la lutte contre le blanchiment, la gestion des litiges et les obligations des partenaires.`, `Data is kept for as long as needed for the purpose for which it was collected, then deleted, anonymized, or archived when the law requires longer retention.

Account, transaction, support, security, and consent data may be kept for different periods depending on proof, accounting, tax, anti-money-laundering, dispute, and partner obligations.`],
    [10, "Sécurité et confidentialité", "Security and confidentiality", `Flow Digital SARL met en place des mesures techniques et organisationnelles raisonnables : contrôle des accès, limitation des habilitations, chiffrement lorsque disponible, journalisation, sauvegardes, séparation des environnements et surveillance des incidents.

Aucun service connecté à Internet n’est totalement exempt de risque. L’utilisateur doit protéger son téléphone, sa messagerie et ses codes, utiliser un appareil à jour et signaler toute suspicion de compromission.`, `Flow Digital SARL applies reasonable technical and organizational measures: access control, limited permissions, encryption where available, logging, backups, environment separation, and incident monitoring.

No Internet-connected service is entirely risk-free. Users must protect their phone, email, and codes, use an updated device, and report suspected compromise.`],
    [11, "Cookies et technologies similaires", "Cookies and similar technologies", `SendFlow peut utiliser des cookies ou technologies similaires nécessaires à la session, à la sécurité, à la mémorisation de la langue et au fonctionnement du site.

Les outils de mesure d’audience ou de diagnostic doivent être activés dans le respect des choix requis par la réglementation applicable. La désactivation d’un cookie nécessaire peut empêcher le fonctionnement d’une session, d’un formulaire ou d’une mesure de sécurité.`, `SendFlow may use cookies or similar technologies needed for sessions, security, language preferences, and website operation.

Analytics or diagnostic tools must be enabled in accordance with choices required by applicable law. Disabling a necessary cookie may affect a session, form, or security feature.`],
    [12, "Vos droits", "Your rights", `Selon la loi applicable, les personnes peuvent demander l’accès à leurs données, leur rectification, leur mise à jour, leur suppression lorsque cela est possible, la limitation d’un traitement, l’opposition à certains usages, le retrait d’un consentement ou une copie des informations les concernant.

Pour exercer un droit, écrivez à legal@sendflow.studio en indiquant votre nom, le moyen de vous répondre et l’objet précis de la demande. Une vérification d’identité raisonnable peut être demandée.`, `Depending on applicable law, people may request access, correction, updating, deletion where possible, restriction, objection to certain uses, withdrawal of consent, or a copy of their information.

To exercise a right, contact legal@sendflow.studio with your name, a way to reply, and the subject of the request. A reasonable identity check may be required.`],
    [13, "Mineurs", "Children", `SendFlow n’est pas destiné aux personnes qui ne peuvent pas légalement utiliser un service financier ou de transfert. Flow Digital SARL ne cherche pas à collecter volontairement les données d’un mineur sans le cadre et l’autorisation requis.

Si vous pensez qu’un mineur nous a transmis des informations, contactez legal@sendflow.studio afin que la situation puisse être vérifiée et traitée conformément aux obligations applicables.`, `SendFlow is not intended for people who cannot legally use a financial or transfer service. Flow Digital SARL does not knowingly seek to collect a child’s data without the required framework and authorization.

If you believe a child has provided information, contact legal@sendflow.studio so the situation can be reviewed and handled under applicable obligations.`],
    [14, "Décisions automatisées et profilage", "Automated decisions and profiling", `Des contrôles automatisés peuvent contribuer à détecter une anomalie, une fraude ou un risque de conformité. Ils ne doivent pas être interprétés comme une décision définitive sur une personne sans examen ou procédure prévue par le partenaire compétent lorsque la loi l’exige.

SendFlow n’utilise pas les données de transfert pour créer un profil publicitaire de vos habitudes financières.`, `Automated controls may help detect anomalies, fraud, or compliance risks. They should not be treated as a final decision about a person without review or a procedure provided by the relevant partner where required by law.

SendFlow does not use transfer data to create an advertising profile of your financial habits.`],
    [15, "Violation de données, mise à jour et contact", "Data breaches, updates, and contact", `En cas d’incident susceptible d’affecter des données personnelles, Flow Digital SARL applique une procédure d’analyse, de confinement, de correction et de notification. Les autorités, partenaires et personnes concernées peuvent être informés lorsque la loi ou le niveau de risque le requiert.

Cette politique peut être modifiée pour refléter une nouvelle fonctionnalité, un partenaire, une évolution réglementaire ou une amélioration des pratiques. Dernière mise à jour : 17 septembre 2026.`, `If an incident may affect personal data, Flow Digital SARL applies an analysis, containment, correction, and notification process. Authorities, partners, and affected people may be informed when law or risk requires it.

This policy may change to reflect a new feature, partner, regulatory development, or improved practice. Last updated: September 17, 2026.`],
  ],
};

const legalIvorianEnhancements = {
  "mentions-legales": {
    1: {
      fr: `L’identification de l’éditeur est présentée conformément aux exigences d’identification applicables aux services numériques et aux transactions électroniques en Côte d’Ivoire. La dénomination, la forme sociale, le siège et l’adresse de contact doivent rester cohérents avec les documents sociaux de Flow Digital SARL et avec les informations affichées dans le parcours utilisateur.

Flow Digital SARL relève également du droit des sociétés applicable dans l’espace OHADA pour les questions relatives à sa constitution, sa représentation et ses engagements. Aucun nom commercial, visuel ou nom de domaine ne remplace l’identification de la personne morale qui exploite effectivement le site.`,
      en: `The publisher’s identity is presented in line with the identification requirements applicable to digital services and electronic transactions in Côte d’Ivoire. The company name, legal form, registered office, and contact address must remain consistent with Flow Digital SARL’s corporate documents and with the information shown in the user flow.

Flow Digital SARL is also subject to the company-law framework applicable in the OHADA area for matters relating to its formation, representation, and commitments. No trade name, visual identity, or domain name replaces the identification of the legal entity actually operating the website.`,
    },
    2: {
      fr: `La directrice de la publication exerce la responsabilité éditoriale du site : elle organise la publication, la correction des informations et le traitement des demandes de retrait ou de rectification. Cette fonction ne signifie pas qu’elle exécute ou garantit les opérations de paiement traitées par un partenaire.

Toute demande relative à un contenu doit identifier précisément la page, le passage concerné et le motif de la demande. Les demandes liées à une opération financière doivent, en plus, être adressées au canal de support indiqué dans le parcours concerné.`,
      en: `The publication director has editorial responsibility for the website: she oversees publication, correction of information, and requests to remove or rectify content. This role does not mean that she executes or guarantees payment transactions handled by a partner.

Content requests should identify the page, the relevant passage, and the reason for the request. Requests concerning a financial transaction should also be sent through the support channel shown in the relevant flow.`,
    },
    3: {
      fr: `L’hébergeur fournit une infrastructure technique ; il n’est pas, du seul fait de cet hébergement, le fournisseur d’un service de paiement SendFlow. La responsabilité de l’hébergeur et celle de l’éditeur sont appréciées selon leurs rôles respectifs, les contrats applicables et les règles ivoiriennes relatives aux communications et transactions électroniques.

Les données hébergées doivent faire l’objet de mesures de confidentialité, d’accès limité et de sécurité proportionnées. La région de stockage indiquée sur cette page ne constitue pas une garantie que chaque traitement réalisé par un partenaire de paiement se déroule dans la même région.`,
      en: `The host provides technical infrastructure; hosting alone does not make it the provider of a SendFlow payment service. The host’s and publisher’s responsibilities are assessed according to their respective roles, applicable contracts, and Ivorian rules relating to electronic communications and transactions.

Hosted data must be protected through confidentiality, restricted access, and proportionate security measures. The storage region shown on this page does not guarantee that every processing operation performed by a payment partner occurs in the same region.`,
    },
    4: {
      fr: `La présentation du site s’inscrit dans le cadre ivoirien des transactions électroniques, notamment pour les informations communiquées à distance, l’acceptation électronique lorsqu’elle est proposée et la conservation des éléments utiles à la preuve. Une page de présentation ne vaut pas offre ferme lorsque les éléments essentiels de l’opération doivent encore être fournis par un partenaire.

Les prix, frais, délais et conditions d’un transfert doivent être présentés dans le parcours de confirmation applicable. En cas de différence entre une présentation générale et le récapitulatif final, l’utilisateur doit se référer au récapitulatif et aux conditions du prestataire qui exécute l’opération.`,
      en: `The website’s presentation falls within the Ivorian framework for electronic transactions, including remote information, electronic acceptance where offered, and the retention of information needed as evidence. A presentation page is not a firm offer where essential transaction details must still be supplied by a partner.

Prices, fees, timing, and transfer terms must be shown in the applicable confirmation flow. If general presentation information differs from the final summary, users should rely on the summary and the terms of the provider executing the transaction.`,
    },
    5: {
      fr: `Les activités de banque, de monnaie électronique, de paiement, de change et de transfert de fonds peuvent être soumises à un agrément, à une autorisation ou à une supervision particulière. En Côte d’Ivoire, ces activités s’inscrivent notamment dans le cadre régional UEMOA et dans les textes et instructions de la BCEAO applicables aux établissements et prestataires concernés.

Flow Digital SARL ne doit pas être présenté comme titulaire d’un agrément qui n’est pas expressément identifié. Le partenaire qui reçoit les fonds, effectue le contrôle réglementaire ou remet les fonds doit être identifié dans le parcours lorsque sa réglementation l’exige.`,
      en: `Banking, electronic-money, payment, foreign-exchange, and money-transfer activities may require specific licensing, authorization, or supervision. In Côte d’Ivoire, these activities are notably governed by the UEMOA regional framework and the BCEAO rules and instructions applicable to the relevant institutions and providers.

Flow Digital SARL must not be presented as holding a license that is not expressly identified. The partner receiving funds, performing regulatory checks, or paying out funds should be identified in the flow where its regulatory framework requires it.`,
    },
    6: {
      fr: `La protection de la marque, des créations et des logiciels doit être appréciée avec les règles ivoiriennes de propriété intellectuelle et les mécanismes de protection applicables dans l’espace OAPI. Une autorisation d’accès au site ne transfère ni la marque, ni le code, ni les droits sur les bases de données.

Une demande fondée sur une atteinte à un droit doit être suffisamment précise pour permettre l’identification du titulaire, de l’œuvre ou du signe concerné, de la page visée et de la mesure demandée. Flow Digital SARL peut demander des justificatifs avant toute modification.`,
      en: `Protection of the brand, creations, and software must be assessed under Ivorian intellectual-property rules and the protection mechanisms applicable in the OAPI area. Access to the website transfers neither the brand, nor code, nor database rights.

A rights-based complaint should identify the rights holder, work or sign, relevant page, and requested action precisely enough to be reviewed. Flow Digital SARL may request supporting documents before making a change.`,
    },
    7: {
      fr: `Les traitements de données sont encadrés par la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel et par les règles et démarches applicables auprès de l’ARTCI. Les demandes doivent permettre de vérifier l’identité du demandeur sans exiger de données excessives.

Un signalement d’illicéité, de fraude ou d’atteinte à un droit n’autorise pas l’expéditeur à transmettre des données bancaires, des codes secrets ou des documents sans rapport avec le signalement. Les informations reçues sont utilisées pour instruire la demande, assurer la sécurité et respecter les obligations légales.`,
      en: `Data processing is governed by Ivorian Law No. 2013-450 of June 19, 2013 on the protection of personal data, together with applicable rules and procedures of ARTCI. Requests must allow the requester’s identity to be checked without requiring excessive information.

A report of unlawful content, fraud, or rights infringement does not authorize the sender to submit banking data, secret codes, or unrelated documents. Information received is used to assess the report, maintain security, and meet legal obligations.`,
    },
    8: {
      fr: `Les présentes mentions doivent être lues avec les Conditions générales d’utilisation, la Politique de confidentialité et, lorsqu’une opération est proposée, les conditions du partenaire concerné. Le droit ivoirien peut s’appliquer à l’éditeur sans écarter les règles impératives de protection d’un utilisateur situé dans un autre pays.

Les textes ivoiriens relatifs aux transactions électroniques, à la cybercriminalité et aux données personnelles peuvent évoluer. La date de mise à jour permet d’identifier la version consultée ; elle ne transforme pas une information ancienne en engagement permanent.`,
      en: `These legal notices should be read together with the Terms of Use, Privacy Policy, and, where a transaction is offered, the relevant partner’s terms. Ivorian law may apply to the publisher without displacing mandatory protections applicable to a user in another country.

Ivorian rules on electronic transactions, cybercrime, and personal data may change. The update date identifies the version consulted; it does not turn outdated information into a continuing commitment.`,
    },
  },
  "conditions-utilisation": {
    1: {
      fr: `Le contrat d’utilisation est conclu avec Flow Digital SARL pour les fonctionnalités qu’elle exploite directement. Lorsqu’un partenaire intervient, l’utilisateur peut également être lié par les conditions de ce partenaire ; ces conditions doivent être accessibles avant la confirmation de l’opération.

L’identification de l’éditeur, son adresse et son contact légal servent à permettre une réclamation et l’exercice des droits. Elles ne remplacent pas les informations propres à l’établissement qui détient les fonds ou fournit le service réglementé.`,
      en: `The user agreement is entered into with Flow Digital SARL for features it directly operates. When a partner is involved, users may also be bound by that partner’s terms, which should be available before a transaction is confirmed.

The publisher’s identity, address, and legal contact enable complaints and rights requests. They do not replace the information relating to the institution holding funds or providing the regulated service.`,
    },
    2: {
      fr: `Les présentes conditions s’interprètent avec les règles ivoiriennes relatives aux transactions électroniques, notamment lorsque l’utilisateur reçoit une information à distance, accepte une clause par voie électronique ou conserve un récapitulatif numérique. Les conditions particulières doivent identifier clairement l’opération à laquelle elles s’appliquent.

Si une clause particulière contredit une clause générale, la clause particulière ne prévaut que pour le sujet et le parcours qu’elle vise. Les règles impératives de protection du consommateur restent applicables lorsqu’elles ne peuvent pas être écartées par contrat.`,
      en: `These Terms are interpreted together with Ivorian rules on electronic transactions, particularly when a user receives remote information, accepts a clause electronically, or retains a digital summary. Special terms should clearly identify the transaction to which they apply.

If special terms conflict with general terms, they prevail only for the subject and flow they cover. Mandatory consumer-protection rules continue to apply where they cannot be waived by contract.`,
    },
    3: {
      fr: `Les définitions évitent de confondre l’interface SendFlow, le prestataire réglementé et le bénéficiaire final. Cette distinction est importante pour déterminer qui reçoit une instruction, qui vérifie une identité, qui traite les fonds et qui répond d’un retard ou d’un refus.

Les échanges électroniques, journaux de connexion, confirmations et récapitulatifs peuvent servir à établir le déroulement d’un parcours, sous réserve de leur intégrité et des règles de preuve applicables. L’utilisateur doit conserver ses confirmations et références.`,
      en: `The definitions distinguish the SendFlow interface, the regulated provider, and the final recipient. This distinction matters for determining who receives an instruction, verifies identity, processes funds, and answers for a delay or refusal.

Electronic exchanges, connection logs, confirmations, and summaries may help establish what occurred in a flow, subject to their integrity and applicable evidence rules. Users should keep their confirmations and references.`,
    },
    4: {
      fr: `La qualification de SendFlow comme couche technologique ne permet pas de contourner les règles qui s’appliquent à une activité réellement exercée. Lorsqu’un parcours permet de donner une instruction de paiement ou de transfert, l’identité et le rôle du prestataire qui l’exécute doivent être présentés de manière compréhensible.

Les activités soumises au cadre UEMOA/BCEAO restent réalisées par l’acteur autorisé qui en assume la responsabilité. SendFlow ne garantit pas qu’un réseau, un corridor ou une devise restera disponible.`,
      en: `Describing SendFlow as a technology layer does not avoid rules applying to an activity actually performed. When a flow allows a payment or transfer instruction, the identity and role of the executing provider should be presented clearly.

Activities governed by the UEMOA/BCEAO framework remain the responsibility of the authorized actor performing them. SendFlow does not guarantee that a network, corridor, or currency will remain available.`,
    },
    5: {
      fr: `Les contrôles d’identité et de connaissance du client peuvent être exigés par le partenaire, par la réglementation applicable ou par les obligations de lutte contre le blanchiment des capitaux et le financement du terrorisme. Un refus de fournir un justificatif peut empêcher l’opération.

L’utilisateur doit répondre de la provenance des informations et documents qu’il transmet. L’utilisation d’une identité empruntée, la falsification d’un justificatif ou la création de comptes destinés à contourner un contrôle peut constituer une fraude et entraîner un signalement aux autorités compétentes.`,
      en: `Identity and know-your-customer checks may be required by a partner, applicable regulation, or anti-money-laundering and counter-terrorist-financing obligations. Refusing to provide a required document may prevent the transaction.

Users are responsible for the source of the information and documents they submit. Using another person’s identity, falsifying a document, or creating accounts to bypass a check may constitute fraud and may be reported to competent authorities.`,
    },
    6: {
      fr: `L’information précontractuelle doit permettre à l’utilisateur de comprendre le montant débité, les frais, le taux lorsqu’il est applicable, le délai indicatif et le montant susceptible d’être reçu. Les obligations d’information peuvent varier selon le partenaire et le pays de destination.

La validation électronique d’un récapitulatif ne corrige pas une erreur de bénéficiaire saisie par l’utilisateur. Une demande de correction ou d’annulation doit être formulée immédiatement ; son acceptation dépend de l’état de l’opération, du partenaire et des règles impératives applicables.`,
      en: `Pre-contract information should allow users to understand the amount debited, fees, applicable rate, indicative timing, and amount likely to be received. Information duties may vary by partner and destination country.

Electronic acceptance of a summary does not correct an incorrect recipient entered by the user. A correction or cancellation request must be made immediately; acceptance depends on the transaction’s status, the partner, and mandatory applicable rules.`,
    },
    7: {
      fr: `La protection du compte complète les obligations de sécurité prévues par la loi ivoirienne n° 2013-451 relative à la lutte contre la cybercriminalité. Toute tentative d’accès frauduleux, d’interception, de modification de données ou de contournement d’un dispositif de sécurité est interdite.

L’utilisateur doit signaler un incident sans détruire les éléments utiles : date, appareil, message reçu, référence et action observée. Il ne doit pas mener lui-même une intrusion ou une enquête technique sur les systèmes SendFlow.`,
      en: `Account protection complements the security obligations under Ivorian Law No. 2013-451 on combating cybercrime. Fraudulent access, interception, alteration of data, or bypassing a security measure is prohibited.

Users should report an incident without destroying useful evidence such as date, device, message, reference, and observed action. They must not conduct their own intrusion or technical investigation against SendFlow systems.`,
    },
    8: {
      fr: `Les utilisations interdites couvrent les infractions numériques, les atteintes aux systèmes, les escroqueries et les opérations destinées à dissimuler l’origine des fonds. Elles comprennent aussi le contournement des sanctions, restrictions de pays, plafonds et contrôles imposés par un partenaire.

Flow Digital SARL peut conserver les éléments nécessaires, suspendre l’accès, protéger les victimes et coopérer avec un partenaire ou une autorité lorsque le droit applicable l’exige. Une suspension de sécurité ne constitue pas une condamnation définitive de l’utilisateur.`,
      en: `Prohibited uses include cyber offences, attacks on systems, scams, and transactions intended to conceal the source of funds. They also include bypassing sanctions, country restrictions, limits, and partner controls.

Flow Digital SARL may retain necessary evidence, suspend access, protect victims, and cooperate with a partner or authority where applicable law requires it. A security suspension is not a final finding of liability against a user.`,
    },
    9: {
      fr: `La disponibilité est appréciée en tenant compte des réseaux de télécommunications, des opérateurs, des établissements de paiement, des contrôles réglementaires et des événements de force majeure. Un statut « en cours » ne signifie pas que le bénéficiaire a reçu les fonds.

Lorsque les informations d’un partenaire sont retardées ou incomplètes, SendFlow peut afficher un statut limité ou demander une vérification complémentaire. L’utilisateur doit utiliser la référence du partenaire pour toute contestation d’exécution.`,
      en: `Availability must be assessed in light of telecommunications networks, operators, payment institutions, regulatory checks, and force-majeure events. A “pending” status does not mean that the recipient has received the funds.

When partner information is delayed or incomplete, SendFlow may show a limited status or request additional verification. Users should use the partner reference for disputes about execution.`,
    },
    10: {
      fr: `Le traitement des données respecte la Politique de confidentialité et la loi ivoirienne n° 2013-450. Les communications nécessaires à une opération peuvent être envoyées même si l’utilisateur refuse les communications commerciales ; elles doivent rester limitées à leur finalité de sécurité ou de service.

L’utilisateur doit également respecter les droits des bénéficiaires et des tiers dont il transmet les coordonnées. Il ne doit pas utiliser SendFlow pour envoyer une communication trompeuse, menaçante, diffamatoire ou non sollicitée.`,
      en: `Data processing follows the Privacy Policy and Ivorian Law No. 2013-450. Communications necessary for a transaction may be sent even when a user declines marketing communications; they must remain limited to security or service purposes.

Users must also respect the rights of recipients and third parties whose details they provide. SendFlow must not be used to send misleading, threatening, defamatory, or unsolicited communications.`,
    },
    11: {
      fr: `La protection des créations s’apprécie notamment au regard du droit d’auteur, des marques et des droits applicables dans l’espace OAPI. Les éléments appartenant à un opérateur ou à un partenaire ne peuvent être réutilisés comme s’ils appartenaient à SendFlow.

La licence accordée à l’utilisateur est limitée à l’usage personnel et conforme du service. Elle ne permet pas de créer un service concurrent en copiant les écrans, les textes, les parcours, les bases ou les mécanismes de SendFlow.`,
      en: `Protection of creations is assessed in particular under copyright, trademark, and rights applicable in the OAPI area. Materials belonging to an operator or partner may not be reused as if they belonged to SendFlow.

The license granted to users is limited to personal and compliant use of the service. It does not allow them to create a competing service by copying SendFlow screens, text, flows, databases, or mechanisms.`,
    },
    12: {
      fr: `Une suspension peut être nécessaire pour respecter une demande d’autorité, les règles de lutte contre la fraude, les obligations de vigilance ou une mesure de sécurité. Lorsqu’une loi interdit de révéler un contrôle ou un signalement, l’information donnée à l’utilisateur peut rester générale.

La fermeture d’un compte ne supprime pas automatiquement les données qui doivent être conservées pour une obligation légale, une preuve, une réclamation ou une opération en cours. La suppression est effectuée lorsque les obligations de conservation cessent.`,
      en: `Suspension may be necessary to comply with an authority request, fraud-prevention rules, due-diligence obligations, or a security measure. Where law prohibits disclosure of a check or report, the explanation provided to the user may remain general.

Closing an account does not automatically delete data that must be kept for a legal obligation, evidence, a complaint, or a pending transaction. Deletion occurs when retention obligations end.`,
    },
    13: {
      fr: `Les limitations de responsabilité s’appliquent seulement dans la mesure autorisée par le droit ivoirien, le droit du pays de l’utilisateur et les règles impératives de protection du consommateur. Elles ne couvrent pas une faute qui ne peut légalement être exclue.

Le partenaire qui exécute le paiement peut être responsable de ses propres obligations réglementaires, de ses délais, de son service client et de la conservation des fonds. L’utilisateur doit distinguer une erreur d’interface, une erreur de saisie et un incident d’exécution.`,
      en: `Liability limits apply only to the extent permitted by Ivorian law, the law of the user’s country, and mandatory consumer-protection rules. They do not cover conduct that cannot legally be excluded.

The partner executing a payment may be responsible for its own regulatory duties, timing, customer service, and custody of funds. Users should distinguish an interface error, an input error, and an execution incident.`,
    },
    14: {
      fr: `Les réclamations sont examinées avec les informations disponibles et peuvent être transmises au partenaire qui détient les éléments d’exécution. Une réclamation ne doit pas contenir de secret d’authentification. Lorsque le différend concerne un prestataire réglementé, l’utilisateur peut également utiliser les mécanismes de réclamation prévus par ce prestataire et par le cadre applicable.

Les présentes conditions peuvent être modifiées pour une raison légale, technique, de sécurité ou de service. La version applicable à une opération déjà confirmée reste appréciée avec le récapitulatif et les conditions acceptées au moment de cette opération, sous réserve des règles impératives.`,
      en: `Complaints are reviewed using available information and may be sent to the partner holding execution records. A complaint must not contain authentication secrets. Where a dispute concerns a regulated provider, users may also use that provider’s complaint process and the applicable framework.

These Terms may change for legal, technical, security, or service reasons. The version applicable to an already confirmed transaction is assessed with the summary and terms accepted at the time, subject to mandatory rules.`,
    },
  },
  confidentialite: {
    1: {
      fr: `La loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel impose de distinguer le responsable qui détermine les finalités du traitement et le prestataire qui traite des données pour son compte. Flow Digital SARL documente cette distinction pour chaque fonctionnalité importante.

Lorsque la loi impose une formalité, une information ou une coopération avec l’ARTCI, Flow Digital SARL applique la procédure correspondant au traitement concerné. La présente politique ne désigne pas un partenaire comme sous-traitant ou responsable indépendant sans examen de son rôle réel.`,
      en: `Ivorian Law No. 2013-450 of June 19, 2013 on personal-data protection distinguishes the controller deciding the purposes of processing from a provider processing data on its behalf. Flow Digital SARL documents this distinction for each important feature.

Where law requires a filing, notice, or cooperation with ARTCI, Flow Digital SARL follows the procedure corresponding to the relevant processing. This policy does not label a partner as a processor or independent controller without assessing its actual role.`,
    },
    2: {
      fr: `Le périmètre permet de savoir quelle politique consulter lorsqu’une donnée quitte l’interface SendFlow pour être traitée par un opérateur ou un établissement de paiement. Le partenaire peut fournir une information complémentaire avant de recueillir une pièce d’identité, un moyen de paiement ou une donnée de bénéficiaire.

En cas de contradiction, la politique qui décrit le traitement direct réalisé par le partenaire s’applique à ce traitement, tandis que la présente politique reste applicable aux traitements réalisés par Flow Digital SARL.`,
      en: `The scope identifies which policy to consult when data leaves the SendFlow interface and is processed by an operator or payment institution. A partner may provide additional information before collecting an identity document, payment method, or recipient data.

If policies conflict, the policy describing processing directly performed by the partner applies to that processing, while this policy remains applicable to processing performed by Flow Digital SARL.`,
    },
    3: {
      fr: `La collecte est limitée aux informations nécessaires à une finalité déterminée : une donnée d’identité sert à vérifier une personne, une référence sert à rapprocher une opération et une donnée technique sert à protéger un compte. Flow Digital SARL ne doit pas demander un document ou un identifiant sensible sans raison liée au service, à la sécurité ou à une obligation légale.

Les données de bénéficiaires sont particulièrement sensibles dans un parcours de transfert. L’utilisateur doit vérifier leur exactitude et disposer d’une base légitime pour les transmettre ; Flow Digital SARL peut limiter leur usage au traitement de la demande.`,
      en: `Collection is limited to information needed for a defined purpose: identity data verifies a person, a reference reconciles a transaction, and technical data protects an account. Flow Digital SARL should not request a document or sensitive identifier without a service, security, or legal reason.

Recipient data is particularly sensitive in a transfer flow. Users must check its accuracy and have a lawful basis to provide it; Flow Digital SARL may limit its use to handling the request.`,
    },
    4: {
      fr: `Lorsqu’une donnée est reçue d’un partenaire ou d’un tiers, Flow Digital SARL cherche à conserver une information exacte, pertinente et obtenue dans un cadre autorisé. L’utilisateur ne doit pas transmettre les coordonnées d’une personne à des fins étrangères à l’opération.

Les sources techniques peuvent produire des journaux automatiques, mais ces journaux ne doivent pas être utilisés pour surveiller une personne au-delà de la sécurité, du fonctionnement, de la preuve ou de la conformité du service.`,
      en: `When data is received from a partner or third party, Flow Digital SARL seeks to keep it accurate, relevant, and obtained within an authorized framework. Users must not provide someone’s details for purposes unrelated to the transaction.

Technical sources may create automatic logs, but those logs should not be used to monitor a person beyond service security, operation, evidence, or compliance.`,
    },
    5: {
      fr: `Les finalités sont séparées pour éviter qu’un consentement donné pour recevoir un service soit automatiquement traité comme un consentement publicitaire. Les traitements nécessaires à la sécurité, à la vérification, à la preuve et au respect d’une obligation peuvent reposer sur une base différente du consentement.

Lorsque le consentement est utilisé, il doit être demandé de manière compréhensible et pouvoir être retiré aussi facilement que possible. Le retrait ne remet pas en cause les traitements réalisés avant celui-ci et ne permet pas toujours de poursuivre une fonctionnalité qui en dépend.`,
      en: `Purposes are separated so that consent to receive a service is not automatically treated as consent to marketing. Processing needed for security, verification, evidence, or a legal obligation may rely on a basis other than consent.

Where consent is used, it should be requested clearly and be capable of being withdrawn as easily as possible. Withdrawal does not affect processing already performed and may prevent a feature that depends on that consent from continuing.`,
    },
    6: {
      fr: `Les données de paiement et les informations de transfert doivent être traitées selon le principe de nécessité et selon le rôle de l’acteur réglementé. SendFlow ne doit pas demander de code secret pour « débloquer » une opération et ne doit pas conserver un secret qui n’est pas nécessaire à son fonctionnement.

Les informations financières peuvent être soumises à des obligations de vigilance, de conservation, de rapprochement ou de signalement appliquées par un établissement ou un partenaire selon le cadre BCEAO/UEMOA. La durée et le responsable du traitement peuvent donc différer selon le parcours.`,
      en: `Payment and transfer data should be processed under necessity and according to the role of the regulated actor. SendFlow must not ask for a secret code to “unlock” a transaction and should not retain a secret that is not needed for its operation.

Financial information may be subject to due-diligence, retention, reconciliation, or reporting duties applied by an institution or partner under the BCEAO/UEMOA framework. The retention period and controller may therefore vary by flow.`,
    },
    7: {
      fr: `Tout prestataire qui reçoit des données pour le compte de Flow Digital SARL doit recevoir des instructions compatibles avec la finalité, la confidentialité, la sécurité, la conservation et la suppression. Les accès doivent être limités aux personnes et systèmes qui en ont besoin.

Un partenaire qui détermine lui-même la finalité de son traitement peut être responsable de ce traitement. Dans ce cas, son identité, sa politique et ses canaux d’exercice des droits doivent être communiqués lorsqu’ils sont nécessaires à une information loyale.`,
      en: `A provider receiving data for Flow Digital SARL must receive instructions consistent with purpose, confidentiality, security, retention, and deletion. Access should be limited to people and systems that need it.

A partner deciding its own processing purpose may be responsible for that processing. In that case, its identity, policy, and rights channels should be provided where needed for fair information.`,
    },
    8: {
      fr: `Un transfert hors de Côte d’Ivoire ne constitue pas une autorisation générale de communiquer toutes les données. Il doit rester limité à une finalité, à des destinataires identifiés et à des garanties de sécurité adaptées.

Les utilisateurs doivent pouvoir comprendre, lorsque cela est pertinent, le pays ou la région dans laquelle un prestataire technique ou un partenaire peut traiter leurs données. Les obligations locales du pays destinataire peuvent compléter celles de la Côte d’Ivoire.`,
      en: `A transfer outside Côte d’Ivoire is not a general authorization to disclose all data. It must remain limited to a purpose, identified recipients, and appropriate security safeguards.

Where relevant, users should be able to understand the country or region where a technical provider or partner may process their data. Local rules in the destination country may supplement those of Côte d’Ivoire.`,
    },
    9: {
      fr: `La conservation doit être documentée par catégorie et par finalité. Une donnée utile à la fourniture immédiate du service ne doit pas être conservée indéfiniment simplement parce qu’elle a été collectée.

Une durée plus longue peut être nécessaire pour une preuve de transaction, une obligation comptable ou fiscale, une exigence de lutte contre le blanchiment, une enquête de fraude ou la défense d’un droit en justice. À l’issue de cette durée, la donnée doit être supprimée, anonymisée ou rendue inaccessible selon la procédure applicable.`,
      en: `Retention should be documented by category and purpose. Data useful for immediate service delivery should not be kept indefinitely merely because it was collected.

A longer period may be necessary for transaction evidence, accounting or tax duties, anti-money-laundering requirements, fraud investigation, or defending a legal claim. At the end of that period, data should be deleted, anonymized, or made inaccessible under the applicable procedure.`,
    },
    10: {
      fr: `La sécurité doit être proportionnée à la nature des données et au risque d’un accès non autorisé. Elle comprend notamment la gestion des habilitations, la séparation des environnements, la journalisation, la correction des vulnérabilités, la sauvegarde et la procédure de réponse aux incidents.

La loi ivoirienne n° 2013-451 relative à la lutte contre la cybercriminalité renforce l’importance de la protection des systèmes et des preuves numériques. Aucun dispositif ne supprime tout risque : les utilisateurs doivent protéger leurs comptes et signaler rapidement un incident.`,
      en: `Security should be proportionate to the nature of the data and the risk of unauthorized access. It includes access management, environment separation, logging, vulnerability remediation, backups, and incident response.

Ivorian Law No. 2013-451 on combating cybercrime reinforces the importance of protecting systems and digital evidence. No measure removes every risk: users must protect their accounts and promptly report incidents.`,
    },
    11: {
      fr: `Les cookies nécessaires au fonctionnement, à la sécurité et au maintien d’une session ne doivent pas être confondus avec les outils de mesure, de personnalisation ou de publicité. Chaque catégorie doit être décrite avec une finalité compréhensible et, lorsque cela est requis, soumise au choix de l’utilisateur.

Le refus d’un outil non nécessaire ne doit pas empêcher l’accès à un service essentiel. La suppression des cookies peut toutefois fermer une session ou obliger l’utilisateur à réinitialiser une préférence.`,
      en: `Cookies necessary for operation, security, and session maintenance should be distinguished from analytics, personalization, or advertising tools. Each category should have a clear purpose and, where required, be subject to the user’s choice.

Refusing a non-essential tool should not prevent access to an essential service. Deleting cookies may nevertheless close a session or require a preference to be set again.`,
    },
    12: {
      fr: `Les droits d’accès, de rectification et d’opposition doivent être exercés de façon suffisamment précise pour permettre une réponse utile. Une demande de suppression peut être refusée ou limitée lorsque la conservation est imposée par une obligation légale, la preuve d’une opération, la sécurité ou la défense d’un droit.

Flow Digital SARL répond dans le délai prévu par le cadre applicable ou, lorsque cela est nécessaire, explique la raison d’une prolongation. Une personne qui estime sa demande mal traitée peut utiliser les voies de réclamation prévues par le droit ivoirien, notamment auprès de l’autorité compétente.`,
      en: `Access, correction, and objection requests should be specific enough to allow a useful response. A deletion request may be refused or limited where retention is required for a legal obligation, transaction evidence, security, or defense of a claim.

Flow Digital SARL responds within the period required by the applicable framework or explains the reason for an extension where necessary. A person who believes a request was mishandled may use complaint channels under Ivorian law, including the competent authority.`,
    },
    13: {
      fr: `Les services de transfert et les contrôles d’identité peuvent être réservés aux personnes ayant la capacité juridique requise. Les informations d’un mineur ne doivent pas être utilisées pour contourner une règle d’âge, un contrôle de bénéficiaire ou une restriction de paiement.

Si un représentant légal contacte Flow Digital SARL, des justificatifs peuvent être nécessaires avant toute communication ou suppression. La protection du mineur doit être conciliée avec les obligations de preuve et de sécurité.`,
      en: `Transfer services and identity checks may be limited to people with the required legal capacity. A child’s information must not be used to bypass an age rule, recipient check, or payment restriction.

If a legal representative contacts Flow Digital SARL, supporting documents may be required before disclosure or deletion. Child protection must be balanced with evidence and security obligations.`,
    },
    14: {
      fr: `Un contrôle automatisé peut produire un signal de risque, mais un signal n’est pas nécessairement une décision juridique ou une preuve de fraude. Les résultats doivent être contrôlés selon le risque et les procédures du partenaire compétent.

Lorsqu’une décision a un effet important sur une personne, les informations disponibles sur la logique générale du contrôle, la possibilité d’un examen humain et le canal de contestation doivent être présentées dans le parcours ou par le partenaire responsable.`,
      en: `An automated control may produce a risk signal, but a signal is not necessarily a legal decision or proof of fraud. Results should be reviewed according to risk and the procedures of the responsible partner.

When a decision has a significant effect on a person, information about the general logic of the control, the possibility of human review, and the challenge channel should be provided in the flow or by the responsible partner.`,
    },
    15: {
      fr: `La réponse à un incident doit rechercher la nature des données touchées, les personnes exposées, la cause, la mesure de confinement et le risque de réutilisation. Les notifications aux personnes, partenaires ou autorités sont effectuées lorsque le cadre applicable ou le risque le justifie.

La politique est mise à jour lorsqu’une fonctionnalité, un partenaire, une base légale ou une pratique de conservation change. Une modification importante doit être rendue visible et, lorsque cela est requis, soumise à un nouveau consentement.`,
      en: `Incident response should assess the data affected, people exposed, cause, containment, and risk of reuse. Notifications to people, partners, or authorities are made where the applicable framework or risk requires them.

The policy is updated when a feature, partner, legal basis, or retention practice changes. A material change should be made visible and, where required, submitted for renewed consent.`,
    },
  },
};

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE landing_site_settings SET company_name = COALESCE(NULLIF(company_name, ''), 'Flow Digital SARL'), legal_form = COALESCE(NULLIF(legal_form, ''), 'Société à responsabilité limitée'), legal_address = COALESCE(NULLIF(legal_address, ''), 'Immeuble Horizon, Boulevard Latrille, Cocody, Abidjan, Côte d’Ivoire'), legal_email = COALESCE(NULLIF(legal_email, ''), 'legal@sendflow.studio'), footer_address_flag = COALESCE(NULLIF(footer_address_flag, ''), '🇨🇮'), footer_address_country = COALESCE(NULLIF(footer_address_country, ''), 'Côte d’Ivoire'), footer_address = COALESCE(NULLIF(footer_address, ''), 'Immeuble Horizon, Boulevard Latrille, Cocody'), regulator_name_fr = COALESCE(NULLIF(regulator_name_fr, ''), 'Autorité financière régionale'), regulator_name_en = COALESCE(NULLIF(regulator_name_en, ''), 'Regional financial authority')`);
    await client.query(`UPDATE landing_countries SET hero_position_x = CASE code WHEN 'CI' THEN 7 WHEN 'BJ' THEN 78 WHEN 'TG' THEN 95 WHEN 'CM' THEN 34 ELSE hero_position_x END, hero_position_y = CASE code WHEN 'CI' THEN 53 WHEN 'BJ' THEN 24 WHEN 'TG' THEN 54 WHEN 'CM' THEN 84 ELSE hero_position_y END WHERE hero_position_x IS NULL OR hero_position_y IS NULL`);

    for (const [key, group, fr, en] of content) {
      for (const [locale, value] of [["fr", fr], ["en", en]]) {
        await client.query(`INSERT INTO landing_content (content_key, locale, "group", value) VALUES ($1, $2, $3, $4) ON CONFLICT (content_key, locale) DO NOTHING`, [key, locale, group, value]);
      }
    }

    const refreshLegalContent = process.env.REFRESH_LEGAL_CONTENT === "true";
    for (const [slug, sections] of Object.entries(legalSections)) {
      const page = await client.query("SELECT id FROM legal_pages WHERE slug = $1 LIMIT 1", [slug]);
      if (!page.rows[0]) continue;
      const existing = await client.query("SELECT order_index FROM legal_sections WHERE page_id = $1", [page.rows[0].id]);
      const existingOrderIndexes = new Set(existing.rows.map((row) => Number(row.order_index)));
      const enrichedSections = sections.map(([sectionNumber, titleFr, titleEn, bodyFr, bodyEn]) => {
        const enhancement = legalIvorianEnhancements[slug]?.[sectionNumber];
        if (!enhancement) return [sectionNumber, titleFr, titleEn, bodyFr, bodyEn];
        return [sectionNumber, titleFr, titleEn, `${bodyFr}\n\n${enhancement.fr}`, `${bodyEn}\n\n${enhancement.en}`];
      });
      for (const [sectionNumber, titleFr, titleEn, bodyFr, bodyEn] of enrichedSections) {
        if (existingOrderIndexes.has(sectionNumber)) {
          if (refreshLegalContent) {
            await client.query(
              `UPDATE legal_sections
               SET section_number = $2, title_fr = $3, title_en = $4, body_fr = $5, body_en = $6, updated_at = NOW()
               WHERE page_id = $1 AND order_index = $2`,
              [page.rows[0].id, sectionNumber, titleFr, titleEn, bodyFr, bodyEn],
            );
          }
          continue;
        }
        await client.query(
          `INSERT INTO legal_sections (page_id, section_number, title_fr, title_en, body_fr, body_en, order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$2)`,
          [page.rows[0].id, sectionNumber, titleFr, titleEn, bodyFr, bodyEn],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
