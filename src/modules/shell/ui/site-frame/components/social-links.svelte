<script lang="ts">
	import type { IoniconName } from '$shared/ui/icons/ionicon';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	// The networks of the footer; they have no address yet and stay inert, as before the kit.
	const networks: { label: string; icon: IoniconName }[] = [
		{ label: 'Facebook', icon: 'logo-facebook' },
		{ label: 'Instagram', icon: 'logo-instagram' },
		{ label: 'X', icon: 'logo-x' }
	];
</script>

<ul class="ml-1 flex items-center gap-touch-gap">
	{#each networks as network (network.label)}
		<li>
			<IconButton
				appearance="outline"
				icon={network.icon}
				iconSize="md"
				iconTone="muted"
				aria-label={network.label}
			/>
		</li>
	{/each}
</ul>
