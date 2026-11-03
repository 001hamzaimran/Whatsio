import test from "node:test";
import assert from "node:assert/strict";

import { normalizeCountryCode, normalizePhone } from "./phone.js";

test("normalizes Pakistan local and international WhatsApp numbers", () => {
  assert.equal(normalizePhone("03112895370", "+92"), "923112895370");
  assert.equal(normalizePhone("3112895370", "92"), "923112895370");
  assert.equal(normalizePhone("+92 311 2895370", "92"), "923112895370");
  assert.equal(normalizePhone("923112895370", "92"), "923112895370");
});

test("uses the configured calling code for other countries", () => {
  assert.equal(normalizePhone("(555) 123-4567", "+1"), "15551234567");
  assert.equal(normalizePhone("020 7946 0958", "+44"), "442079460958");
});

test("rejects invalid numbers and calling codes", () => {
  assert.equal(normalizeCountryCode("+92"), "92");
  assert.equal(normalizeCountryCode("+012"), "");
  assert.equal(normalizePhone("not-a-number", "+92"), "");
  assert.equal(normalizePhone("03112895370", ""), "");
});
