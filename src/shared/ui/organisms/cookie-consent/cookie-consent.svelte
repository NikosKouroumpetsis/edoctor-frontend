<script lang="ts">
	import CookieIcon from '~icons/lucide/cookie';
	import { cn } from '$shared/lib/utils';
	import { Button } from '$shared/ui/primitives/button';

	let {
		open = $bindable(true),
		title = 'We value your privacy',
		description = 'We use cookies to improve your experience, analyse traffic and personalise content. You can accept all or only the essentials.',
		onAccept,
		onReject,
		class: className
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		onAccept?: () => void;
		onReject?: () => void;
		class?: string;
	} = $props();

	function accept() {
		open = false;
		onAccept?.();
	}
	function reject() {
		open = false;
		onReject?.();
	}
</script>

{#if open}
	<div
		role="region"
		aria-label="Cookie consent"
		data-slot="cookie-consent"
		class={cn(
			'flex flex-col gap-4 rounded-panel border border-border bg-card p-card shadow-overlay md:flex-row md:items-center',
			className
		)}
	>
		<div class="flex flex-1 items-start gap-3">
			<CookieIcon class="mt-0.5 size-6 shrink-0 text-primary" />
			<div>
				<p class="text-title-sm font-semibold">{title}</p>
				<p class="mt-1 text-body-sm text-muted-foreground">{description}</p>
			</div>
		</div>
		<div class="flex shrink-0 gap-2">
			<Button variant="outline" onclick={reject}>Essentials only</Button>
			<Button onclick={accept}>Accept all</Button>
		</div>
	</div>
{/if}
