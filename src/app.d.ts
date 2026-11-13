import 'unplugin-icons/types/svelte';
import type { Pathname, ResolvedPathname } from '$app/types';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		/**
		 * Shallow routing (wave 1.5, the doctor's profile): a window of `/doctors/<slug>/details/<section>` opened in
		 * place (`pushState`) carries its section and hints here; `null` is a window closed in place (`replaceState`).
		 */
		interface PageState {
			doctorDetails?: {
				section: string;
				focus?: string;
				office?: string;
				date?: string;
				service?: string;
				/** Opened from the page (its own history entry): closing it goes back one step. */
				inPlace?: boolean;
				/** U-72.3 Ε3: in the window of the services, one step on: «‹» goes back to them, «×» closes both. */
				fromServices?: boolean;
				/** Whether those services were opened from the page, so «×» has two steps to go back. */
				servicesInPlace?: boolean;
			} | null;
			/**
			 * Wave 3 (U-102): a booking «Αλλαγή» screen opened from screen 30 (`depth` 1) or from another one of them
			 * (2: «Νέος συγγενής», the code): leaving it goes back that many steps, to the page it came from.
			 */
			booking?: { depth: number };
			/**
			 * Wave 3 (review w3-w2 R1 MINOR-1): this entry was opened FORWARD from a page of this site (the doctor's page
			 * opened the booking), so its «×» may go back through the history; without it, it follows its link.
			 */
			siteBack?: boolean;
			/**
			 * Wave 3 (D-W3-31, the doctor's sign-up): how many pages of the sign-up lie behind this one in the history —
			 * «Πίσω» goes back through them, else to the page before it in place.
			 */
			onboarding?: { depth: number };
			/**
			 * Wave 4 (U-136, U-137, U-138, D-W3-31): an appointment's «Αλλαγή», cancellation or rating opened from it (`depth`
			 * 1) or from another one of them (2: «Θέλετε απλώς άλλη ώρα;», «Προσθήκη συγγενή»): «Άκυρο», «‹» and «Αποθήκευση»
			 * go back that many steps, so the browser's «back» never opens the form again.
			 */
			appointment?: { depth: number };
			/** Wave 4 (U-139): a relative's form opened from the list of relatives, with the same count of steps behind it. */
			relatives?: { depth: number };
		}
		// interface Platform {}
	}
}

/**
 * 🔴 Wave 4.5 · screen 63 (card w45-w7): `/notifications` is the site's 26th pathname, and TypeScript relates a value
 * typed as the WHOLE `Pathname` union to SvelteKit's `resolve` (one argument list per route) only up to 25 of them —
 * past that every `resolve(localizeHref(…) as Pathname)` of the site stops compiling, whatever the path. This overload
 * says what those calls always meant: a pathname as it stands, with no parameters. A call with a route id and its
 * parameters still goes through SvelteKit's own signature. Types only; nothing changes at runtime.
 */
declare module '$app/paths' {
	export function resolve(route: Pathname): ResolvedPathname;
}

export {};
