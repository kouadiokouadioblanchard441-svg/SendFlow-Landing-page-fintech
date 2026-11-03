import orangeOperatorLogo from '../assets/operator-logos/operator-logo-01.png';
import moovOperatorLogo from '../assets/operator-logos/operator-logo-02.png';
import waveOperatorLogo from '../assets/operator-logos/operator-logo-03.png';
import momoMtnOperatorLogo from '../assets/operator-logos/operator-logo-momo-mtn.png';

export type FeeOperatorFallbackLogo = {
  mark: string;
  background: string;
  foreground: string;
  image: string;
};

export const feeOperatorLogoBySlug: Partial<Record<string, FeeOperatorFallbackLogo>> = {
  orange: { mark: '', background: '#ff7900', foreground: '#ffffff', image: orangeOperatorLogo },
  mtn: { mark: 'MTN', background: '#ffca05', foreground: '#17131f', image: momoMtnOperatorLogo },
  'moov-africa': { mark: 'moov', background: '#e83e8c', foreground: '#ffffff', image: moovOperatorLogo },
  wave: { mark: '⌁', background: '#1769ff', foreground: '#ffffff', image: waveOperatorLogo },
};
