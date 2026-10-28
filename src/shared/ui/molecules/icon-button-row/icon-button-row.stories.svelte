<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { IconButtonRow, type IconButtonRowItem } from '$shared/ui/molecules/icon-button-row';

	const noop = () => {};
	const items: IconButtonRowItem[] = [
		{ id: 'web', icon: 'globe-outline', ariaLabel: 'Ιστότοπος', onclick: noop },
		{ id: 'linkedin', icon: 'logo-linkedin', ariaLabel: 'LinkedIn', onclick: noop },
		{ id: 'instagram', icon: 'logo-instagram', ariaLabel: 'Instagram', onclick: noop },
		{ id: 'facebook', icon: 'logo-facebook', ariaLabel: 'Facebook', onclick: noop }
	];
	// The application's links that leave it (`accessibilityRole: 'link'`): on the web a link opening a new tab.
	const links: IconButtonRowItem[] = items.map(({ id, icon, ariaLabel }) => ({
		id,
		icon,
		ariaLabel,
		href: `#${id}`,
		external: true
	}));

	// The application's meta (`molecules/icon-button-row`): the four social circles.
	const { Story } = defineMeta({
		title: 'Molecules/IconButtonRow',
		component: IconButtonRow,
		tags: ['autodocs'],
		args: { items },
		argTypes: { variant: { control: 'select', options: ['start', 'centered'] } }
	});
</script>

<!-- 48 circles from the start: links that leave the app. -->
<Story name="Start" args={{ items: links }} />

<!-- 40 circles in their 48 boxes, centred. -->
<Story name="Centered" args={{ variant: 'centered' }} />

<Story name="Two Items" args={{ items: items.slice(0, 2) }} />
