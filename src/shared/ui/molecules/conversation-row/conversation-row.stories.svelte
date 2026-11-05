<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ConversationRow } from '$shared/ui/molecules/conversation-row';

	// U-84 Π1: a row of the inbox: read, unread, chosen, and an account with no picture.
	const { Story } = defineMeta({
		title: 'Molecules/ConversationRow',
		component: ConversationRow,
		tags: ['autodocs']
	});
</script>

<Story name="Read">
	{#snippet template()}
		<ConversationRow
			href="#row"
			title="Dr. Giorgos Nikolaou"
			subtitle="Καρδιολόγος"
			previewPrefix="Εσείς: "
			preview="Ευχαριστώ πολύ!"
			time="Χθες"
			initial="G"
		/>
	{/snippet}
</Story>

<Story name="Unread">
	{#snippet template()}
		<ConversationRow
			href="#row"
			title="Dr. Eleni Stathopoulou"
			subtitle="Δερματολόγος"
			preview="Μέχρι τότε μην το ξύνετε και αποφύγετε τον ήλιο στο σημείο."
			time="14:32"
			initial="E"
			unread
		/>
	{/snippet}
</Story>

<Story name="Chosen">
	{#snippet template()}
		<ConversationRow
			href="#row"
			title="Dr. Athena Papadopoulou"
			subtitle="Παθολόγος"
			preview="Ναι, φέρτε μαζί σας και τις παλιές."
			time="14:32"
			initial="A"
			selected
		/>
	{/snippet}
</Story>

<Story name="A patient">
	{#snippet template()}
		<ConversationRow
			href="#row"
			title="Μαρία Παπαδάκη"
			subtitle="Ασθενής"
			preview="Ευχαριστώ, γιατρέ!"
			time="Κυρ"
			initial="Μ"
			avatarTone="neutral"
		/>
	{/snippet}
</Story>

<Story name="Markup stays text">
	{#snippet template()}
		<ConversationRow
			href="#row"
			title="Dr. Athena Papadopoulou"
			preview={'<b>έντονα;</b> https://example.test <script>alert(1)</' + 'script>'}
			time="14:32"
			initial="A"
		/>
	{/snippet}
</Story>
