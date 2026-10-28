<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { Divider } from '$shared/ui/primitives/divider';

	let {
		label,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The word between the two lines («ή» before the sign-in providers). */
		label: string;
	} = $props();
</script>

<!-- Two hairlines with a word between them (M-41): the application's sign-in «ή» row. -->
<div
	data-slot="divider-with-label"
	class={cn('flex flex-row items-center gap-4', className)}
	{...restProps}
>
	<Divider class="flex-1" spacing="none" />
	<span class="text-body-md text-muted-foreground">{label}</span>
	<Divider class="flex-1" spacing="none" />
</div>
