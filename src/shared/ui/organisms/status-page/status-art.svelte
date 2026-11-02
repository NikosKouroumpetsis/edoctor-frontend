<script lang="ts" module>
	/**
	 * The status page's three pictures (U-61.1, the prototype 09's `status.js`): `pin` a map pin holding a Greek «;» at
	 * the end of a dotted way (a page that is not there), `card` an empty profile card with a stethoscope and the «;»
	 * (a profile that is not there), `plug` a plug out of its socket (a failure).
	 */
	export type StatusArtName = 'pin' | 'card' | 'plug';
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let { name, class: className }: { name: StatusArtName; class?: string } = $props();
</script>

<!-- 🔴 U-61.1: our own flat pictures, inline (no asset file, no dependency), in the theme's colours so the dark theme
     draws them too: the soft disc `muted-foreground/8`, the shapes `primary` · `accent` · `foreground`, the paper `card`,
     the empty lines `border`. Decorative: hidden from assistive tech. -->
<svg
	viewBox="0 0 400 360"
	aria-hidden="true"
	focusable="false"
	data-slot="status-art"
	data-art={name}
	class={cn('h-auto w-full', className)}
>
	<circle class="fill-muted-foreground/8" cx="200" cy="172" r="150" />
	{#if name === 'pin'}
		<ellipse class="fill-border" cx="210" cy="320" rx="86" ry="11" />
		<path
			class="fill-none stroke-muted-foreground stroke-5"
			d="M36 306c40-44 82 22 124-6"
			stroke-linecap="round"
			stroke-dasharray="1 13"
		/>
		<path
			class="fill-primary"
			d="M210 314C180 264 138 224 138 162a72 72 0 1 1 144 0c0 62-42 102-72 152Z"
		/>
		<circle class="fill-card" cx="210" cy="162" r="46" />
		<circle class="fill-primary" cx="210" cy="140" r="9.5" />
		<circle class="fill-primary" cx="210" cy="176" r="9.5" />
		<path
			class="fill-none stroke-primary stroke-8"
			d="M218.5 179c0 14-5 24-15 31"
			stroke-linecap="round"
		/>
		<circle class="fill-accent" cx="314" cy="86" r="7" />
		<circle class="fill-accent" cx="334" cy="114" r="4" />
		<circle class="fill-primary/45" cx="92" cy="104" r="5" />
	{:else if name === 'card'}
		<ellipse class="fill-border" cx="206" cy="322" rx="104" ry="11" />
		<path
			class="fill-card stroke-border stroke-3"
			d="M126 80h152a22 22 0 0 1 22 22v170a22 22 0 0 1 -22 22h-152a22 22 0 0 1 -22 -22v-170a22 22 0 0 1 22 -22Z"
		/>
		<circle class="fill-border" cx="202" cy="148" r="36" />
		<path
			class="fill-border"
			d="M152 204h100a6 6 0 0 1 6 6a6 6 0 0 1 -6 6h-100a6 6 0 0 1 -6 -6a6 6 0 0 1 6 -6Z"
		/>
		<path
			class="fill-border"
			d="M172 228h60a6 6 0 0 1 6 6a6 6 0 0 1 -6 6h-60a6 6 0 0 1 -6 -6a6 6 0 0 1 6 -6Z"
		/>
		<path
			class="fill-none stroke-foreground/80 stroke-6"
			d="M312 64c0 38 26 42 26 70M364 64c0 38-26 42-26 70M338 134c0 58-42 66-42 112"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
		<circle class="fill-foreground/80" cx="312" cy="62" r="7" />
		<circle class="fill-foreground/80" cx="364" cy="62" r="7" />
		<circle class="fill-primary" cx="296" cy="270" r="26" />
		<circle class="fill-card" cx="296" cy="270" r="10" />
		<circle class="fill-accent" cx="104" cy="82" r="24" />
		<circle class="fill-secondary-foreground" cx="104" cy="73" r="4.2" />
		<circle class="fill-secondary-foreground" cx="104" cy="89" r="4.2" />
		<path
			class="fill-none stroke-secondary-foreground stroke-3"
			d="M108 90.5c0 6-2.4 10.5-6.5 13.5"
			stroke-linecap="round"
		/>
	{:else}
		<ellipse class="fill-border" cx="200" cy="300" rx="120" ry="10" />
		<path
			class="fill-none stroke-foreground/80 stroke-8"
			d="M24 246c56 0 64-46 116-46"
			stroke-linecap="round"
		/>
		<path
			class="fill-primary"
			d="M150 174h42a12 12 0 0 1 12 12v28a12 12 0 0 1 -12 12h-42a12 12 0 0 1 -12 -12v-28a12 12 0 0 1 12 -12Z"
		/>
		<path
			class="fill-foreground/80"
			d="M207 186h18a3 3 0 0 1 3 3v3a3 3 0 0 1 -3 3h-18a3 3 0 0 1 -3 -3v-3a3 3 0 0 1 3 -3Z"
		/>
		<path
			class="fill-foreground/80"
			d="M207 205h18a3 3 0 0 1 3 3v3a3 3 0 0 1 -3 3h-18a3 3 0 0 1 -3 -3v-3a3 3 0 0 1 3 -3Z"
		/>
		<path
			class="fill-card stroke-border stroke-3"
			d="M282 166h42a16 16 0 0 1 16 16v36a16 16 0 0 1 -16 16h-42a16 16 0 0 1 -16 -16v-36a16 16 0 0 1 16 -16Z"
		/>
		<path
			class="fill-border"
			d="M279 186h10a3 3 0 0 1 3 3v3a3 3 0 0 1 -3 3h-10a3 3 0 0 1 -3 -3v-3a3 3 0 0 1 3 -3Z"
		/>
		<path
			class="fill-border"
			d="M279 205h10a3 3 0 0 1 3 3v3a3 3 0 0 1 -3 3h-10a3 3 0 0 1 -3 -3v-3a3 3 0 0 1 3 -3Z"
		/>
		<path
			class="fill-none stroke-foreground/80 stroke-8"
			d="M340 200c26 0 30 40 52 40"
			stroke-linecap="round"
		/>
		<path
			class="fill-none stroke-accent stroke-4"
			d="M246 156l6-18M234 150l-8-14M258 166l14-8M246 246l8 16M232 250l-6 16"
			stroke-linecap="round"
		/>
	{/if}
</svg>
