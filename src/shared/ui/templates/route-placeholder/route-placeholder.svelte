<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';

	let {
		eyebrow,
		title,
		body,
		backHref,
		backLabel,
		documentTitle
	}: {
		eyebrow: string;
		title: string;
		body: string;
		/** Where «back» leads (the localized home page), resolved by the caller. */
		backHref: string;
		backLabel: string;
		/** The tab's title; the caller adds the product name (`title` when absent). */
		documentTitle?: string;
	} = $props();
</script>

<svelte:head>
	<title>{documentTitle ?? title}</title>
	<meta name="description" content={body} />
</svelte:head>

<main class="bg-background">
	<section class="container-page grid min-h-page place-items-center py-section-lg">
		<div class="w-full max-w-content rounded-md border border-border bg-card p-card shadow-raised">
			<div class="flex items-start gap-4">
				<div
					class="grid size-icon-tile shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"
				>
					<Ionicon name="browsers-outline" class="icon-md" />
				</div>
				<div>
					<p class="text-body-sm font-semibold text-primary-text">{eyebrow}</p>
					<h1 class="mt-2 text-heading-xl text-balance">{title}</h1>
					<p class="mt-3 text-body-lg text-muted-foreground">{body}</p>
				</div>
			</div>

			<div class="mt-6">
				<Button href={backHref} label={backLabel} tone="outline">
					{#snippet leading()}
						<Ionicon name="arrow-back" class="icon-sm text-foreground" />
					{/snippet}
				</Button>
			</div>
		</div>
	</section>
</main>
