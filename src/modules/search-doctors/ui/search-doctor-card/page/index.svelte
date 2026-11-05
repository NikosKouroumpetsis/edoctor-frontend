<script lang="ts">
	import { goto } from '$app/navigation';
	import type { DoctorCard, SearchResultCard } from '$modules/search-doctors/types';
	import { getSessionOptional } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { MediaCard } from '$shared/ui/organisms/media-card';
	import { FavoriteButton } from '$shared/ui/primitives/favorite-button';
	import { HighlightText } from '$shared/ui/primitives/highlight-text';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';
	import FeeSignIn from '../components/fee-sign-in.svelte';
	import { searchDoctorCardMedia } from '../lib/media';
	import type { SearchDoctorCardSpecialtyPlacement, SearchDoctorCardVariant } from '../types';

	let {
		doctor,
		variant = 'rail',
		href,
		profileLabel,
		favoriteLabel,
		onFavorite,
		saved = false,
		pop = false,
		specialtyPlacement = 'lines',
		highlightQuery = '',
		feeRoomLabel,
		onSignIn,
		onHover,
		loading,
		testId = 'home-doctor-card'
	}: {
		/** The card's facts; the list variant also draws the results' (description, address, reviews). */
		doctor: DoctorCard &
			Partial<Pick<SearchResultCard, 'description' | 'address' | 'reviewCountLabel'>>;
		variant?: SearchDoctorCardVariant;
		/** The profile, already localized and resolved. */
		href: string;
		/** «Προφίλ γιατρού»: the link's name is this and the doctor's name. */
		profileLabel: string;
		/** «Αποθήκευση γιατρού»: the heart's name is this and the doctor's name. */
		favoriteLabel: string;
		/** The heart's press (`useFavoriteToggle`, U-85: a guest signs in first). */
		onFavorite: () => void;
		/** Whether this doctor is in the favourites: the heart filled. */
		saved?: boolean;
		/** The heart has just filled: its «pop» plays. */
		pop?: boolean;
		/** 🔴 U-83.2: `top` only inside the favourites; the search's and the home's card stay as wave 1 approved them. */
		specialtyPlacement?: SearchDoctorCardSpecialtyPlacement;
		/** U-83.3: the favourites' search, its words marked in the lines it reads (text nodes only, U-65.6). */
		highlightQuery?: string;
		/**
		 * 🔴 U-99.2, only the home's cards: the guest's words, «Συνδεθείτε για κόστος». The line of the fee keeps the room they
		 * take, so nothing moves when a member's amount arrives over the row the server drew for a guest.
		 */
		feeRoomLabel?: string;
		/**
		 * «Συνδεθείτε για κόστος» while the fee is hidden: a guest's sign-in (S-31.4, U-27.4), never the profile. A member
		 * who still reads these words does not get here: their read of the fees failed, so the press opens the profile.
		 */
		onSignIn: () => void;
		/** The pointer came onto the card (`true`) or left it: the results map grows its pin (§7.1). */
		onHover?: (hovering: boolean) => void;
		/** `eager` for the first row of a page. */
		loading?: 'lazy' | 'eager';
		/** `<testId>`, `<testId>-favorite`, `<testId>-name` … (the home's `home-doctor-card`, the results' own). */
		testId?: string;
	} = $props();

	const session = getSessionOptional();

	// `w2-w2:116`: signed in, with nothing left to sign in to: the profile reads the fee itself, and the card asks nothing
	// of its own (D-103).
	function pressFee() {
		if (!session?.isMember) {
			onSignIn();
			return;
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- the caller has resolved it
		void goto(href);
	}

	const isList = $derived(variant === 'list');
	const signInForFee = $derived(doctor.fee.kind === 'login');
	const onTop = $derived(specialtyPlacement === 'top' && Boolean(doctor.specialty));
	const facts = $derived([onTop ? '' : doctor.specialty, doctor.area].filter(Boolean).join(' · '));
	// Airbnb's lines: each wraps to two at most rather than a «…» (U-20).
	const line = 'line-clamp-2 text-label-lg leading-tight';
	// The results' lines (the prototype's `.rgrid .card p`): 14, one line each but the description's two.
	const listLine = 'line-clamp-1 text-body-sm';
	// U-27.4 (f1b): a line with the fee's action keeps 4 of room around it for the action's grown target and focus ring
	// (its clamp clips what lies outside it), given back by its margin: nothing moves.
	const actionRoom = '-m-1 p-1';
</script>

{#snippet marked(words: string)}{#if highlightQuery}<HighlightText
			text={words}
			query={highlightQuery}
			eachWord
			highlightClass="rounded-xs bg-primary/15 box-decoration-clone"
		/>{:else}{words}{/if}{/snippet}

{#snippet score(slotted: boolean)}<span
		data-slot={slotted ? `${testId}-rating` : undefined}
		class="whitespace-nowrap"
		><span data-slot={slotted ? `${testId}-star` : undefined} class="text-rating">★</span
		>&nbsp;<span class="text-foreground">{doctor.ratingLabel}</span></span
	>{/snippet}

<!-- U-99.2, the home's guest: « · ★ 4,9» with the dot in a box the line takes back. Beside the words it sits where it always
     did; when the score starts a line, the box falls outside the line's clip and no dot is left over at the end of the
     line above. The words wrap as before. -->
{#snippet dotAndScore(slotted = false)}<span class="mr-2"></span>
	<span class="-ml-2 whitespace-nowrap"
		><span class="inline-block w-2">·&#32;</span>{@render score(slotted)}</span
	>{/snippet}

{#snippet priceLine(placed = '')}
	<p
		data-slot={`${testId}-price`}
		class={[
			line,
			'font-normal',
			placed,
			doctor.fee.kind === 'amount' ? 'text-foreground' : 'text-muted-foreground',
			(signInForFee || feeRoomLabel) && actionRoom
		]}
	>
		<!-- U-27.4: «🔒 Συνδεθείτε για κόστος · ★ 4,9» — the first part alone is the action, inline in the SAME
		     line (its 13, its height, its two-line clamp), « · ★ 4,9» as before, wrapping with it as text. -->
		{#if signInForFee}<FeeSignIn
				label={doctor.fee.label}
				onPress={pressFee}
				testId={`${testId}-sign-in`}
			/>{#if feeRoomLabel}{@render dotAndScore(true)}{:else}&#32;· {@render score(
					true
				)}{/if}{:else}{doctor.fee.label} · {@render score(true)}{/if}
	</p>
{/snippet}

<!-- U-20, the home's doctor card (Airbnb's on the application's facts): ONE link over the whole card to the profile,
     the heart its own button over the photo (white, with a shadow), «Επιλογή ασθενών» at the top left, the 1:1
     photo with the 16 corner lighting up as it arrives (0.8 s), then four lines. The ★ wears the `rating` colour
     (the application's, both themes) and never parts from its value (a no-break space).
     U-24.1, the results' list variant: the same card with Airbnb's 4:3 photo and the application's facts — the name,
     the specialty, the description (two muted lines), the full address (+ «· 0,6 χλμ» on «Κοντά μου»), the blue
     availability, the price, then «★ 4,9» (★ accent, the number blue) and «💬 184» — «★ Νέο» without reviews.
     U-27.3: the specialty (and the home's «Ειδικότητα · Περιοχή») in the text colour. U-27.4: a hidden fee is its own
     button (`FeeSignIn`, after the heart in the Tab order: the link, the heart over the photo, then the lines'). -->
<MediaCard
	{href}
	linkLabel={`${profileLabel} ${doctor.name}`}
	imageUrl={doctor.imageUrl}
	aspect={searchDoctorCardMedia[variant].aspect}
	imageClass="rounded-lg"
	reveal
	{loading}
	data-testid={testId}
	data-variant={variant}
	class={isList ? 'w-full gap-3' : 'w-full gap-2.5'}
	onpointerenter={onHover ? () => onHover(true) : undefined}
	onpointerleave={onHover ? () => onHover(false) : undefined}
>
	{#snippet badge()}
		{#if doctor.badgeLabel}
			<MediaBadge label={doctor.badgeLabel} maxLines={2} width="badge" besideAction />
		{/if}
	{/snippet}
	{#snippet action()}
		<FavoriteButton
			selected={saved}
			{pop}
			onToggle={onFavorite}
			aria-label={`${favoriteLabel} ${doctor.name}`}
			appearance="overlay"
			size="card-heart"
			inset={isList ? 'xs' : 'none'}
			data-testid={`${testId}-favorite`}
		/>
	{/snippet}
	{#if isList}
		<span class="flex flex-col gap-0.5">
			{#if onTop}
				<!-- 🔴 U-83.2 (17/700 below 744, 20/600 from it, two lines at most): the first line, the only place it is said. -->
				<span
					data-slot={`${testId}-specialty`}
					class="mb-0.5 line-clamp-2 text-title-xs font-bold text-foreground tablet:text-title-lg tablet:leading-tight tablet:font-semibold"
				>
					{@render marked(doctor.specialty)}
				</span>
			{/if}
			<span
				data-slot={`${testId}-name`}
				class="line-clamp-1 text-body-md font-semibold text-foreground"
			>
				{@render marked(doctor.name)}
			</span>
			{#if doctor.specialty && !onTop}
				<!-- U-27.3 (app = web): the specialty in the text colour; the description stays muted. -->
				<span class={[listLine, 'text-foreground']}>{doctor.specialty}</span>
			{/if}
			{#if doctor.description}
				<span
					data-slot={`${testId}-description`}
					class="mt-1 line-clamp-2 text-body-sm text-muted-foreground"
				>
					{doctor.description}
				</span>
			{/if}
			{#if doctor.address}
				<span data-slot={`${testId}-address`} class={[listLine, 'text-foreground']}>
					{@render marked(doctor.address)}
				</span>
			{/if}
			{#if doctor.availabilityLabel}
				<span
					data-slot={`${testId}-availability`}
					class={[listLine, 'font-semibold text-primary-text']}
				>
					{doctor.availabilityLabel}
				</span>
			{/if}
			<!-- U-27.4: the hidden fee is the line's action, inline (the line's 14 and height, as before). -->
			<span
				data-slot={`${testId}-price`}
				class={[
					listLine,
					doctor.fee.kind === 'amount' ? 'text-foreground' : 'text-muted-foreground',
					signInForFee && actionRoom
				]}
			>
				{#if signInForFee}<FeeSignIn
						label={doctor.fee.label}
						onPress={pressFee}
						testId={`${testId}-sign-in`}
					/>{:else}{doctor.fee.label}{/if}
			</span>
			<span
				data-slot={`${testId}-rating`}
				class="flex flex-row items-center gap-2.5 text-body-sm text-foreground"
			>
				<!-- NIT-7 (r1): plain text kept whole (`nowrap`): the no-break space alone parts ★ and the number (the
				     prototype's 4), never a flex gap around it as well. -->
				<span class="whitespace-nowrap"
					><span data-slot={`${testId}-star`} class="text-rating">★</span>&nbsp;<span
						class={doctor.reviewCountLabel ? 'font-semibold text-primary-text' : 'text-foreground'}
						>{doctor.ratingLabel}</span
					></span
				>
				{#if doctor.reviewCountLabel}
					<span
						data-slot={`${testId}-reviews`}
						class="inline-flex items-center gap-1 text-muted-foreground"
					>
						<Ionicon name="chatbubble-outline" class="icon-sm" />
						{doctor.reviewCountLabel}
					</span>
				{/if}
			</span>
		</span>
	{:else}
		{#if onTop}
			<!-- 🔴 U-83.2 (17/700, two lines at most, «…» after them): the first line, the only place it is said. -->
			<p
				data-slot={`${testId}-specialty`}
				class="mb-0.5 line-clamp-2 text-title-xs leading-tight font-bold text-foreground"
			>
				{@render marked(doctor.specialty)}
			</p>
		{/if}
		<p data-slot={`${testId}-name`} class="line-clamp-2 text-body-sm font-semibold text-foreground">
			{@render marked(doctor.name)}
		</p>
		{#if facts}
			<!-- U-27.3 (app = web): «Ειδικότητα · Περιοχή» in the text colour. -->
			<p class={[line, 'font-normal text-foreground']}>{@render marked(facts)}</p>
		{/if}
		{#if doctor.availabilityLabel}
			<p data-slot={`${testId}-availability`} class={[line, 'font-semibold text-primary-text']}>
				{doctor.availabilityLabel}
			</p>
		{/if}
		{#if feeRoomLabel}
			<!-- 🔴 U-99.2: the amount lies over the guest's line, drawn unseen in the same cell: the cell is as tall as that line
			     at every width (two lines where it wraps, one where it fits), for a guest exactly as before. -->
			<div data-slot={`${testId}-price-room`} class="grid">
				{@render priceLine('col-start-1 row-start-1')}
				{#if !signInForFee}
					<p
						aria-hidden="true"
						data-slot={`${testId}-price-spacer`}
						class={[line, actionRoom, 'invisible col-start-1 row-start-1 font-normal']}
					>
						<FeeSignIn label={feeRoomLabel} onPress={pressFee} />{@render dotAndScore()}
					</p>
				{/if}
			</div>
		{:else}
			{@render priceLine()}
		{/if}
	{/if}
</MediaCard>
