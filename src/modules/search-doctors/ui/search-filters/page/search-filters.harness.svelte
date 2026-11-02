<script lang="ts">
	import type { SearchDoctorsCriteria } from '$modules/search-doctors/lib/search-criteria';
	import type { SearchDoctorsFilters } from '$modules/search-doctors/lib/search-filters';
	import { FiltersState } from '../hooks/use-state.svelte';
	import SearchFilters from './index.svelte';

	let {
		criteria,
		initialFilters,
		onSubmit,
		onReady
	}: {
		criteria: SearchDoctorsCriteria | null;
		initialFilters: SearchDoctorsFilters;
		onSubmit: (filters: SearchDoctorsFilters) => void;
		onReady: (state: FiltersState) => void;
	} = $props();

	const filters = new FiltersState({
		criteria: () => criteria,
		initialFilters: () => initialFilters,
		locale: () => 'el',
		onSubmit: (next) => onSubmit(next)
	});
	// svelte-ignore state_referenced_locally
	onReady(filters);
</script>

<SearchFilters {filters} locale="el" />
