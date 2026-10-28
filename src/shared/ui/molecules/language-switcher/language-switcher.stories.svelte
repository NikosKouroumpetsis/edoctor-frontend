<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LanguageSwitcher from '$shared/ui/molecules/language-switcher';

	const { Story } = defineMeta({
		title: 'Molecules/LanguageSwitcher',
		component: LanguageSwitcher,
		tags: ['autodocs'],
		args: {
			'aria-label': 'Γλώσσα',
			options: [
				{ locale: 'el', href: '#el', label: 'Ελληνικά', shortLabel: 'EL', current: true },
				{ locale: 'en', href: '#en', label: 'English', shortLabel: 'EN', current: false }
			]
		}
	});
</script>

<!-- The caller (the shell module) resolves the same page in each language. -->
<Story name="Default">
	{#snippet template(args)}
		<LanguageSwitcher {...args} />
	{/snippet}
</Story>
