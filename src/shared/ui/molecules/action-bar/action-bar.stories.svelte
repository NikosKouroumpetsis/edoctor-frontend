<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ActionBar } from '$shared/ui/molecules/action-bar';

	const noop = () => {};

	// The application's meta (`molecules/action-bar`): «Εκκαθάριση όλων» + «Αναζήτηση» with the search glyph. The web
	// pads the device's safe area by CSS (`pb-safe-area-action`) and keeps the full-width canvas of a bar.
	const { Story } = defineMeta({
		title: 'Molecules/ActionBar',
		component: ActionBar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: {
			secondaryLabel: 'Εκκαθάριση όλων',
			primaryLabel: 'Αναζήτηση',
			primaryIcon: 'search',
			onPrimaryClick: noop,
			onSecondaryClick: noop
		},
		argTypes: {
			preset: { control: 'select', options: ['default', 'filters', 'plain'] },
			primaryAppearance: { control: 'select', options: ['default', 'compact'] },
			secondaryAppearance: { control: 'select', options: ['link', 'plain'] }
		}
	});
</script>

<Story name="Playground" />

<Story name="Without Icon" args={{ primaryIcon: undefined }} />

<!-- The filters-modal footer: separated bar with the compact one-line count primary and a disabled secondary. -->
<Story
	name="Separated Compact"
	args={{
		primaryAppearance: 'compact',
		primaryIcon: undefined,
		primaryLabel: 'Εμφάνιση 15 γιατρών',
		separated: true,
		secondaryDisabled: true
	}}
/>

<!-- K2.8 presets: the three bars in use, named. -->
<Story name="Preset Default" args={{ preset: 'default' }} />

<Story
	name="Preset Filters"
	args={{
		preset: 'filters',
		primaryIcon: undefined,
		primaryLabel: 'Εμφάνιση 15 αποτελεσμάτων',
		secondaryDisabled: true
	}}
/>

<Story
	name="Preset Plain"
	args={{
		preset: 'plain',
		primaryIcon: undefined,
		primaryLabel: 'Επιβεβαίωση',
		secondaryLabel: 'Ακύρωση'
	}}
/>

<Story name="Primary Loading" args={{ primaryLoading: true }} />

<Story
	name="Primary Disabled"
	args={{
		preset: 'plain',
		primaryDisabled: true,
		primaryIcon: undefined,
		primaryLabel: 'Επιβεβαίωση'
	}}
/>

<!-- Two labels that do not fit side by side: the primary takes a line of its own, whole, at the row's end. -->
<Story
	name="Long Labels"
	args={{
		primaryIcon: undefined,
		primaryLabel: 'Εμφάνιση όλων των διαθέσιμων γιατρών',
		secondaryLabel: 'Εκκαθάριση όλων των φίλτρων'
	}}
/>
