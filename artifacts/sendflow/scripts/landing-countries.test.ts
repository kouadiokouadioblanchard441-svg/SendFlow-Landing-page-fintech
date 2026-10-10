import assert from 'node:assert/strict';
import test from 'node:test';
import { getActiveLandingCountries, type LandingCountryView } from '../src/lib/landingCountries.ts';

const fallback: LandingCountryView[] = [{
  name: 'Côte d’Ivoire',
  code: 'CI',
  networks: ['Orange Money'],
  flag: '🇨🇮',
  tone: '#dbeaff',
  heroPositionX: null,
  heroPositionY: null,
}];

test('uses local defaults only before the public bundle is available', () => {
  assert.deepEqual(getActiveLandingCountries(undefined, 'fr', fallback), fallback);
});

test('an empty published country list stays empty instead of restoring hidden defaults', () => {
  const result = getActiveLandingCountries({
    countries: [],
    operators: [],
    countryOperators: [],
  }, 'fr', fallback);

  assert.deepEqual(result, []);
});

test('maps visible countries to visible, ordered operators and selected language', () => {
  const result = getActiveLandingCountries({
    countries: [
      { id: 1, code: 'CV', nameFr: 'Cap-Vert', nameEn: 'Cape Verde', flag: '🇨🇻', tone: '#dbeaff', heroPositionX: 20, heroPositionY: 30, isVisible: true },
      { id: 2, code: 'GH', nameFr: 'Ghana', nameEn: 'Ghana', flag: '🇬🇭', tone: '#dbeaff', heroPositionX: null, heroPositionY: null, isVisible: false },
    ],
    operators: [
      { id: 10, name: 'CVMóvel', isVisible: true },
      { id: 11, name: 'Unitel T+', isVisible: true },
      { id: 12, name: 'Brouillon', isVisible: false },
    ],
    countryOperators: [
      { countryId: 1, operatorId: 11, orderIndex: 1 },
      { countryId: 1, operatorId: 12, orderIndex: 2 },
      { countryId: 1, operatorId: 10, orderIndex: 0 },
      { countryId: 2, operatorId: 10, orderIndex: 0 },
    ],
  }, 'en', fallback);

  assert.deepEqual(result, [{
    name: 'Cape Verde',
    code: 'CV',
    networks: ['CVMóvel', 'Unitel T+'],
    flag: '🇨🇻',
    tone: '#dbeaff',
    heroPositionX: 20,
    heroPositionY: 30,
  }]);
});
