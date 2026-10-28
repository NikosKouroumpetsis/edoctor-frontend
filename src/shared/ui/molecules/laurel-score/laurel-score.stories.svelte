<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { LaurelScore } from '$shared/ui/molecules/laurel-score';

	const sizes = ['normal', 'large', 'score'] as const;

	// The application's meta (`molecules/laurel-score`): a distinction between foreground laurels.
	const { Story } = defineMeta({
		title: 'Molecules/LaurelScore',
		component: LaurelScore,
		tags: ['autodocs'],
		args: { filled: false, label: 'Επιλογή της κοινότητας', size: 'normal' },
		argTypes: {
			filled: { control: 'boolean' },
			size: { control: 'radio', options: sizes }
		}
	});
</script>

<!-- A distinction between foreground laurels (a stat strip). -->
<Story name="Normal" />

<Story name="Large" args={{ size: 'large' }} />

<!-- A score between filled laurels (a ratings summary). -->
<Story name="Score" args={{ filled: true, label: '4,91', size: 'score' }} />

<!-- Every size, outlined and filled. -->
<Story name="All Sizes">
	{#snippet template()}
		<div class="flex flex-col gap-section">
			{#each sizes as size (size)}
				<div class="flex flex-col gap-3">
					<LaurelScore label={size === 'score' ? '4,91' : 'Επιλογή'} {size} />
					<LaurelScore filled label={size === 'score' ? '4,91' : 'Επιλογή'} {size} />
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
