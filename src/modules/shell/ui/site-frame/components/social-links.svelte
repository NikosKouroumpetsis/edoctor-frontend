<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { socialNetworks } from '$modules/shell/config/social';
</script>

<!-- 🔴 U-26.2: Facebook · X · Instagram (20) beside the language. A network without an address is its icon alone,
     named for assistive tech, never a dead link or a button that does nothing; with one it opens in a new tab. -->
<ul data-slot="social-links" class="flex flex-row items-center gap-2">
	{#each socialNetworks as network (network.key)}
		<li class="flex">
			{#if network.url}
				<a
					href={network.url}
					target="_blank"
					rel="external noopener noreferrer"
					aria-label={network.label}
					data-testid={`social-${network.key}`}
					class="grid min-h-touch min-w-touch place-items-center rounded-full text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<Ionicon name={network.icon} class="icon-md" />
				</a>
			{:else}
				<span
					role="img"
					aria-label={network.label}
					data-testid={`social-${network.key}`}
					class="grid size-touch place-items-center text-foreground"
				>
					<Ionicon name={network.icon} class="icon-md" />
				</span>
			{/if}
		</li>
	{/each}
</ul>
