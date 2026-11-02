<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { SuggestionGroupHeader } from '$shared/ui/molecules/suggestion-group-header';

	// The application's meta (`molecules/suggestion-group-header`): «Κατηγορίες» with its glyph.
	const { Story } = defineMeta({
		title: 'Molecules/SuggestionGroupHeader',
		component: SuggestionGroupHeader,
		tags: ['autodocs'],
		args: { label: 'Κατηγορίες', icon: 'pricetags-outline' },
		argTypes: {
			size: { control: 'select', options: ['md', 'sm'] },
			tone: { control: 'select', options: ['foreground', 'muted'] }
		}
	});
</script>

<Story name="With Icon" />

<Story name="Label Only" args={{ icon: undefined, label: 'Προτεινόμενα' }} />

<!-- Web (U-21): Airbnb's 12 grey group words of the search. -->
<Story
	name="Search Group"
	args={{ icon: undefined, label: 'Ειδικότητες', size: 'sm', tone: 'muted' }}
/>

<Story name="Both Looks">
	{#snippet template()}
		<div class="flex flex-col gap-4">
			<SuggestionGroupHeader label="Προτεινόμενα" />
			<SuggestionGroupHeader label="Κατηγορίες" icon="pricetags-outline" />
			<SuggestionGroupHeader label="Πρόσωπα" icon="person-outline" />
		</div>
	{/snippet}
</Story>
