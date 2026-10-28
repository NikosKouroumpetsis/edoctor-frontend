<script lang="ts">
	import { untrack } from 'svelte';
	import { Popover, PopoverContent, PopoverTrigger } from '$shared/ui/primitives/popover';
	import {
		ModalScreenTemplate,
		type ModalOrigin,
		type ModalScreenContentAlignment,
		type ModalScreenTitleSize
	} from './index';

	let {
		initialOpen = true,
		title = 'Διαθεσιμότητα',
		titleSize,
		isTitleLoading,
		contentAlignment,
		withBack = false,
		withClose = true,
		withFooter = false,
		scrollToOffset,
		onBack = () => {},
		onClose = () => {},
		withPopover = false,
		withPanel = false,
		sourceLayout
	}: {
		initialOpen?: boolean;
		title?: string;
		titleSize?: ModalScreenTitleSize;
		isTitleLoading?: boolean;
		contentAlignment?: ModalScreenContentAlignment;
		withBack?: boolean;
		withClose?: boolean;
		withFooter?: boolean;
		scrollToOffset?: number;
		onBack?: () => void;
		onClose?: () => void;
		withPopover?: boolean;
		withPanel?: boolean;
		sourceLayout?: ModalOrigin;
	} = $props();

	let open = $state(untrack(() => initialOpen));
	const back = $derived(withBack ? { onBack, backLabel: 'Πίσω', backTestId: 'back' } : {});
	const close = $derived(
		withClose ? { onClose, closeLabel: 'Κλείσιμο', closeTestId: 'close' } : {}
	);
</script>

{#snippet confirm()}
	<div class="p-4"><button type="button" class="size-touch">Επιβεβαίωση</button></div>
{/snippet}

<button type="button" class="size-touch" onclick={() => (open = true)}>Άνοιγμα</button>
<ModalScreenTemplate
	bind:open
	{title}
	{titleSize}
	{isTitleLoading}
	{contentAlignment}
	{scrollToOffset}
	{sourceLayout}
	{...back}
	{...close}
	footer={withFooter ? confirm : undefined}
	data-testid="modal"
>
	<p>Περιεχόμενο</p>
	{#if withPopover}
		<Popover>
			<PopoverTrigger class="min-h-touch min-w-touch">Ειδικότητα</PopoverTrigger>
			<PopoverContent>
				<button type="button" class="size-touch">Καρδιολόγος</button>
			</PopoverContent>
		</Popover>
	{/if}
	{#if withPanel}
		<!-- A panel of the caller that takes Escape for itself (closing a list, clearing a field). -->
		<input
			aria-label="Πάνελ"
			class="min-h-touch w-full"
			onkeydown={(event) => event.key === 'Escape' && event.preventDefault()}
		/>
	{/if}
</ModalScreenTemplate>
