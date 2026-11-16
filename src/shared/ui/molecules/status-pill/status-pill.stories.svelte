<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StatusPill } from '$shared/ui/molecules/status-pill';

	const { Story } = defineMeta({
		title: 'Molecules/StatusPill',
		component: StatusPill,
		tags: ['autodocs'],
		args: { pill: { label: 'Επιβεβαιωμένο', tone: 'success' } }
	});
</script>

<Story name="Playground" />

<Story name="Tones">
	{#snippet template()}
		<div class="flex flex-row flex-wrap gap-2">
			<StatusPill pill={{ label: 'Αίτημα', tone: 'warning' }} />
			<StatusPill pill={{ label: 'Επιβεβαιωμένο', tone: 'success' }} />
			<StatusPill pill={{ label: 'Ολοκληρώθηκε', tone: 'muted' }} />
		</div>
	{/snippet}
</Story>
