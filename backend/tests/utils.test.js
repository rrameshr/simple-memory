import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTags, escapeRegex } from "../src/utils/text.js";
import { nextOccurrence, daysBetween } from "../src/utils/dates.js";
import { hashToken, randomToken, inviteCode } from "../src/utils/tokens.js";

test("parseTags normalises, de-duplicates and limits", () => {
  assert.deepEqual(parseTags("Beach, #beach , Sunset,, "), ["beach", "sunset"]);
  assert.deepEqual(parseTags(["Paris", "paris", "  Trip "]), ["paris", "trip"]);
  assert.equal(parseTags(Array.from({ length: 40 }, (_, i) => `t${i}`)).length, 15);
  assert.deepEqual(parseTags(undefined), []);
});

test("escapeRegex neutralises regex metacharacters", () => {
  assert.equal(new RegExp(escapeRegex("a.b(c)*")).test("a.b(c)*"), true);
  assert.equal(new RegExp(escapeRegex("a.b")).test("axb"), false);
});

test("nextOccurrence handles recurring and one-off dates", () => {
  const now = new Date("2026-11-12T10:00:00Z");
  assert.equal(nextOccurrence("2020-11-20", true, now).toISOString().slice(0, 10), "2026-11-20");
  assert.equal(nextOccurrence("2020-11-05", true, now).toISOString().slice(0, 10), "2027-11-05");
  assert.equal(nextOccurrence("2026-11-12", true, now).toISOString().slice(0, 10), "2026-11-12"); // today counts
  assert.equal(nextOccurrence("2026-01-01", false, now), null);
  assert.equal(nextOccurrence("2027-01-01", false, now).toISOString().slice(0, 10), "2027-01-01");
});

test("daysBetween", () => {
  assert.equal(daysBetween(new Date("2026-11-12"), new Date("2026-11-20")), 8);
});

test("tokens are random and hashing is deterministic", () => {
  assert.notEqual(randomToken(), randomToken());
  assert.equal(hashToken("abc"), hashToken("abc"));
  assert.notEqual(hashToken("abc"), "abc");
  assert.match(inviteCode(), /^[0-9A-F]{10}$/);
});
