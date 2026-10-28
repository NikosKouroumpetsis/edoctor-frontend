<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** The underlined link under the list: its words and a press (the application's `onLink`) or a page. */
	type NumberedListLink =
		| { linkLabel: string; onLink: () => void; linkHref?: undefined }
		| { linkLabel: string; linkHref: string; onLink?: undefined }
		| { linkLabel?: undefined; onLink?: undefined; linkHref?: undefined };

	export type NumberedListProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
		NumberedListLink & {
			title: string;
			/** Written after the title («(3)»), formatted by the caller. */
			count?: string;
			items: readonly string[];
			testId?: string;
		};
</script>

<script lang="ts">
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		title,
		count,
		items,
		linkLabel,
		onLink,
		linkHref,
		testId,
		class: className,
		...restProps
	}: NumberedListProps = $props();

	const titleId = useId(undefined, 'numbered-list');
</script>

<!-- The application's list (M-29): «1.», «2.» … beside each item; on the web an ordered list the title names, its
     numbers drawn as the application's (the list says the position aloud). -->
<div
	data-slot="numbered-list"
	data-testid={testId}
	class={cn('flex flex-col gap-4', className)}
	{...restProps}
>
	<p id={titleId} class="text-title-sm font-semibold text-foreground">
		{title}{count === undefined ? '' : ` ${count}`}
	</p>
	<ol role="list" aria-labelledby={titleId} class="flex flex-col gap-4">
		{#each items as item, index (index)}
			<li class="flex flex-row items-start gap-3">
				<span aria-hidden="true" class="text-body-lg font-semibold text-foreground"
					>{index + 1}.</span
				>
				<span class="flex-1 text-body-sm text-foreground/88">{item}</span>
			</li>
		{/each}
	</ol>
	{#if linkLabel !== undefined}
		<TextButton label={linkLabel} underline href={linkHref} onclick={onLink} class="self-start" />
	{/if}
</div>
