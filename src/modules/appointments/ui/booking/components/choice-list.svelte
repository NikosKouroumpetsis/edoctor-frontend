<script lang="ts">
	import { handleRovingKeydown } from '$shared/lib/headless';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { SelectableCard } from '$shared/ui/molecules/selectable-cards';

	type Choice = {
		id: string;
		title: string;
		/** The muted line under the title (a service's length). */
		description?: string | null;
		/** The words on the right (a service's fee); `locked` draws the guest's lock instead (U-34.4). */
		trailing?: string | null;
		locked?: boolean;
	};

	let {
		label,
		choices,
		value,
		onChange,
		lockedLabel,
		testId
	}: {
		/** The question the cards answer (the screen's title): the group's name. */
		label: string;
		choices: Choice[];
		value: string | null;
		onChange: (id: string) => void;
		/** What the lock means to a screen reader («Συνδεθείτε για κόστος»). */
		lockedLabel?: string;
		testId: string;
	} = $props();

	let group = $state<HTMLDivElement | null>(null);
	// One Tab stop: the chosen card, else the first one.
	const tabStop = $derived(choices.some((choice) => choice.id === value) ? value : choices[0]?.id);

	function onkeydown(event: KeyboardEvent) {
		if (!group) return;
		const moved = handleRovingKeydown(event, group, { orientation: 'vertical' });
		if (moved?.dataset.value) onChange(moved.dataset.value);
	}
</script>

{#snippet aside(choice: Choice)}
	{#if choice.locked}
		<span class="flex flex-row items-center text-muted-foreground">
			<Ionicon name="lock-closed-outline" class="icon-sm" />
			{#if lockedLabel}<span class="sr-only">{lockedLabel}</span>{/if}
		</span>
	{:else if choice.trailing}
		<span class="text-body-sm font-semibold whitespace-nowrap text-foreground"
			>{choice.trailing}</span
		>
	{/if}
{/snippet}

<!-- Record §3.3 (U-103.2, U-110.2 / U-112.1): ONE choice, a card each, one under the other the whole width — the name
     17/600, the muted line under it, the fee on the right (a guest: the lock). The shared card (the application's
     `BookingChoice`): the chosen one dark-bordered on muted; no colour under the pointer (U-100, D-W3-27). Every word
     the server or a person wrote is a text node (U-65.6). The arrows move the choice, as a radio group's do. -->
<div
	bind:this={group}
	role="radiogroup"
	aria-label={label}
	tabindex={-1}
	data-testid={testId}
	class="flex w-full flex-col gap-3"
	{onkeydown}
>
	{#each choices as choice (choice.id)}
		{#snippet trailing()}
			{@render aside(choice)}
		{/snippet}
		<SelectableCard
			title={choice.title}
			description={choice.description ?? undefined}
			icon={choice.locked || choice.trailing ? trailing : undefined}
			hover={false}
			selected={choice.id === value}
			data-roving-item
			data-value={choice.id}
			tabindex={tabStop === choice.id ? 0 : -1}
			testId={`${testId}-${choice.id}`}
			onclick={() => onChange(choice.id)}
		/>
	{/each}
</div>
