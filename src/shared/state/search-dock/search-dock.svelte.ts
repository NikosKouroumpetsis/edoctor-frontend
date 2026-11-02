import { createContext } from '$shared/lib/headless';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';

/** What the page's search holds, in words, for the bar's small pill: each part chosen, or none (its own words). */
export type SearchDockSummary = { what?: string; where?: string; when?: string };

/** The page's own address in `locale` (its search kept), localized; the frame resolves it for its links. */
export type SearchDockLanguageHref = (locale: SupportedLocale) => string;

/**
 * The page's search and the frame's top bar, one per page tree (context, never a module singleton: SSR-safe).
 * Airbnb's way (U-16.7, U-19.1): a page with a big search (`SearchBar`) tells the frame when it has gone under the
 * top bar (`docked`), the bar then shows its small pill in place of its links; the pill drops the page's search
 * under the top bar (`dropped`) over a dimmed page, and a press outside or Escape lifts it back (§6.4 of the wave
 * record). The frame and the page only meet here: neither imports the other.
 */
export class SearchDock {
	/** A page registered a search that can dock (only then the pill can show). */
	available = $state(false);
	/** That search went under the top bar. */
	docked = $state(false);
	/** Dropped under the top bar from the pill. */
	dropped = $state(false);
	/** The pill shows while the page's search is under the bar and not dropped. */
	readonly pillShown = $derived(this.available && this.docked && !this.dropped);
	/** The page's choices (U-23.2, Airbnb's pill writes them in place of «Οπουδήποτε …»); cleared with the page. */
	summary = $state.raw<SearchDockSummary>({});
	/**
	 * MINOR-5 (r1): the page's address in another language when its search is part of it (the results: the same
	 * criteria and filters, the clean address its readers write); `null` ⇒ the frame's own (the same path). The page
	 * sets it and clears it when it goes.
	 */
	languageHref = $state.raw<SearchDockLanguageHref | null>(null);

	#returnFocus: HTMLElement | null = null;

	/** The page's search is on this page (`true`) or gone with it (`false`). */
	register(available: boolean) {
		this.available = available;
		if (!available) {
			this.docked = false;
			this.dropped = false;
			this.summary = {};
		}
	}

	/** Drops the search under the bar; the focus goes back to `from` (the pill) when it lifts. */
	drop(from: HTMLElement | null = null) {
		this.#returnFocus = from;
		this.dropped = true;
	}

	/** Lifts it back; with `restoreFocus` the pill that dropped it takes the focus again. */
	lift({ restoreFocus = false }: { restoreFocus?: boolean } = {}) {
		if (!this.dropped) return;
		this.dropped = false;
		const target = this.#returnFocus;
		this.#returnFocus = null;
		if (restoreFocus && target) queueMicrotask(() => target.focus({ preventScroll: true }));
	}
}

export const [getSearchDock, setSearchDock, getSearchDockOptional] =
	createContext<SearchDock>('SearchDock');
