<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ModalHeader } from '$shared/ui/molecules/modal-header';

	// The application's meta (`molecules/modal-header`): «Αναζήτηση», its outline «×» (U-09.6: the application's 48
	// circle, hairline, card fill, 24 glyph), on the page's background.
	const { Story } = defineMeta({
		title: 'Molecules/ModalHeader',
		component: ModalHeader,
		tags: ['autodocs'],
		args: { title: 'Αναζήτηση', closeLabel: 'Κλείσιμο', onClose: () => {} },
		argTypes: { closeElevated: { control: 'boolean' } },
		render: template
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="bg-background">
		<ModalHeader
			{...args}
			title={args.title as string}
			closeLabel={args.closeLabel as string}
			onClose={args.onClose as () => void}
		/>
	</div>
{/snippet}

<Story name="Playground" />

<Story
	name="Long Title"
	args={{ title: 'Αναζήτηση με πολλά κριτήρια και φίλτρα σε δύο γραμμές' }}
/>

<!-- The search modals' lifted «×» (the application's `closeButtonShadowStyle`, here `closeElevated`). -->
<Story name="Elevated Close" args={{ title: 'Φίλτρα', closeElevated: true }} />
