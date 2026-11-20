<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Picture } from '$shared/ui/icons/picture';
	import { StatusPill } from '$shared/ui/molecules/status-pill';
	import type { DoctorArticleRow } from '$modules/doctor-dashboard/lib/articles';

	let { row, href }: { row: DoctorArticleRow; href: string } = $props();

	// A cover that does not load leaves the prototype's picture in its place (the page goes on with its words).
	let failed = $state(false);
</script>

<!-- 🔴 D-W52-102 (U-221.1, `64-switch/sw.js` `arRow`): one article of the doctor — its cover (or the pen), its state's
     pill, the title, «είδος · what the state says», «›» at its end; a link to its own page (U-102). No colour under the
     pointer (U-100); every word a text node (U-65.6). -->
<li class="border-b border-line">
	<!-- The article's page, already resolved in the page's language (a module knows no route). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		{href}
		data-testid={`doctor-article-${row.id}`}
		class="flex min-h-row-lg w-full flex-row items-center gap-4 rounded-sm py-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
	>
		<!-- `sw.css:617-618` `.w-arthumb`: a cover (or its picture, when it does not load) on `muted`, the prototype's warm;
		     the pen alone, for an article without a cover, on `chip`. -->
		<span
			aria-hidden="true"
			data-slot="doctor-article-thumb"
			class={[
				'flex size-row-lg shrink-0 items-center justify-center overflow-hidden rounded-md',
				row.imageUrl ? 'bg-muted text-line-2' : 'bg-chip text-muted-foreground'
			]}
		>
			{#if row.imageUrl && !failed}
				<img
					src={row.imageUrl}
					alt=""
					loading="lazy"
					decoding="async"
					onerror={() => (failed = true)}
					class="size-full object-cover"
				/>
			{:else if row.imageUrl}
				<Picture class="icon-lg" data-testid={`doctor-article-${row.id}-cover-missing`} />
			{:else}
				<Ionicon name="create-outline" class="icon-md" />
			{/if}
		</span>
		<span class="flex min-w-0 flex-1 flex-col items-start gap-1">
			<StatusPill pill={row.pill} testId={`doctor-article-${row.id}-state`} />
			<span class="text-body-lg font-semibold wrap-anywhere text-foreground">{row.title}</span>
			<span data-testid={`doctor-article-${row.id}-meta`} class="text-body-sm text-muted-foreground"
				>{row.meta}</span
			>
		</span>
		<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</li>
