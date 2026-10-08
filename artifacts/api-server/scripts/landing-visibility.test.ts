import assert from "node:assert/strict";
import test from "node:test";
import { filterPublicLandingBundle } from "../src/lib/landingVisibility.ts";

test("public landing data includes only explicitly visible rows and valid visible relations", () => {
  const bundle = {
    media: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }, { id: 3 }],
    content: [{ contentKey: "public", isVisible: true }, { contentKey: "draft", isVisible: false }],
    sections: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    features: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    faqs: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    countries: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    operators: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    countryOperators: [
      { countryId: 1, operatorId: 1 },
      { countryId: 2, operatorId: 1 },
      { countryId: 1, operatorId: 2 },
    ],
    globeBadges: [
      { id: 1, operatorId: 1, isVisible: true },
      { id: 2, operatorId: 2, isVisible: true },
      { id: 3, operatorId: 1, isVisible: false },
    ],
    legalPages: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    legalSections: [{ pageId: 1 }, { pageId: 2 }],
    founder: { id: 1, isVisible: false },
    settings: { companyName: "SendFlow" },
  };

  const publicBundle = filterPublicLandingBundle(bundle);

  assert.deepEqual(publicBundle.media.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.content.map((row) => row.contentKey), ["public"]);
  assert.deepEqual(publicBundle.sections.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.features.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.faqs.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.countries.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.operators.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.countryOperators, [{ countryId: 1, operatorId: 1 }]);
  assert.deepEqual(publicBundle.globeBadges.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.legalPages.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.legalSections, [{ pageId: 1 }]);
  assert.equal(publicBundle.founder, null);
  assert.deepEqual(publicBundle.settings, bundle.settings);
});

test("a founder profile without an explicit visible flag is private", () => {
  const bundle = {
    media: [], content: [], sections: [], features: [], faqs: [],
    countries: [], operators: [], countryOperators: [], globeBadges: [],
    legalPages: [], legalSections: [],
    founder: { id: 1 },
    settings: null,
  };

  assert.equal(filterPublicLandingBundle(bundle).founder, null);
});
