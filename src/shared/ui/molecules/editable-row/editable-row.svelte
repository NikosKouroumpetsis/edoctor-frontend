<script lang="ts" module>
	/** The title's element: a heading of the page it stands in, or plain words. */
	export type EditableRowTitleAs = 'h2' | 'h3' | 'h4' | 'p';

	// The link of the row (the action, the closing): its words 14 / 600 underlined, in the 48 box that the row's own
	// line does not grow for (14 back over and under).
	const linkClass = '-my-3.5 shrink-0';
	const linkTextClass = 'text-body-sm underline-offset-3';
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { getFocusableElements, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		title,
		value,
		actionLabel,
		closeLabel,
		help,
		open = $bindable(false),
		dimmed = false,
		titleAs = 'h2',
		onOpenChange,
		testId,
		class: className,
		children
	}: {
		/** What the row is about, already localized. */
		title: string;
		/** What it holds now, under the title while closed; without one the title stands alone. */
		value?: string;
		/** The link that opens it, in the caller's words. */
		actionLabel: string;
		/** The link that closes it without a change, in the caller's words. */
		closeLabel: string;
		/** A line under the title while open. */
		help?: string;
		open?: boolean;
		/** Another row is open: this one fades and takes no press. */
		dimmed?: boolean;
		titleAs?: EditableRowTitleAs;
		onOpenChange?: (open: boolean) => void;
		testId?: string;
		class?: string;
		/** What it opens: the caller's fields, choices and buttons. */
		children: Snippet;
	} = $props();

	const uid = useId(undefined, 'editable-row');
	const titleId = `${uid}-title`;
	const helpId = `${uid}-help`;
	const bodyId = `${uid}-body`;
	let action = $state<HTMLElement | null>(null);
	let body = $state<HTMLDivElement | null>(null);

	function set(next: boolean) {
		if (next === open || (next && dimmed)) return;
		open = next;
		onOpenChange?.(next);
	}

	// The focus follows the row: into the first thing it opened, and back onto its link once it closes — however it
	// closed (its own link, Escape, or the caller after a choice). Never at the first paint.
	let wasOpen = untrack(() => open);
	$effect(() => {
		const now = open;
		if (now === wasOpen) return;
		wasOpen = now;
		if (now) (body ? getFocusableElements(body)[0] : null)?.focus();
		else action?.focus();
	});

	function onkeydown(event: KeyboardEvent) {
		if (!open || event.key !== 'Escape' || event.defaultPrevented) return;
		event.preventDefault();
		event.stopPropagation();
		set(false);
	}
</script>

{#snippet heading()}
	<svelte:element this={titleAs} id={titleId} class="text-body-md font-semibold text-foreground">
		{title}
	</svelte:element>
{/snippet}

<!-- A row that is edited in its place: closed, the title over what it holds now and the link that opens it; open, the
     title, the link that closes it, a line of help and the caller's own content, which comes in with a short move
     (always, in CSS). The other rows of its list fade meanwhile (`dimmed`). Escape closes; no colour under the pointer.
     Every word is the caller's and a text node. -->
<!-- The group only hears Escape from what it holds (its link, the caller's fields): it is no target of its own. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role="group"
	aria-labelledby={titleId}
	aria-describedby={open && help ? helpId : undefined}
	data-slot="editable-row"
	data-state={open ? 'open' : 'closed'}
	data-dimmed={dimmed || undefined}
	data-testid={testId}
	class={cn(
		'border-b border-line pt-5 transition-opacity duration-standard ease-standard',
		open ? 'pb-6' : 'pb-5',
		dimmed && 'pointer-events-none opacity-35',
		className
	)}
	{onkeydown}
>
	<div class="flex flex-row items-start justify-between gap-4">
		{#if open}
			{@render heading()}
			<TextButton
				label={closeLabel}
				underline
				tone="foreground"
				textClass={linkTextClass}
				aria-expanded="true"
				aria-controls={bodyId}
				data-slot="editable-row-close"
				data-testid={testId ? `${testId}-close` : undefined}
				class={linkClass}
				onclick={() => set(false)}
			/>
		{:else}
			<div class="min-w-0">
				{@render heading()}
				{#if value}
					<p
						data-slot="editable-row-value"
						class="mt-0.5 text-body-sm wrap-anywhere text-muted-foreground"
					>
						{value}
					</p>
				{/if}
			</div>
			<TextButton
				bind:ref={action}
				label={actionLabel}
				underline
				tone="foreground"
				textClass={linkTextClass}
				aria-describedby={titleId}
				aria-expanded="false"
				aria-disabled={dimmed || undefined}
				tabindex={dimmed ? -1 : undefined}
				data-slot="editable-row-action"
				data-testid={testId ? `${testId}-action` : undefined}
				class={linkClass}
				onclick={() => set(true)}
			/>
		{/if}
	</div>
	{#if open}
		{#if help}
			<p
				id={helpId}
				data-slot="editable-row-help"
				class="mt-0.5 max-w-text text-body-sm text-muted-foreground"
			>
				{help}
			</p>
		{/if}
		<div
			bind:this={body}
			id={bodyId}
			data-slot="editable-row-body"
			class="mt-3 transition-[opacity,translate] duration-standard ease-standard starting:-translate-y-1 starting:opacity-0"
		>
			{@render children()}
		</div>
	{/if}
</div>
