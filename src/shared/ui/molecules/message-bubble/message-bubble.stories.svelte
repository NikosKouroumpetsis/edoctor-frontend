<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MessageBubble } from '$shared/ui/molecules/message-bubble';

	// U-84 Π2: a message: mine or the other's, on its way, not sent; `<script>` and an address stay text.
	const { Story } = defineMeta({
		title: 'Molecules/MessageBubble',
		component: MessageBubble,
		tags: ['autodocs']
	});
</script>

<Story name="Mine and theirs">
	{#snippet template()}
		<div class="flex flex-col gap-0.5">
			<MessageBubble mine text="Καλησπέρα γιατρέ μου." joinsNext />
			<MessageBubble mine text="Η χοληστερίνη βγήκε λίγο πιο ψηλά." joinsPrevious />
			<MessageBubble class="mt-3" text="Καλύτερα να κλείσετε ένα ραντεβού επανεξέτασης." />
		</div>
	{/snippet}
</Story>

<Story name="On its way and not sent">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<MessageBubble mine status="pending" text="Μπορώ να έρθω την Παρασκευή;" />
			<MessageBubble mine status="failed" text="Μπορώ να έρθω την Παρασκευή;" />
		</div>
	{/snippet}
</Story>

<Story name="Markup and links stay text">
	{#snippet template()}
		<MessageBubble
			text={'Δοκιμή: <script>alert("x")</' + 'script> <b>έντονα;</b> https://example.test 🩺💊👍🏽'}
		/>
	{/snippet}
</Story>
