<script lang="ts">
	import type { CategoryId } from '$modules/search-doctors/types';
	import { useHomeSections } from './use-sections.svelte';

	/** Tests only: a category's rows, as the home draws them. */
	let { categoryId, member }: { categoryId: CategoryId; member: boolean } = $props();

	const home = useHomeSections(
		() => categoryId,
		() => 'el',
		() => member
	);
	const shown = $derived(home.sections.flatMap((section) => section.doctors));
</script>

<ul data-testid="category-rows">
	{#each shown as doctor, index (index)}
		<li data-testid="category-fee">{doctor.fee.label}</li>
	{/each}
</ul>
