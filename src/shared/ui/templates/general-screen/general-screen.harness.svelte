<script lang="ts">
	import type { ContainerWidth } from '$shared/ui/molecules/container';
	import { GeneralScreenTemplate } from './index';

	let {
		title,
		navTitle,
		backHref,
		maxWidth,
		withFooter = false,
		onBack
	}: {
		title?: string;
		navTitle?: string;
		backHref?: string;
		maxWidth?: ContainerWidth;
		withFooter?: boolean;
		onBack?: () => void;
	} = $props();
</script>

{#snippet save()}
	<div class="p-4"><button type="button" class="size-touch">Αποθήκευση</button></div>
{/snippet}

<GeneralScreenTemplate
	{title}
	{navTitle}
	{backHref}
	{maxWidth}
	{onBack}
	backLabel="Πίσω"
	backTestId="back"
	footer={withFooter ? save : undefined}
	data-testid="screen"
>
	<p>Περιεχόμενο</p>
</GeneralScreenTemplate>
