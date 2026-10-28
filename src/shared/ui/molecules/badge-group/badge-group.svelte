<script lang="ts" module>
	/** One badge: its id and the caller's words. */
	export type BadgeGroupItem = { id: string; label: string };
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Badge } from '$shared/ui/primitives/badge';

	let {
		title,
		items,
		testId,
		testIdPrefix,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		title: string;
		items: readonly BadgeGroupItem[];
		testId?: string;
		/** `<prefix>-<id>` per badge (the application's test ids). */
		testIdPrefix?: string;
	} = $props();

	const titleId = useId(undefined, 'badge-group');
</script>

<!-- The application's group (M-28): a semibold title over one small outline badge per item, wrapping onto as many
     rows as it needs; on the web the badges are a list the title names. -->
<div
	data-slot="badge-group"
	data-testid={testId}
	class={cn('flex flex-col gap-3', className)}
	{...restProps}
>
	<p id={titleId} class="text-body-md font-semibold text-foreground">{title}</p>
	<ul role="list" aria-labelledby={titleId} class="flex flex-row flex-wrap gap-2">
		{#each items as item (item.id)}
			<li class="flex">
				<Badge
					label={item.label}
					size="sm"
					tone="outline"
					data-testid={testIdPrefix ? `${testIdPrefix}-${item.id}` : undefined}
				/>
			</li>
		{/each}
	</ul>
</div>
