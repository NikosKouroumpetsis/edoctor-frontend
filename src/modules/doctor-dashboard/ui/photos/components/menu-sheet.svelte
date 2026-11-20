<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { BottomSheet } from '$shared/ui/molecules/bottom-sheet';

	let {
		open = $bindable(false),
		locale,
		position,
		main,
		cropHref,
		onMain,
		onDelete
	}: {
		open?: boolean;
		locale: SupportedLocale;
		/** The photo's place in the order shown, from 1: the sheet is named by it. */
		position: number;
		/** The first photo: it is the main one already, so the sheet has no «Κάντε την κύρια». */
		main: boolean;
		/** «Προσαρμογή» of this photo, resolved in the page's language; `null` while no photo is asked about. */
		cropHref: string | null;
		onMain: () => void;
		onDelete: () => void;
	} = $props();

	const options = $derived({ locale });
	const rowClass =
		'flex min-h-row w-full flex-row items-center text-start text-body-lg outline-none transition-opacity duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70';

	/** A row's press: the sheet goes first, then what the row does (a window of its own opens over a clear page). */
	function pick(act: () => void) {
		open = false;
		act();
	}
</script>

<!-- 🔴 D-W52-37α (U-81.2; `64-switch/sw.js` `phSheet`, `78-photos.html` «στο κινητό ανοίγει φύλλο από κάτω»): what «⋯» of
     a photo opens below 744 — the kit's sheet from the bottom, as the application's, with the SAME three of the menu a
     photo has from 744: «Κάντε την κύρια» (never for the first) · «Προσαρμογή» (a link to its own page, U-102) ·
     «Διαγραφή». One under the other (U-112), no colour under the pointer (U-100), every word a text node. -->
<BottomSheet
	bind:open
	size="sm"
	aria-label={m.doctor_photos_options({ position }, options)}
	data-testid="doctor-photo-sheet"
	class="tablet:hidden"
>
	<ul class="flex flex-col px-gutter-sm pb-section">
		{#if !main}
			<li>
				<button
					type="button"
					onclick={() => pick(onMain)}
					data-testid="doctor-photo-sheet-make-main"
					class={[rowClass, 'text-foreground']}
				>
					{m.doctor_photos_make_main({}, options)}
				</button>
			</li>
		{/if}
		{#if cropHref}
			<li>
				<!-- The page's address, already resolved in the page's language (a module knows no route). -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={cropHref}
					onclick={() => (open = false)}
					data-testid="doctor-photo-sheet-crop"
					class={[rowClass, 'text-foreground']}
				>
					{m.doctor_photos_crop({}, options)}
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</li>
		{/if}
		<li>
			<button
				type="button"
				onclick={() => pick(onDelete)}
				data-testid="doctor-photo-sheet-delete"
				class={[rowClass, 'text-accent']}
			>
				{m.doctor_photos_delete({}, options)}
			</button>
		</li>
	</ul>
</BottomSheet>
