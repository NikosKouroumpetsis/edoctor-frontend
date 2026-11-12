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
