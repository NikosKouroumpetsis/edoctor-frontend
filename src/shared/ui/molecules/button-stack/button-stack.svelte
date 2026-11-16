<script lang="ts" module>
	/** One answer of the stack: the caller's words, already localized, and what a press does. */
	export type ButtonStackAction = {
		id: string;
		label: string;
		/** The dark one: drawn LAST whatever its place in the list, nearest the thumb (U-190.1). */
		emphasis?: boolean;
		/** Its press is on its way: the busy indicator in place of the words, presses refused. */
		loading?: boolean;
		disabled?: boolean;
		/** A way to another page (already resolved by the caller): the answer is a link, so it works without scripts. */
		href?: string;
		/** What a press does; with `href`, before the link is followed (a caller may take the plain press over). */
		onPress?: (event: MouseEvent) => void;
		testId?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Button } from '$shared/ui/primitives/button';

	let {
		actions,
		class: className,
		testId
	}: {
		/** One to three answers; the outlined ones in their order, then the dark one. */
		actions: readonly ButtonStackAction[];
		class?: string;
		testId?: string;
	} = $props();

	const ordered = $derived([
		...actions.filter((action) => !action.emphasis),
		...actions.filter((action) => action.emphasis)
	]);
</script>

<!-- 🔴 U-189.1 / U-190.1 (D-W51-27, `sw.css:138-141`): a card's answers one under the other at EVERY width, each the whole
     width, fully round, 48 high, 16/600; the outlined first and the dark one last. No colour under the pointer (U-100). -->
{#if ordered.length > 0}
	<div
		data-slot="button-stack"
		data-testid={testId}
		class={cn('grid grid-cols-1 gap-2.5', className)}
	>
		{#each ordered as action (action.id)}
			<Button
				label={action.label}
				tone={action.emphasis ? 'contrast' : 'outline'}
				radius="full"
				hover={false}
				textClass="text-body-lg"
				loading={action.loading}
				disabled={action.disabled}
				href={action.href}
				onclick={(event: MouseEvent) => action.onPress?.(event)}
				data-emphasis={action.emphasis ? '' : undefined}
				data-testid={action.testId}
				class="w-full"
			/>
		{/each}
	</div>
{/if}
