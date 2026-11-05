<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Composer } from '$shared/ui/molecules/composer';

	// U-84 Π2: the field of a conversation: empty, with words, near the limit, past it, refused.
	const { Story } = defineMeta({
		title: 'Molecules/Composer',
		component: Composer,
		tags: ['autodocs']
	});
	const labels = {
		placeholder: 'Γράψτε ένα μήνυμα',
		sendLabel: 'Αποστολή',
		max: 2000,
		countFrom: 1800,
		counterLabel: (count: number, max: number) =>
			`${count.toLocaleString('el-GR')} / ${max.toLocaleString('el-GR')}`,
		overLabel: 'Το μήνυμα είναι πολύ μεγάλο. Συντομεύστε το για να το στείλετε.',
		onSend: () => {}
	};
</script>

<Story name="Empty">
	{#snippet template()}
		<Composer {...labels} />
	{/snippet}
</Story>

<Story name="With words">
	{#snippet template()}
		<Composer {...labels} value="Μπορώ να έρθω και την Παρασκευή το πρωί;" />
	{/snippet}
</Story>

<Story name="Near the limit">
	{#snippet template()}
		<Composer {...labels} value={'α'.repeat(1960)} />
	{/snippet}
</Story>

<Story name="Past the limit">
	{#snippet template()}
		<Composer {...labels} value={'α'.repeat(2040)} />
	{/snippet}
</Story>

<Story name="Refused">
	{#snippet template()}
		<Composer
			{...labels}
			value="Μπορώ να έρθω;"
			error="Στείλατε πολλά μηνύματα σε λίγο χρόνο. Δοκιμάστε ξανά σε λίγα λεπτά."
		/>
	{/snippet}
</Story>
