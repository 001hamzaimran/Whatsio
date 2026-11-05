import test from "node:test";
import assert from "node:assert/strict";

import { formatWhatsAppPhone } from "./phone.js";

test("formats local and international numbers without duplicating the country code", () => {
  assert.equal(formatWhatsAppPhone("5551234567", "+1"), "15551234567");
  assert.equal(formatWhatsAppPhone("+15551234567", "+1"), "15551234567");
  assert.equal(formatWhatsAppPhone("15551234567", "+1"), "15551234567");
  assert.equal(formatWhatsAppPhone("03112895370", "+92"), "923112895370");
});

test("builds the reviewer URL with one country code", () => {
  const phone = formatWhatsAppPhone("15551234567", "+1");
  assert.equal(`https://wa.me/${phone}`, "https://wa.me/15551234567");
});
