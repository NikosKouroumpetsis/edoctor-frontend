<script lang="ts">
	import type { DoctorCard as DoctorCardType } from '$modules/search-doctors/types';
	import { RAIL_CARDS_PER_VIEW, Rail, type RailScrollLabels } from '$shared/ui/organisms/rail';
	import DoctorCard, { type FavoriteToggle } from '$modules/search-doctors/ui/search-doctor-card';

	let {
		title,
		viewAllLabel,
		viewAllHref,
		scrollLabels,
		doctors,
		profileHref,
		profileLabel,
		favoriteLabel,
		favorites,
		feeRoomLabel,
		onSignIn
	}: {
		title: string;
		/** The «→» beside the title: its name and the row's results (already localized and resolved). */
		viewAllLabel: string;
		viewAllHref: string;
		scrollLabels: RailScrollLabels;
		doctors: DoctorCardType[];
		profileHref: (doctorSlug: string) => string;
		profileLabel: string;
		favoriteLabel: string;
		/** Every heart of the row (U-85). */
		favorites: FavoriteToggle;
		/** 🔴 U-99.2: the guest's words, whose room the cards keep: nothing moves when the amounts arrive. */
		feeRoomLabel: string;
		/** «Συνδεθείτε για κόστος» of a card whose fee is hidden: the sign-in (U-27.4). */
		onSignIn: () => void;
	} = $props();
</script>

<!-- A home row (U-20): the title (20, 22 from 744) with the «→» circle to the row's results beside it, no subtitle;
     ‹ › always from 744, faint at an end; the cards by the zone (~2.3 · 4 · 5 · 6 · 7), 12 apart, snapping. -->
<Rail
	{title}
	trailing={{ icon: 'arrow-forward', label: viewAllLabel, href: viewAllHref }}
	controlsFrom="tablet"
	perView={RAIL_CARDS_PER_VIEW}
	{scrollLabels}
	data-testid="home-row"
>
	{#each doctors as doctor (doctor.id)}
		<div>
			<DoctorCard
				{doctor}
				href={profileHref(doctor.doctorSlug)}
				{profileLabel}
				{favoriteLabel}
				saved={favorites.isSaved(doctor.id)}
				pop={favorites.isPopping(doctor.id)}
				onFavorite={() => favorites.toggle(doctor)}
				{feeRoomLabel}
				{onSignIn}
			/>
		</div>
	{/each}
</Rail>
