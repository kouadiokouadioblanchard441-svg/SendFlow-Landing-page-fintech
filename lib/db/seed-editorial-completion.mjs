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
      for (const [sectionNumber, titleFr, titleEn, bodyFr, bodyEn] of sections) {
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
