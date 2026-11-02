import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { ModalOrigin } from '$shared/ui/templates/modal-screen';
import type { FiltersState } from './hooks/use-state.svelte';

/** The filters window's props (the page owns its `FiltersState`). */
export type SearchFiltersProps = {
	filters: FiltersState;
	locale: SupportedLocale;
	/** The filters button's rect: the window zooms out of it and back into it. */
	sourceLayout?: ModalOrigin;
};
