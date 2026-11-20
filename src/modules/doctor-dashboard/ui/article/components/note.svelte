<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { DoctorArticleNote } from '$modules/doctor-dashboard/lib/articles';

	let { note }: { note: DoctorArticleNote } = $props();

	const glyphs = {
		pen: 'create-outline',
		clock: 'time-outline',
		done: 'checkmark-circle-outline'
	} as const;
</script>

<!-- 🔴 D-W52-103 (U-221.1, `sw.js` `arNote`): the article's state over the page — a band (draft, in review, published,
     a change in review) or, refused, the team's words as on screen 84 (`.w-rvans.no`). Every word a text node (U-65.6). -->
{#if note.kind === 'band'}
	<p
		data-testid="doctor-article-note"
		class="mt-4 flex flex-row items-start gap-2.5 rounded-md bg-foreground/5 px-3.5 py-3 text-body-sm text-foreground"
	>
		<Ionicon name={glyphs[note.glyph]} class="icon-md shrink-0" />
		<span>{note.text}</span>
	</p>
{:else}
	<div
		data-testid="doctor-article-note"
		data-refused=""
		class="mt-4 rounded-md border border-line px-3.5 py-3 text-body-sm"
	>
		<p class="font-semibold text-accent">{note.title}</p>
		{#if note.reason}
			<p data-testid="doctor-article-reason" class="mt-1 wrap-anywhere text-foreground">
				{note.reason}
			</p>
		{/if}
		<p class="mt-1 text-muted-foreground">{note.fix}</p>
	</div>
{/if}
