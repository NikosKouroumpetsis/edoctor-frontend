<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import {
		SearchTrigger,
		layoutOf,
		type SearchTriggerLayout
	} from '$shared/ui/molecules/search-trigger';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		title,
		subtitle,
		backLabel,
		openLabel,
		filtersLabel,
		filterCount = 0,
		onBack,
		onOpenSearch,
		onOpenFilters,
		testId,
		testIdPrefix,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'> & {
		/** The pill's bold line: the search in effect («Τι»). */
		title: string;
		/** The pill's muted line («Πού · Πότε»). */
		subtitle: string;
		backLabel: string;
		/** The pill's name: it opens the search again. */
		openLabel: string;
		/** The filter button's name, the count already in its words. */
		filtersLabel: string;
		/** Above 0 the filter button is active: its ring and the count badge. */
		filterCount?: number;
		onBack: () => void;
		/** The pill's rect comes along, so the search modal zooms out of it. */
		onOpenSearch: (sourceLayout: SearchTriggerLayout) => void;
		/** The filter button's rect comes along, so the filters zoom out of it. */
		onOpenFilters?: (sourceLayout: SearchTriggerLayout) => void;
		/** The bar's own id (the application's `testID`). */
		testId?: string;
		/** `<prefix>-back`, `-pill`, `-filter` on the three controls (the application's `testIDPrefix`, U-03.13). */
		testIdPrefix?: string;
	} = $props();

	const idOf = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);
</script>

<!-- The application's results bar (M-32): «←», the two-line pill in the middle, the filters with their count. -->
<div
	data-slot="search-summary-bar"
	data-testid={testId}
	class={cn('flex flex-row items-center gap-3', className)}
	{...restProps}
>
	<IconButton
		icon="arrow-back"
		aria-label={backLabel}
		data-testid={idOf('back')}
		onclick={onBack}
	/>
	<div class="flex-1">
		<SearchTrigger
			{title}
			{subtitle}
			aria-label={openLabel}
			hideFrom="none"
			testId={idOf('pill')}
			onclick={(event) => onOpenSearch(layoutOf(event.currentTarget))}
		/>
	</div>
	<IconButton
		icon="options-outline"
		aria-label={filtersLabel}
		count={filterCount}
		data-testid={idOf('filter')}
		onclick={(event) => onOpenFilters?.(layoutOf(event.currentTarget))}
	/>
</div>
