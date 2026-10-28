<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { InfoRow } from '$shared/ui/molecules/info-row';

	const { Story } = defineMeta({
		title: 'Molecules/InfoRow',
		component: InfoRow,
		tags: ['autodocs'],
		args: {
			variant: 'circled',
			icon: 'time-outline',
			title: 'Χρόνος απάντησης',
			value: 'Σε 1 ώρα',
			description: 'Συνήθως απαντά την ίδια μέρα'
		},
		argTypes: {
			variant: { control: 'select', options: ['circled', 'plain', 'plain-wide', 'inline'] },
			iconTone: { control: 'select', options: ['foreground', 'primary'] }
		}
	});
</script>

{#snippet all()}
	<div class="flex w-full max-w-form flex-col gap-5">
		<InfoRow
			variant="circled"
			icon="time-outline"
			title="Χρόνος απάντησης"
			value="Σε 1 ώρα"
			description="Συνήθως απαντά την ίδια μέρα"
		/>
		<InfoRow variant="plain" icon="briefcase-outline" title="Εμπειρία" value="12 έτη" />
		<InfoRow
			variant="plain"
			icon="checkmark-done-outline"
			iconTone="primary"
			title="Πιστοποιημένο προφίλ"
			description="Τα στοιχεία ελέγχθηκαν"
		/>
		<InfoRow variant="plain-wide" icon="card-outline" title="Πληρωμή με κάρτα" />
		<InfoRow variant="inline" icon="car-outline" title="Στάθμευση" value="Δωρεάν" />
		<InfoRow
			variant="inline"
			icon="call-outline"
			title="Τηλέφωνο"
			value="210 1234567"
			href="tel:+302101234567"
		/>
	</div>
{/snippet}

<Story name="Circled">
	{#snippet template(args)}
		<div class="w-full max-w-form"><InfoRow {...args} /></div>
	{/snippet}
</Story>

<Story name="Plain">
	{#snippet template()}
		<InfoRow variant="plain" icon="briefcase-outline" title="Εμπειρία" value="12 έτη" />
	{/snippet}
</Story>

<Story name="Plain without a value in primary">
	{#snippet template()}
		<InfoRow
			variant="plain"
			icon="checkmark-done-outline"
			iconTone="primary"
			title="Πιστοποιημένο προφίλ"
			description="Τα στοιχεία ελέγχθηκαν"
		/>
	{/snippet}
</Story>

<Story name="Plain wide">
	{#snippet template()}
		<InfoRow variant="plain-wide" icon="card-outline" title="Πληρωμή με κάρτα" />
	{/snippet}
</Story>

<Story name="Inline">
	{#snippet template()}
		<InfoRow variant="inline" icon="car-outline" title="Στάθμευση" value="Δωρεάν" />
	{/snippet}
</Story>

<Story name="Inline pressable">
	{#snippet template()}
		<div class="w-full max-w-form">
			<InfoRow
				variant="inline"
				icon="call-outline"
				title="Τηλέφωνο"
				value="210 1234567"
				onclick={() => {}}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Inline as a call link">
	{#snippet template()}
		<div class="w-full max-w-form">
			<InfoRow
				variant="inline"
				icon="call-outline"
				title="Τηλέφωνο"
				value="210 1234567"
				href="tel:+302101234567"
				aria-label="Κλήση στο 210 1234567"
			/>
		</div>
	{/snippet}
</Story>

<Story name="All variants">
	{#snippet template()}
		{@render all()}
	{/snippet}
</Story>

<Story name="All variants in the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="bg-background p-card">{@render all()}</div>
	{/snippet}
</Story>
