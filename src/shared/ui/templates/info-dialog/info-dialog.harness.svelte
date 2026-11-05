<script lang="ts">
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import { InfoDialog } from '$shared/ui/templates/info-dialog';

	let {
		onFirstDismiss = () => {}
	}: {
		onFirstDismiss?: () => void;
	} = $props();

	let first = $state(true);
	let second = $state(false);
</script>

<!-- The test's two levels: a window, and the InfoDialog opened from a link inside it. -->
<ModalScreenSurface
	bind:open={first}
	shape="sheet"
	aria-label="Κριτικές"
	data-testid="first"
	onDismiss={() => {
		onFirstDismiss();
		first = false;
	}}
>
	<button type="button" class="size-touch" data-testid="opener" onclick={() => (second = true)}
		>Πώς λειτουργούν</button
	>
	<button type="button" class="size-touch">Άλλο</button>
</ModalScreenSurface>
<InfoDialog
	bind:open={second}
	title="Πώς λειτουργούν οι κριτικές"
	closeLabel="Κλείσιμο"
	blocks={[{ heading: 'Έλεγχος', text: '<b>Κείμενο</b>' }]}
	links={[{ label: 'Κέντρο βοήθειας', href: '/help#what-are-reviews', testId: 'help' }]}
	testId="second"
/>
