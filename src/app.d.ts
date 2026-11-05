import 'unplugin-icons/types/svelte';

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
		}
		// interface Platform {}
	}
}

export {};
