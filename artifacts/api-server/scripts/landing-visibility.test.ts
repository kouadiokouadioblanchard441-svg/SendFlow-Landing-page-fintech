import assert from "node:assert/strict";
import test from "node:test";
import { filterPublicLandingBundle } from "../src/lib/landingVisibility.ts";

test("public landing data includes only explicitly visible rows and valid visible relations", () => {
  const bundle = {
    media: [
      { id: 1, slug: "public", isVisible: true, internalNotes: "private" },
      { id: 2, isVisible: false },
      { id: 3 },
    ],
    content: [{ contentKey: "public", isVisible: true }, { contentKey: "draft", isVisible: false }],
    sections: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    features: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    faqs: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    countries: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    operators: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    countryOperators: [
      { countryId: 1, operatorId: 1, orderIndex: 2, internalNote: "private" },
      { countryId: 2, operatorId: 1, orderIndex: 1 },
      { countryId: 1, operatorId: 2, orderIndex: 3 },
    ],
    globeBadges: [
      { id: 1, operatorId: 1, isVisible: true },
      { id: 2, operatorId: 2, isVisible: true },
      { id: 3, operatorId: 1, isVisible: false },
    ],
    legalPages: [{ id: 1, isVisible: true }, { id: 2, isVisible: false }],
    legalSections: [{ id: 1, pageId: 1, sectionNumber: 1, internalNote: "private" }, { id: 2, pageId: 2 }],
    founder: { id: 1, isVisible: false, passwordHash: "private" },
    settings: { id: 1, companyName: "SendFlow", sessionSecret: "private", updatedAt: new Date() },
  };

  const publicBundle = filterPublicLandingBundle(bundle);

  assert.deepEqual(publicBundle.media.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.content.map((row) => row.contentKey), ["public"]);
  assert.deepEqual(publicBundle.sections.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.features.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.faqs.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.countries.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.operators.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.countryOperators, [{ countryId: 1, operatorId: 1, orderIndex: 2 }]);
  assert.deepEqual(publicBundle.globeBadges.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.legalPages.map((row) => row.id), [1]);
  assert.deepEqual(publicBundle.legalSections, [{ id: 1, pageId: 1, sectionNumber: 1 }]);
  assert.equal(publicBundle.founder, null);
  assert.deepEqual(publicBundle.media, [{ id: 1, slug: "public", isVisible: true }]);
  assert.deepEqual(publicBundle.settings, { id: 1, companyName: "SendFlow" });
  assert.equal("sessionSecret" in publicBundle.settings!, false);
  assert.equal("updatedAt" in publicBundle.settings!, false);
  assert.equal("passwordHash" in (publicBundle.founder ?? {}), false);
  assert.equal("unexpectedFutureField" in publicBundle, false);
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

test("public projections return only allowlisted fields from visible founder and settings rows", () => {
  const bundle = {
    media: [], content: [], sections: [], features: [], faqs: [],
    countries: [], operators: [], countryOperators: [], globeBadges: [],
    legalPages: [], legalSections: [],
    founder: {
      name: "Founder",
      id: 1,
      email: "public@example.org",
      isVisible: true,
      passwordHash: "must-not-leak",
      lastLoginAt: new Date(),
    },
    settings: {
      supportEmail: "support@example.org",
      id: 1,
      whatsappUrl: "https://wa.me/000",
      apiCredential: "must-not-leak",
      updatedAt: new Date(),
    },
  };

  const publicBundle = filterPublicLandingBundle(bundle);

  assert.deepEqual(publicBundle.founder, {
    id: 1,
    name: "Founder",
    email: "public@example.org",
    isVisible: true,
  });
  assert.deepEqual(publicBundle.settings, {
    id: 1,
    supportEmail: "support@example.org",
    whatsappUrl: "https://wa.me/000",
  });
});
