import { describe, expect, it } from 'vitest';
import { readAppointmentsAddress } from '$modules/appointments/lib/paths';
import {
	classStrings,
	readSourceFiles,
	splitVariants,
	stripComments,
	type SourceFile
} from './source-scan';

/**
 * 🔴 Wave 4.0 · screens 50–55, the owner's words that the patient's pages must keep (cards w4-w4, w4-w5; P-W4 §8.3):
 * - U-132.1 («δεν θέλουμε να έχουμε καθολου χάρτη»): no file of the patient's appointment pages — the module's slices,
 *   the screens of `/appointments`, `/ratings`, `/profile/[...path]` — imports a map of the kit or the map library;
 * - U-135.2 («Τα δύο κουμπιά κολλημένα κάτω φεύγουν»): the 51 (`ui/detail`) fixes and sticks nothing to the screen;
 * - U-137.5 (the patient never reads «εκπρόθεσμα»): `canceledLate` leaves no file of `src/` but the appointment's
 *   `api/` (where the answer is read and dropped).
 * One planted negative per rule.
 */
const PAGES =
	/^src\/(?:modules\/appointments\/ui\/|screens\/(?:appointments|ratings)\/|screens\/profile\/\[\.\.\.path\]\/)/u;
const MAP_IMPORT =
	/\bfrom\s+['"][^'"]*\b(?:map-view|map-sheet|map-thumbnail|map-pin-card|map-price-pin|office-map|maplibre-gl)\b[^'"]*['"]|\bimport\s*\(\s*['"][^'"]*maplibre-gl/u;
const DETAIL = /^src\/modules\/appointments\/ui\/detail\//u;
const API = /^src\/modules\/appointments\/api\//u;

/** Every way the patient's pages break the three rules, as `path: reason`. */
function findPageIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		const found: string[] = [];
		if (PAGES.test(file.path) && MAP_IMPORT.test(file.text)) {
			found.push(`${file.path}: a map (U-132.1)`);
		}
		if (DETAIL.test(file.path)) {
			for (const { line, tokens } of classStrings(file.text)) {
				for (const token of tokens) {
					const { utility } = splitVariants(token);
					if (utility === 'fixed' || utility === 'sticky') {
						found.push(`${file.path}:${line} ${token} (U-135.2)`);
					}
				}
			}
		}
		if (!API.test(file.path) && /\bcanceledLate\b/u.test(file.text)) {
			found.push(`${file.path}: canceledLate read (U-137.5)`);
		}
		return found;
	});
}

/**
 * 🔴 U-102 / U-136 / U-137 / U-138 · U-139.3 (cards w4-w5, w4-w6, P-W4 §8.3; review w4-arch-frontend N-2, card w4-w9):
 * every «Αλλαγή» of an appointment, its cancellation and the rating of the visit (screen 54) are SCREENS — pages of
 * their own below 950, the right column from 950 — never a window, a sheet or a drawer. EVERY slice of the patient's
 * appointment pages (the list, the 51, the pill, the memory, the photo, the booking's too) imports none and plays no
 * dialog, with the two exceptions the owner named:
 * - «Διαγραφή συγγενή;» (U-139.3) is the ONE window of screens 50–55 — the shared `ActionDialog` (D-W4-58), in the
 *   relatives' `components/delete-dialog.svelte` and nowhere else of that slice;
 * - the rating's «Πώς λειτουργούν οι κριτικές» (D-W4-24) is the profile's window of INFORMATION, not the action — the one
 *   import `ui/rating` may make (`info-dialog`).
 */
const CHANGE_SCREENS = /^src\/modules\/appointments\/ui\/[^/]+\//u;
const RATING_SCREEN = /^src\/modules\/appointments\/ui\/rating\//u;
const RELATIVES = /^src\/modules\/appointments\/ui\/relatives\//u;
const DELETE_WINDOW = 'src/modules/appointments/ui/relatives/components/delete-dialog.svelte';
const INFO_DIALOG_IMPORT = /\bfrom\s+['"][^'"]*\/info-dialog(?:\/[^'"]*)?['"]/gu;
const ACTION_DIALOG_IMPORT = /\bfrom\s+['"][^'"]*\/action-dialog(?:\/[^'"]*)?['"]/gu;
const OVERLAY_IMPORT =
	/\bfrom\s+['"][^'"]*\/(?:action-dialog|info-dialog|alert-dialog|dialog|sheet|drawer|modal-screen|fullscreen-modal)(?:\/[^'"]*)?['"]/u;
const DIALOG_ROLE = /\brole=["'](?:alert)?dialog["']|\baria-modal\b/u;

function findOverlayIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (!CHANGE_SCREENS.test(file.path) || /\.(?:test|stories)\./u.test(file.path)) return [];
		const found: string[] = [];
		const reason = RELATIVES.test(file.path) ? 'U-139.3' : 'U-102';
		let text = file.text;
		if (RATING_SCREEN.test(file.path)) text = text.replace(INFO_DIALOG_IMPORT, '');
		if (file.path === DELETE_WINDOW) text = text.replace(ACTION_DIALOG_IMPORT, '');
		if (OVERLAY_IMPORT.test(text)) found.push(`${file.path}: a window imported (${reason})`);
		if (DIALOG_ROLE.test(text)) found.push(`${file.path}: plays a dialog (${reason})`);
		return found;
	});
}

/**
 * 🔴 U-167 · D-W45-56 (wave 4.5, card w45-w9; «το menu ειναι τερμα αριστερα αλλα ολες οι ρυθμισεις etc ειναι
 * κεντροποιημενες οχι και αυτες τέρμα αριστερα»): from 950 what the list of screens 50–55 opened — the 51, every
 * «Αλλαγή», the cancellation, the rating, a relative's form — sits in the MIDDLE of the right column. So no class of
 * the patient's appointment slices pushes a box against the list from 950 (`split:mx-0`, `laptop:ml-0` …) nor insets
 * one side alone with the column's inset (`desktop:pl-pane-inset-xl`, the 4.0's «80 on the left from 1440»).
 */
const WIDE_ZONES = ['split', 'laptop', 'desktop', 'wide'];
const AGAINST_THE_LIST = /^m[xlrse]-0$/u;
const ONE_SIDED_INSET = /^p[lrse]-pane-inset(?:-\w+)?$/u;

function findPinnedColumnIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (!CHANGE_SCREENS.test(file.path) || /\.(?:test|stories)\./u.test(file.path)) return [];
		const found: string[] = [];
		for (const { line, tokens } of classStrings(file.text)) {
			for (const token of tokens) {
				const { variants, utility } = splitVariants(token);
				if (!variants.some((variant) => WIDE_ZONES.includes(variant))) continue;
				if (AGAINST_THE_LIST.test(utility) || ONE_SIDED_INSET.test(utility)) {
					found.push(`${file.path}:${line} ${token} (U-167)`);
				}
			}
		}
		return found;
	});
}

/**
 * 🔴 D-W45-57 α (wave 4.5, card w45-w9): below 744 the site has no top bar (U-16.3), so a page of the patient's that is
 * pushed over the tabs is the WHOLE screen high — `min-h-page` (the screen minus the bar's 64) left a band in the body's
 * colour under a short page. The screens of `/appointments`, `/ratings`, `/profile/[...path]` and `/notifications`
 * take `min-h-page` only from 744, where the bar is.
 */
const PUSHED_SCREENS =
	/^src\/screens\/(?:appointments|ratings|notifications|profile\/\[\.\.\.path\])\//u;
const BAR_ZONES = ['tablet', 'split', 'laptop', 'desktop', 'wide'];

function findBarHeightIssues(files: SourceFile[]): string[] {
	return files.flatMap((file) => {
		if (!PUSHED_SCREENS.test(file.path)) return [];
		const found: string[] = [];
		for (const { line, tokens } of classStrings(file.text)) {
			for (const token of tokens) {
				const { variants, utility } = splitVariants(token);
				if (utility === 'min-h-page' && !variants.some((variant) => BAR_ZONES.includes(variant))) {
					found.push(`${file.path}:${line} ${token} (D-W45-57)`);
				}
			}
		}
		return found;
	});
}

const planted = (path: string, text: string): SourceFile => ({ path, text: stripComments(text) });

describe('🔴 the patient’s appointment pages (U-132.1 · U-135.2 · U-137.5)', () => {
	it('the scan reads the pages it names', () => {
		const paths = readSourceFiles().map((file) => file.path);
		for (const path of [
			'src/modules/appointments/ui/list/page/index.svelte',
			'src/modules/appointments/ui/list/components/card.svelte',
			'src/modules/appointments/ui/detail/page/index.svelte',
			'src/modules/appointments/ui/detail/components/card.svelte',
			'src/screens/appointments/[...path]/page/index.svelte',
			'src/screens/ratings/[invitationId]/page/index.svelte',
			'src/screens/profile/[...path]/page/index.svelte'
		]) {
			expect(paths, path).toContain(path);
			expect(PAGES.test(path), path).toBe(true);
		}
	});

	it('U-132.1 · U-135.2 · U-137.5: no map, nothing fixed or sticky on the 51, no late cancellation read past the api', () => {
		expect(findPageIssues(readSourceFiles())).toEqual([]);
	});

	it('(negative, planted) a map’s import, a fixed or sticky bar on the 51, a `canceledLate` read in `lib/` — each is reported; the api may read it, the booking may stick its bar', () => {
		expect(
			findPageIssues([
				planted(
					'src/modules/appointments/ui/detail/components/map.svelte',
					"<script>import { MapView } from '$shared/ui/organisms/map-view';</script>"
				),
				planted(
					'src/screens/appointments/[...path]/hooks/use-map.svelte.ts',
					"const maplibre = await import('maplibre-gl');"
				),
				planted(
					'src/modules/appointments/ui/detail/page/index.svelte',
					'<div class="fixed inset-x-0 bottom-0"></div><div class="tablet:sticky"></div>'
				),
				planted(
					'src/modules/appointments/lib/detail/index.ts',
					'const late = appointment.canceledLate;'
				),
				planted('src/modules/appointments/api/appointment/map.ts', 'void view.canceledLate;'),
				planted(
					'src/modules/appointments/ui/booking/page/success.svelte',
					'<div class="fixed inset-x-0 bottom-0"></div>'
				),
				planted(
					'src/modules/doctor/ui/detail/components/office.svelte',
					"import x from 'maplibre-gl';"
				)
			])
		).toEqual([
			'src/modules/appointments/ui/detail/components/map.svelte: a map (U-132.1)',
			'src/screens/appointments/[...path]/hooks/use-map.svelte.ts: a map (U-132.1)',
			'src/modules/appointments/ui/detail/page/index.svelte:1 fixed (U-135.2)',
			'src/modules/appointments/ui/detail/page/index.svelte:1 tablet:sticky (U-135.2)',
			'src/modules/appointments/lib/detail/index.ts: canceledLate read (U-137.5)'
		]);
	});
});

describe('🔴 U-102 · U-136 · U-137 · U-139.3: «Αλλαγή» and the cancellation are screens, never windows — ONE window on screens 50–55 (cards w4-w5, w4-w9)', () => {
	const ID = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';

	it('each is an ADDRESS of the closed list (D-W4-20): `time`, `for-whom`, `relative`, `note`, `cancel`', () => {
		for (const step of ['time', 'for-whom', 'relative', 'note', 'cancel'] as const) {
			expect(readAppointmentsAddress(`${ID}/${step}`, new URLSearchParams())).toEqual({
				view: 'appointment',
				appointmentId: ID,
				step
			});
		}
	});

	it('their slices import no window, sheet or drawer and play no dialog', () => {
		const files = readSourceFiles().filter((file) => CHANGE_SCREENS.test(file.path));
		for (const path of [
			'src/modules/appointments/ui/change/page/time.svelte',
			'src/modules/appointments/ui/change/page/for-whom.svelte',
			'src/modules/appointments/ui/change/page/relative.svelte',
			'src/modules/appointments/ui/change/page/note.svelte',
			'src/modules/appointments/ui/cancel/page/index.svelte',
			'src/modules/appointments/ui/change-screen/components/change-frame.svelte',
			'src/modules/appointments/ui/relative-form/page/index.svelte',
			'src/modules/appointments/ui/rating/page/index.svelte',
			'src/modules/appointments/ui/rating/components/own-review.svelte',
			// Review w4-arch-frontend N-2: the slices the first scan left out, and the relatives' own.
			'src/modules/appointments/ui/list/page/index.svelte',
			'src/modules/appointments/ui/list/components/card.svelte',
			'src/modules/appointments/ui/list/hooks/use-pages.svelte.ts',
			'src/modules/appointments/ui/detail/page/index.svelte',
			'src/modules/appointments/ui/detail/components/actions.svelte',
			'src/modules/appointments/ui/status-pill/page/index.svelte',
			'src/modules/appointments/ui/memory/hooks/appointments-memory.svelte.ts',
			'src/modules/appointments/ui/doctor-photo/page/index.svelte',
			'src/modules/appointments/ui/relatives/page/index.svelte',
			'src/modules/appointments/ui/relatives/components/editor.svelte',
			DELETE_WINDOW
		]) {
			expect(
				files.map((file) => file.path),
				path
			).toContain(path);
		}
		expect(findOverlayIssues(files)).toEqual([]);
		// U-139.3 · D-W4-58: the one window IS there, and it is the kit's shared `ActionDialog` (the check is not empty).
		expect(files.find((file) => file.path === DELETE_WINDOW)?.text).toMatch(
			/import \{ ActionDialog \} from '\$shared\/ui\/templates\/action-dialog';/u
		);
	});

	it('(negative, planted) a window, a sheet, a dialog’s role — each is reported, in the list, the 51 and the relatives’ own pages too (N-2); the relatives’ ONE deletion window (U-139.3) and the 54’s information window (D-W4-24) are the two allowed imports', () => {
		expect(
			findOverlayIssues([
				planted(
					'src/modules/appointments/ui/cancel/page/index.svelte',
					"<script>import { ActionDialog } from '$shared/ui/templates/action-dialog';</script>"
				),
				planted(
					'src/modules/appointments/ui/change/page/time.svelte',
					"<script>import { Sheet } from '$shared/ui/primitives/sheet';</script>"
				),
				planted(
					'src/modules/appointments/ui/change-screen/components/change-frame.svelte',
					'<section role="dialog" aria-modal="true"></section>'
				),
				planted(
					DELETE_WINDOW,
					"<script>import { ActionDialog } from '$shared/ui/templates/action-dialog';</script>"
				),
				planted(
					'src/modules/appointments/ui/rating/page/index.svelte',
					"<script>import { InfoDialog } from '$shared/ui/templates/info-dialog';</script>"
				),
				planted(
					'src/modules/appointments/ui/rating/components/form.svelte',
					"<script>import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';</script>"
				),
				planted(
					'src/modules/appointments/ui/rating/page/index.svelte',
					'<div role="dialog"></div>'
				),
				planted(
					'src/modules/appointments/ui/cancel/components/offer.svelte',
					"<script>import { InfoDialog } from '$shared/ui/templates/info-dialog';</script>"
				),
				// N-2: the slices the first scan did not read.
				planted(
					'src/modules/appointments/ui/detail/components/actions.svelte',
					"<script>import { ActionDialog } from '$shared/ui/templates/action-dialog';</script>"
				),
				planted(
					'src/modules/appointments/ui/list/components/card.svelte',
					"<script>import { Drawer } from '$shared/ui/primitives/drawer';</script>"
				),
				planted(
					'src/modules/appointments/ui/status-pill/page/index.svelte',
					'<span role="alertdialog"></span>'
				),
				planted(
					'src/modules/appointments/ui/memory/hooks/appointments-memory.svelte.ts',
					"import { Dialog } from '$shared/ui/primitives/dialog';"
				),
				// U-139.3: ONE window in the relatives' slice — a second one, another kind, or the form played as a dialog.
				planted(
					'src/modules/appointments/ui/relatives/page/index.svelte',
					"<script>import { ActionDialog } from '$shared/ui/templates/action-dialog';</script>"
				),
				planted(
					DELETE_WINDOW,
					"<script>import { Sheet } from '$shared/ui/primitives/sheet';</script>"
				),
				planted(
					'src/modules/appointments/ui/relatives/components/editor.svelte',
					'<section role="dialog"></section>'
				),
				// … and a window of another feature is not this rule's.
				planted(
					'src/modules/messages/ui/contact/page/index.svelte',
					"<script>import { ActionDialog } from '$shared/ui/templates/action-dialog';</script>"
				)
			])
		).toEqual([
			'src/modules/appointments/ui/cancel/page/index.svelte: a window imported (U-102)',
			'src/modules/appointments/ui/change/page/time.svelte: a window imported (U-102)',
			'src/modules/appointments/ui/change-screen/components/change-frame.svelte: plays a dialog (U-102)',
			'src/modules/appointments/ui/rating/components/form.svelte: a window imported (U-102)',
			'src/modules/appointments/ui/rating/page/index.svelte: plays a dialog (U-102)',
			'src/modules/appointments/ui/cancel/components/offer.svelte: a window imported (U-102)',
			'src/modules/appointments/ui/detail/components/actions.svelte: a window imported (U-102)',
			'src/modules/appointments/ui/list/components/card.svelte: a window imported (U-102)',
			'src/modules/appointments/ui/status-pill/page/index.svelte: plays a dialog (U-102)',
			'src/modules/appointments/ui/memory/hooks/appointments-memory.svelte.ts: a window imported (U-102)',
			'src/modules/appointments/ui/relatives/page/index.svelte: a window imported (U-139.3)',
			`${DELETE_WINDOW}: a window imported (U-139.3)`,
			'src/modules/appointments/ui/relatives/components/editor.svelte: plays a dialog (U-139.3)'
		]);
	});
});

describe('🔴 U-167: η δεξιά στήλη των σελίδων του 4.0 κεντράρεται από 950 (D-W45-56, card w45-w9)', () => {
	const DETAIL_PAGE = 'src/modules/appointments/ui/detail/page/index.svelte';
	const CHANGE_FRAME = 'src/modules/appointments/ui/change-screen/components/change-frame.svelte';

	it('the two places that set the right column’s box are read, each centred (`mx-auto`) at its own greatest width', () => {
		const files = readSourceFiles();
		const tokensOf = (path: string) =>
			classStrings(files.find((file) => file.path === path)?.text ?? '').flatMap(
				(entry) => entry.tokens
			);
		const detail = tokensOf(DETAIL_PAGE);
		expect(detail).toEqual(expect.arrayContaining(['mx-auto', 'split:max-w-document-wide']));
		const frame = tokensOf(CHANGE_FRAME);
		expect(frame).toEqual(
			expect.arrayContaining([
				'mx-auto',
				'split:max-w-split-sub',
				'laptop:max-w-split-sub-lg',
				'desktop:max-w-split-sub-xl'
			])
		);
	});

	it('no slice of the patient’s appointment pages pushes a box against the list from 950, nor insets one side alone', () => {
		expect(findPinnedColumnIssues(readSourceFiles())).toEqual([]);
	});

	it('(negative, planted) `split:mx-0` on the 51, the 80 on the left of a change screen, `laptop:ml-0` on the form — each is reported; below 950, a reset of another kind and another feature are not this rule’s', () => {
		expect(
			findPinnedColumnIssues([
				planted(
					DETAIL_PAGE,
					'<article class="mx-auto split:mx-0 split:max-w-document-wide"></article>'
				),
				planted(CHANGE_FRAME, "const pane = 'mx-auto desktop:pl-pane-inset-xl';"),
				planted(
					'src/modules/appointments/ui/relative-form/page/index.svelte',
					'<div class="laptop:ml-0 tablet:mx-0 split:mb-0 split:px-pane-inset"></div>'
				),
				planted(
					'src/modules/articles/ui/detail/page/index.svelte',
					'<div class="laptop:mx-0"></div>'
				)
			])
		).toEqual([
			`${DETAIL_PAGE}:1 split:mx-0 (U-167)`,
			`${CHANGE_FRAME}:1 desktop:pl-pane-inset-xl (U-167)`,
			'src/modules/appointments/ui/relative-form/page/index.svelte:1 laptop:ml-0 (U-167)'
		]);
	});
});

describe('🔴 D-W45-57: below 744 a pushed page of the patient’s is the whole screen high (card w45-w9)', () => {
	const SCREENS = [
		'src/screens/appointments/[...path]/page/index.svelte',
		'src/screens/ratings/[invitationId]/page/index.svelte',
		'src/screens/profile/[...path]/page/index.svelte',
		'src/screens/notifications/page/index.svelte'
	];

	it('the four screens are read, each the screen’s height below 744 and the height under the bar from it', () => {
		const files = readSourceFiles();
		for (const path of SCREENS) {
			const tokens = classStrings(files.find((file) => file.path === path)?.text ?? '').flatMap(
				(entry) => entry.tokens
			);
			expect(tokens, path).toEqual(expect.arrayContaining(['min-h-dvh', 'tablet:min-h-page']));
		}
		expect(findBarHeightIssues(files)).toEqual([]);
	});

	it('(negative, planted) a bare `min-h-page` on one of them is reported; from 744, and on a page that is not theirs, it is not', () => {
		expect(
			findBarHeightIssues([
				planted(SCREENS[2], '<main class="min-h-page bg-card split:min-h-0"></main>'),
				planted(SCREENS[3], '<main class="min-h-dvh bg-card tablet:min-h-page"></main>'),
				planted('src/screens/favorites/page/index.svelte', '<main class="min-h-page"></main>')
			])
		).toEqual([`${SCREENS[2]}:1 min-h-page (D-W45-57)`]);
	});
});
