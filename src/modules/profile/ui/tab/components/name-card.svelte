<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { ProfileIdentity } from '$modules/profile/types';

	let { identity }: { identity: ProfileIdentity } = $props();
</script>

<!-- 🔴 The name card of the «Προφίλ» (record §5.1, D-W45-18, `56-profile/prof.css:13-17` `.p-card`): the 24 corner and
     the card's shadow; the initial 34 / 600 in its 88 circle on the warm (a person's glyph when no name is known), the
     name 22 / 600 and under it, 14 muted, the sign-in address or mobile AS THE SERVER HIDES IT (U-168); an account the
     server names nothing for is the glyph alone (the application's card, the same). 🔴 U-164 Ε2 Β:
     it is NOT pressed — a plain box, never a link or a button. Every word is a text node (U-65.6). -->
<div
	data-testid="profile-name-card"
	class="grid w-full justify-items-center rounded-xl border border-line bg-card px-4 pt-reading-crumbs pb-6 text-center shadow-overlay"
>
	<span
		aria-hidden="true"
		data-testid="profile-name-initial"
		class="grid size-profile-initial place-items-center rounded-full bg-muted text-display-xs font-semibold text-foreground"
	>
		{#if identity.initial}
			{identity.initial}
		{:else}
			<Ionicon name="person" class="icon-xl text-muted-foreground" />
		{/if}
	</span>
	{#if identity.title}
		<p data-testid="profile-name" class="mt-3 max-w-full text-heading-sm text-foreground">
			{identity.title}
		</p>
	{/if}
	{#if identity.line}
		<p data-testid="profile-name-line" class="mt-0.5 max-w-full text-body-sm text-muted-foreground">
			{identity.line}
		</p>
	{/if}
</div>
