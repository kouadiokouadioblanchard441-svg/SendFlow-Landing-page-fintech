import aboutHeroWoman from '@assets/file_0000000078c88210a7a3043febb33e01_1789621535794.png';
import professional01 from '@assets/generated_images/sendflow-about-professional-01-screen.png';
import professional02 from '@assets/generated_images/sendflow-about-professional-02-screen.png';
import professional03 from '@assets/generated_images/sendflow-about-professional-03-screen.png';
import professional04 from '@assets/generated_images/sendflow-about-professional-04-screen.png';
import professional05 from '@assets/generated_images/sendflow-about-professional-05-screen.png';

export const ABOUT_HERO_ASSETS = [
  {
    key: 'about-hero-woman',
    label: 'Portrait de présentation actuel',
    src: aboutHeroWoman,
    altFr: 'Portrait illustratif d’une professionnelle présentant un téléphone SendFlow',
    altEn: 'Illustrative portrait of a professional woman presenting a SendFlow phone',
  },
  {
    key: 'sendflow-about-professional-01',
    label: 'Professionnelle 01',
    src: professional01,
    altFr: 'Portrait illustratif d’une professionnelle présentant l’écran violet de vérification SendFlow',
    altEn: 'Illustrative portrait of a woman professional presenting the purple SendFlow review screen',
  },
  {
    key: 'sendflow-about-professional-02',
    label: 'Professionnel 02',
    src: professional02,
    altFr: 'Portrait illustratif d’un professionnel présentant l’écran violet de vérification SendFlow',
    altEn: 'Illustrative portrait of a man professional presenting the purple SendFlow review screen',
  },
  {
    key: 'sendflow-about-professional-03',
    label: 'Professionnelle 03',
    src: professional03,
    altFr: 'Portrait illustratif d’une professionnelle présentant l’écran violet de vérification SendFlow',
    altEn: 'Illustrative portrait of a woman professional presenting the purple SendFlow review screen',
  },
  {
    key: 'sendflow-about-professional-04',
    label: 'Professionnel 04',
    src: professional04,
    altFr: 'Portrait illustratif d’un professionnel présentant l’écran violet de vérification SendFlow',
    altEn: 'Illustrative portrait of a man professional presenting the purple SendFlow review screen',
  },
  {
    key: 'sendflow-about-professional-05',
    label: 'Professionnelle 05',
    src: professional05,
    altFr: 'Portrait illustratif d’une entrepreneuse présentant l’écran violet de vérification SendFlow',
    altEn: 'Illustrative portrait of a woman entrepreneur presenting the purple SendFlow review screen',
  },
] as const;

export const ABOUT_HERO_ASSET_BY_KEY: Record<string, (typeof ABOUT_HERO_ASSETS)[number]> =
  Object.fromEntries(ABOUT_HERO_ASSETS.map((asset) => [asset.key, asset]));
