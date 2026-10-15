import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const module = { exports: {} };
const source = ts.transpile(fs.readFileSync('components/email-campaigns.tsx', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX });
vm.runInNewContext(source, { exports: module.exports, require: () => ({}), Date, Intl, Map, Error, AbortSignal });
const ui = module.exports;
const now = new Date('2026-10-12T09:00:00Z').getTime();

test('Campaign schedules convert the selected local time to the corresponding UTC instant', () => {
  const time = now + 20 * 60_000;
  assert.equal(ui.campaignScheduleIso(ui.localCampaignDate(time), now), new Date(time).toISOString());
});

test('Campaign schedule allows five-minute and 30-day boundaries while rejecting past and excessive delays', () => {
  for (const delta of [5 * 60_000, 30 * 86_400_000]) assert.equal(ui.campaignScheduleIso(ui.localCampaignDate(now + delta), now), new Date(now + delta).toISOString());
  for (const delta of [-60_000, 4 * 60_000, 30 * 86_400_000 + 60_000]) assert.throws(() => ui.campaignScheduleIso(ui.localCampaignDate(now + delta), now));
});

test('Malformed and calendar-normalized local dates cannot silently schedule a different day', () => {
  for (const value of ['', 'tomorrow', '2026-10-12', '2026-10-12T12:00:00Z', '2026-02-30T12:00', '2026-13-12T12:00', '2026-10-12T25:00']) assert.throws(() => ui.campaignScheduleIso(value, now));
});

test('A nonexistent daylight-saving local time is rejected rather than moved forward silently', () => {
  const previous = process.env.TZ;
  try { process.env.TZ = 'America/New_York'; assert.throws(() => ui.campaignScheduleIso('2027-03-14T02:30', new Date('2027-03-13T12:00:00Z').getTime()), /does not exist/); }
  finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('Only confirmed draft status permits editing; unknown and delivery statuses remain locked', () => {
  assert.equal(ui.campaignCanEdit('draft'), true);
  for (const status of ['unknown', 'queued', 'scheduled', 'sent', 'canceled', 'deleted', 'failed', '', 'DRAFT']) assert.equal(ui.campaignCanEdit(status), false, status);
});

test('Cancellation is available only for queued and scheduled provider states', () => {
  assert.equal(ui.campaignCanCancel('queued'), true); assert.equal(ui.campaignCanCancel('scheduled'), true);
  for (const status of ['unknown', 'draft', 'sent', 'canceled', 'deleted', 'failed']) assert.equal(ui.campaignCanCancel(status), false, status);
});
