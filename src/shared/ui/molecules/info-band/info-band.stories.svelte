<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { InfoBand } from '$shared/ui/molecules/info-band';

	const { Story } = defineMeta({
		title: 'Molecules/InfoBand',
		component: InfoBand,
		tags: ['autodocs'],
		args: {
			title: 'Οι όροι σας',
			lines: ['Επιβεβαιωμένο', 'Ακύρωση έως 8 ώρες πριν · δηλαδή έως Δευτέρα 16 Νοεμβρίου, 03:00.']
		}
	});
</script>

<Story name="Playground" />

<Story name="One Line" args={{ lines: ['Άμεση επιβεβαίωση'] }} />
