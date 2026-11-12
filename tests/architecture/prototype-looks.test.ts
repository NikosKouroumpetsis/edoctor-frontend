import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectRoot } from './source-scan';

/**
 * 🔴 U-129 (owner: «θα ακολουθησεις τα πρώτοτυπα»): each screen draws a shared component as ITS OWN approved prototype,
 * through a variant — never another screen's look, never a colour of the code's own. The components' specs hold each
 * variant's classes; this guard holds which screen asks for which, so a screen that drops its variant (or takes one
 * that is not its prototype's) fails here (S-22: ask).
 */
type Rule = { path: string; why: string; must?: RegExp[]; mustNot?: RegExp[] };

const RULES: Rule[] = [
	{
		path: 'src/screens/doctors/[slug]/booking/[...step]/page/time.svelte',
		why: '1 · booking 30: the chosen time outlined (`30-booking/booking.css:106`)',
		must: [/slotVariant="outline"/u]
	},
	{
		path: 'src/modules/doctor/ui/detail/components/detail-window.svelte',
		why: '1 · the profile: the chosen time filled (wave 1 `05-profile/profile.css:475`)',
		mustNot: [/slotVariant=/u]
	},
	{
		path: 'src/modules/doctor/ui/availability-picker/page/index.svelte',
		why: '1 · the picker hands the screen’s look to the grid, filled by default',
		must: [/slotVariant = 'solid'/u, /variant=\{slotVariant\}/u]
	},
	...[
		'src/modules/doctor-onboarding/ui/steps/page/basic.svelte',
		'src/modules/doctor-onboarding/ui/steps/page/specialty.svelte',
		'src/modules/doctor-onboarding/ui/steps/page/terms.svelte',
		'src/modules/appointments/ui/booking/page/birth-date.svelte'
	].map((path) => ({
		path,
		why: '4 · one date field (`33-doctor` 34 / 35 / 43, `30-booking` birth date: `type="date"`)',
		must: [/<DateOfBirthField\s+(?:[^>]*\s)?variant="single"/u]
	})),
	{
		path: 'src/modules/doctor-onboarding/ui/steps/components/amenity-details.svelte',
		why: '5 · 39: ticked dark (`.d-box`, `--fg`)',
		must: [/<CheckboxRow[^>]*tone="foreground"/u]
	},
	{
		path: 'src/modules/doctor-onboarding/ui/steps/components/terms-accept.svelte',
		why: '5 · 43: ticked dark (`.d-box`, `--fg`)',
		must: [/<Checkbox[^>]*tone="foreground"/u]
	},
	{
		path: 'src/modules/auth/ui/flow/components/step-register.svelte',
		why: '5 · the register form: ticked as its prototype (`19-login/login.css:275`, `--dark`)',
		must: [/<Checkbox[^>]*tone="secondary"/u]
	},
	{
		path: 'src/modules/search-doctors/ui/search-filters/page/index.svelte',
		why: '5 · the search filters: no checkbox in their prototype, so no change',
		mustNot: [/tone=/u]
	},
	...[
		[
			'src/modules/appointments/ui/change-screen/components/change-link.svelte',
			'«Αλλαγή» (`30-booking/booking.css:12`)'
		],
		['src/modules/doctor-onboarding/ui/steps/page/overview.svelte', 'the stages’ numbers (`.d-n`)'],
		['src/modules/doctor-onboarding/ui/steps/page/intro.svelte', 'the «Βήμα» tile (`.d-introi`)']
	].map(([path, where]) => ({
		path,
		why: `3 · ${where}: the prototype’s \`--chip\`, not a tint of the foreground`,
		must: [/\bbg-chip\b/u],
		mustNot: [/bg-foreground\/5/u]
	})),
	{
		path: 'src/modules/appointments/ui/list/components/column.svelte',
		why: '2 · screen 50’s tabs: the chosen one filled dark (D-W4-28, `54-rating/appt.css:75` `.a-chip.on`), no colour under the pointer (U-100)',
		must: [/variant="contrast"/u, /hover=\{false\}/u],
		mustNot: [/variant="outline"/u]
	},
	{
		path: 'src/modules/messages/ui/inbox/components/list-column.svelte',
		why: '2 · the inbox’s chips keep their look (D-W4-28: «τα Μηνύματα δεν αλλάζουν όψη», U-131.4)',
		must: [/variant="outline"/u],
		mustNot: [/variant="contrast"/u]
	},
	{
		path: 'src/shared/ui/primitives/step-progress/step-progress.svelte',
		why: '3 · the empty progress: the prototype’s `--line-2` (`33-doctor/doctor.css:21`)',
		must: [/\bbg-line-2\b/u],
		mustNot: [/\bbg-muted\b/u]
	},
	{
		path: 'src/routes/layout.css',
		why: '3 · only those four took the new colours: the shared `muted` stays the warm one',
		must: [/--muted: #f3ede7;/u, /--muted: #1a2639;/u, /--chip: #f1f5f9;/u, /--line-2: #d7e0ea;/u]
	},
	...[
		'src/modules/doctor-onboarding/ui/steps/page/overview.svelte',
		'src/modules/doctor-onboarding/ui/steps/page/intro.svelte'
	].map((path) => ({
		path,
		why: '6 · stage 2 wears the prototype’s clinic (`33-doctor/doctor.js:30`)',
		must: [/import \{ HouseCross as OfficeIcon \} from '\$shared\/ui\/icons\/house-cross';/u],
		mustNot: [/house-plus/u]
	}))
];

const readSource = (path: string) => readFileSync(join(projectRoot, path), 'utf8');

/** The rules a screen no longer keeps, one line each (none: each screen draws its own prototype). */
function prototypeLookFindings(read: (path: string) => string): string[] {
	return RULES.flatMap(({ path, why, must = [], mustNot = [] }) => {
		const text = read(path);
		return [
			...must.filter((rule) => !rule.test(text)).map((rule) => `${path}: lost ${rule} — ${why}`),
			...mustNot.filter((rule) => rule.test(text)).map((rule) => `${path}: took ${rule} — ${why}`)
		];
	});
}

describe('U-129: each screen draws the shared components as its own prototype', () => {
	it('U-129: the booking’s outlined time, the profile’s filled one, the four `--chip` / `--line-2` surfaces, one date field on 34 / 35 / 43 / 30, the sign-up’s and the register form’s ticks, the clinic of stage 2, screen 50’s dark tabs beside the inbox’s own (D-W4-28)', () => {
		expect(RULES.length).toBe(20);
		expect(prototypeLookFindings(readSource)).toEqual([]);
	});

	it('U-129 (negative, planted): a screen that drops its variant, or takes another’s, is reported — each on its own line', () => {
		const planted = (path: string) => {
			const text = readSource(path);
			if (path.endsWith('page/time.svelte')) return text.replace('slotVariant="outline"', '');
			if (path.endsWith('detail-window.svelte')) return `${text}\n<X slotVariant="outline" />`;
			if (path.endsWith('page/basic.svelte')) return text.replace('variant="single"', '');
			if (path.endsWith('step-register.svelte'))
				return text.replace('tone="secondary"', 'tone="foreground"');
			if (path.endsWith('page/intro.svelte'))
				return `${text}\nimport X from '~icons/lucide/house-plus';`;
			if (path.endsWith('step-progress.svelte')) return text.replace('bg-line-2', 'bg-muted');
			// D-W4-28: the appointments' tabs in the inbox's look, and the inbox's in theirs (two lines each).
			if (path.endsWith('ui/list/components/column.svelte'))
				return text.replace('variant="contrast"', 'variant="outline"');
			if (path.endsWith('inbox/components/list-column.svelte'))
				return text.replace('variant="outline"', 'variant="contrast"');
			return text;
		};
		const findings = prototypeLookFindings(planted);
		// The track back on `muted` is two lines: `line-2` lost, `muted` taken.
		expect(findings).toHaveLength(11);
		expect(findings.every((line) => / — \d · /u.test(line))).toBe(true);
	});
});
