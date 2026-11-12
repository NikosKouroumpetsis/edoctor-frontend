import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot } from './source-scan';

/**
 * 🔴 Wave 4.0 · the patient's words (U-140: the prototypes' texts, verbatim; the orchestrator's D-W4-xx), read from the
 * catalogs the site compiles: what a decision changed must not drift back. The calendar's words are the email's own,
 * read where they live (the backend's template, the `server-rules` way): a server that says it otherwise fails here.
 */
type Catalog = Record<string, string>;

const readCatalog = (locale: 'el' | 'en'): Catalog =>
	JSON.parse(readFileSync(join(projectRoot, `messages/${locale}.json`), 'utf8')) as Catalog;

const readCalendarInvite = () =>
	readFileSync(
		join(
			projectRoot,
			'../backend/src/modules/notification/domain/templates/calendar-invite/index.ts'
		),
		'utf8'
	);

/** The email's neutral summary and its description, in a language (`{{name}}` the doctor). */
function emailCalendarWords(template: string, locale: 'el' | 'en') {
	const block = template.slice(template.indexOf(`${locale}: {`));
	const field = (name: string) => new RegExp(`${name}:\\s*'([^']*)'`, 'u').exec(block)?.[1] ?? '';
	const summary =
		locale === 'el'
			? (/\{\{\^withDoctor\}\}(.*?)\{\{\/withDoctor\}\}/u.exec(field('summaryWithDoctor'))?.[1] ??
				'')
			: field('summaryWithDoctor');
	return { summary: summary.replace('{{name}}', '{doctor}'), description: field('description') };
}

const D_W4_12 = {
	ratings_done_body: 'Ευχαριστούμε. Η ομάδα του eDoctor την ελέγχει πριν δημοσιευτεί.',
	ratings_mine_say_pending: 'Η ομάδα του eDoctor την ελέγχει πριν δημοσιευτεί.'
};
const D_W4_14 =
	'Συνδεθείτε για να βλέπετε τα ραντεβού σας, να αλλάζετε την ώρα και να τα ακυρώνετε.';
/**
 * 🔴 U-139.6 (the owner, Ε5 = Α; review w4-w1 R1 MINOR-2): under a relative's mobile, who gets called and who gets told
 * — the office calls the relative, the notifications reach the holder. A promise to the patient: it must not drift back
 * to screen 30's old «Για να ειδοποιηθεί ο συγγενής σας…».
 */
const U_139_6 = {
	el: 'Για να μπορεί το ιατρείο να καλέσει τον συγγενή σας. Τις ειδοποιήσεις για το ραντεβού τις λαμβάνετε εσείς.',
	en: 'So the office can call your relative. You’ll still receive the appointment notifications.'
};
/** U-138.6: «αξιολόγηση» is the act (the buttons, the form, the notice), «κριτική» what is published. */
const RATE = /αξιολ[οό]γ/iu;
const ACT = [
	'ratings_form_title',
	'ratings_done_title',
	'appointments_list_rate',
	'ratings_form_failed'
];
const PUBLISHED = [
	'ratings_mine_title',
	'ratings_mine_say_pending',
	'ratings_mine_say_approved',
	'ratings_mine_say_rejected',
	'ratings_form_preview',
	'ratings_form_grade_title',
	'ratings_form_then_moderation',
	'ratings_form_then_final',
	'ratings_form_comment_help'
];

/** Every way the catalogs drift from the wave's decisions, as `key: reason`. */
function findTextIssues(el: Catalog, en: Catalog, template: string): string[] {
	const issues: string[] = [];
	for (const [key, text] of Object.entries(D_W4_12)) {
		if (el[key] !== text) issues.push(`${key}: not D-W4-12's words`);
		if (/email/iu.test(`${el[key] ?? ''} ${en[key] ?? ''}`))
			issues.push(`${key}: promises an email`);
	}
	if (el.appointments_guest_body !== D_W4_14)
		issues.push('appointments_guest_body: not the prototype’s');
	if (el.relatives_field_phone_helper !== U_139_6.el)
		issues.push('relatives_field_phone_helper (el): not U-139.6’s words');
	if (en.relatives_field_phone_helper !== U_139_6.en)
		issues.push('relatives_field_phone_helper (en): not U-139.6’s words');
	for (const locale of ['el', 'en'] as const) {
		const catalog = locale === 'el' ? el : en;
		const email = emailCalendarWords(template, locale);
		if (!email.summary || catalog.appointments_calendar_title !== email.summary) {
			issues.push(`appointments_calendar_title (${locale}): not the email's summary`);
		}
		if (!email.description || catalog.appointments_calendar_description !== email.description) {
			issues.push(`appointments_calendar_description (${locale}): not the email's description`);
		}
	}
	for (const [key, text] of Object.entries(el)) {
		if (/εκπρόθεσμ/iu.test(text) || /(^|_)late(_|$)/u.test(key)) {
			issues.push(`${key}: a late cancel the patient never reads (U-137.5)`);
		}
	}
	for (const key of ACT) if (!RATE.test(el[key] ?? '')) issues.push(`${key}: not the act`);
	for (const key of PUBLISHED) {
		if (RATE.test(el[key] ?? '') || !(key in el)) issues.push(`${key}: not the review`);
	}
	return issues;
}

describe('the patient’s words (wave 4.0)', () => {
	it('D-W4-12 · D-W4-13 · D-W4-14 · U-137.5 · U-138.6 · U-139.6: the catalogs say what the wave decided', () => {
		expect(findTextIssues(readCatalog('el'), readCatalog('en'), readCalendarInvite())).toEqual([]);
	});

	it('D-W4-13: the calendar’s words were read from the email’s template (the check is not empty)', () => {
		expect(emailCalendarWords(readCalendarInvite(), 'el')).toEqual({
			summary: 'Ραντεβού: {doctor}',
			description: 'Το ραντεβού σας μέσω eDoctor.'
		});
		expect(emailCalendarWords(readCalendarInvite(), 'en').summary).toBe(
			'Appointment with {doctor}'
		);
	});

	it('(negative, planted) an email promised again, the old guest words, another calendar title, a late cancel, «αξιολόγηση» on the review — each is reported', () => {
		const el = readCatalog('el');
		const en = readCatalog('en');
		const planted = {
			...el,
			ratings_done_body: 'Ευχαριστούμε. Θα σας ενημερώσουμε με email όταν ελεγχθεί.',
			appointments_guest_body: 'Όταν είστε έτοιμοι να οργανώσετε την επόμενη επίσκεψή σας…',
			appointments_calendar_title: 'Ραντεβού με {doctor}',
			appointments_detail_canceled_late: 'Το ραντεβού ακυρώθηκε εκπρόθεσμα.',
			ratings_mine_title: 'Η αξιολόγησή σας',
			ratings_done_title: 'Η κριτική υποβλήθηκε.'
		};
		expect(findTextIssues(planted, en, readCalendarInvite())).toEqual([
			"ratings_done_body: not D-W4-12's words",
			'ratings_done_body: promises an email',
			'appointments_guest_body: not the prototype’s',
			"appointments_calendar_title (el): not the email's summary",
			'appointments_detail_canceled_late: a late cancel the patient never reads (U-137.5)',
			'ratings_done_title: not the act',
			'ratings_mine_title: not the review'
		]);
	});

	it('(negative, planted, review w4-w1 R1 NIT-1 · MINOR-2) one rule at a time: the calendar’s description, its English title, an email promised in English only, a `late` key with clean words, «εκπρόθεσμα» under another key, a review’s key gone, U-139.6 undone in either language', () => {
		const el = readCatalog('el');
		const en = readCatalog('en');
		const plantedEl: Catalog = {
			...el,
			appointments_calendar_description: 'Ραντεβού στο eDoctor.',
			appointments_cancel_late_note: 'Η ακύρωση καταχωρήθηκε.',
			appointments_detail_after: 'Ακυρώθηκε εκπρόθεσμα.',
			relatives_field_phone_helper: 'Για να ειδοποιηθεί ο συγγενής σας για το ραντεβού.'
		};
		delete plantedEl.ratings_form_then_final;
		const plantedEn: Catalog = {
			...en,
			appointments_calendar_title: 'Visit with {doctor}',
			ratings_mine_say_pending: 'We will email you once it is checked.',
			relatives_field_phone_helper: 'So your relative is told about the appointment.'
		};
		expect(findTextIssues(plantedEl, plantedEn, readCalendarInvite())).toEqual([
			'ratings_mine_say_pending: promises an email',
			'relatives_field_phone_helper (el): not U-139.6’s words',
			'relatives_field_phone_helper (en): not U-139.6’s words',
			"appointments_calendar_description (el): not the email's description",
			"appointments_calendar_title (en): not the email's summary",
			'appointments_cancel_late_note: a late cancel the patient never reads (U-137.5)',
			'appointments_detail_after: a late cancel the patient never reads (U-137.5)',
			'ratings_form_then_final: not the review'
		]);
	});
});
