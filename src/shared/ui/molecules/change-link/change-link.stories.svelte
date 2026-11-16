<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ChangeLink } from '$shared/ui/molecules/change-link';

	const { Story } = defineMeta({
		title: 'Molecules/ChangeLink',
		component: ChangeLink,
		tags: ['autodocs'],
		args: { label: 'Αλλαγή', ariaLabel: 'Αλλαγή: Ημέρα και ώρα', href: '#' }
	});
</script>

<Story name="Playground" />

<Story name="Beside A Fact">
	{#snippet template()}
		<div class="flex w-full max-w-form flex-row items-start justify-between gap-3">
			<div>
				<p class="text-body-sm font-semibold text-foreground">Ημέρα και ώρα</p>
				<p class="mt-1 text-body-sm text-foreground">Δευτέρα 16 Νοεμβρίου · 11:00</p>
			</div>
			<ChangeLink label="Αλλαγή" ariaLabel="Αλλαγή: Ημέρα και ώρα" href="#" />
		</div>
	{/snippet}
</Story>

<Story
	name="Emphasis"
	args={{ label: 'Προσθήκη', ariaLabel: 'Προσθήκη: Τηλέφωνο', emphasis: true }}
/>
