<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { InlineLinkText } from '$shared/ui/primitives/inline-link-text';

	// The application's meta (`atoms/inline-link-text`).
	const { Story } = defineMeta({
		title: 'Primitives/InlineLinkText',
		component: InlineLinkText,
		tags: ['autodocs'],
		args: {
			linkLabel: 'Πολιτική Απορρήτου',
			onLinkPress: () => {},
			text: 'Θα σας στείλουμε έναν κωδικό για να συνεχίσετε. Ισχύουν χρεώσεις μηνυμάτων και δεδομένων.'
		},
		argTypes: { tone: { control: 'radio', options: ['muted', 'foreground'] } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="max-w-form"><InlineLinkText {...args} /></div>
	{/snippet}
</Story>

<!-- A short sentence: the link stays on its line. -->
<Story name="Short" args={{ text: 'Διαβάστε την' }}>
	{#snippet template(args)}
		<div class="max-w-form"><InlineLinkText {...args} /></div>
	{/snippet}
</Story>

<Story name="Foreground Tone" args={{ tone: 'foreground' }}>
	{#snippet template(args)}
		<div class="max-w-form"><InlineLinkText {...args} /></div>
	{/snippet}
</Story>
