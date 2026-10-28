<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MetaRow, type MetaRowItem } from '$shared/ui/molecules/meta-row';

	const items: MetaRowItem[] = [
		{
			icon: 'videocam-outline',
			iconTone: 'primary',
			key: 'online',
			label: 'Online',
			singleLine: true,
			size: 'lg',
			tone: 'foreground'
		},
		{
			emphasis: true,
			icon: 'star',
			iconTone: 'rating',
			key: 'score',
			label: '4,8',
			tone: 'primary'
		},
		{
			icon: 'chatbubble-ellipses-outline',
			iconTone: 'muted',
			key: 'count',
			label: '132',
			tone: 'muted'
		}
	];
	const compactItems: MetaRowItem[] = [
		{ ...items[0], size: 'sm', tone: 'muted' },
		{
			emphasis: true,
			icon: 'star',
			iconTone: 'rating',
			key: 'score',
			label: 'Νέο',
			tone: 'primary'
		}
	];

	// The application's meta (`molecules/meta-row`): a list card's row.
	const { Story } = defineMeta({
		title: 'Molecules/MetaRow',
		component: MetaRow,
		tags: ['autodocs'],
		args: { items, size: 'md' },
		argTypes: { size: { control: 'radio', options: ['xs', 'sm', 'md', 'lg'] } }
	});
</script>

<!-- A list card's row: the first fact a size up, the score semibold in the primary text colour. -->
<Story name="Medium" />

<!-- A rail card's row: everything a size down and muted, a score with no count yet. -->
<Story name="Compact" args={{ items: compactItems, size: 'xs' }} />

<Story name="Small" args={{ size: 'sm' }} />

<Story name="Large" args={{ size: 'lg' }} />
