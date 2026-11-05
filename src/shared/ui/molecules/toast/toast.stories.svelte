<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Toast, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import { Button } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Molecules/Toast',
		component: Toast,
		tags: ['autodocs'],
		args: { message: 'Αποθηκεύτηκε στα αγαπημένα' }
	});

	const toasts = new ToastState();
</script>

<!-- The card alone; the words and the action are the caller's. -->
<Story name="Default">
	{#snippet template(args)}
		<Toast {...args} action={{ label: 'Αναίρεση', onPress: () => undefined }} />
	{/snippet}
</Story>

<Story name="Danger">
	{#snippet template()}
		<Toast
			message="Η αποθήκευση δεν έγινε."
			tone="danger"
			action={{ label: 'Δοκιμάστε ξανά', onPress: () => undefined }}
		/>
	{/snippet}
</Story>

<!-- The host: one at a time, the new one takes the old one's place; it waits under the pointer or the focus. -->
<Story name="Host">
	{#snippet template()}
		<Button
			label="Εμφάνιση"
			onclick={() =>
				toasts.show({
					message: 'Αποθηκεύτηκε στα αγαπημένα',
					action: { label: 'Αναίρεση', onPress: () => undefined }
				})}
		/>
		<Toaster {toasts} />
	{/snippet}
</Story>
