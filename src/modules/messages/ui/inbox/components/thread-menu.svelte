<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';

	let {
		open = $bindable(false),
		title,
		locale,
		archived,
		canReport,
		canBlock,
		onArchive,
		onCopy,
		onReport,
		onBlock
	}: {
		open?: boolean;
		/** The other person. */
		title: string;
		locale: SupportedLocale;
		archived: boolean;
		/** There is a message received to report. */
		canReport: boolean;
		/** Not blocked yet (lifting it is the field's own). */
		canBlock: boolean;
		onArchive: () => void;
		onCopy: () => void;
		onReport: () => void;
		onBlock: () => void;
	} = $props();

	const options = $derived({ locale });
	const press = (action: () => void) => () => {
		open = false;
		action();
	};
</script>

{#snippet row(
	icon: IoniconName,
	label: string,
	action: () => void,
	testId: string,
	danger: boolean = false
)}
	<button
		type="button"
		onclick={press(action)}
		data-testid={testId}
		class={cn(
			'group flex min-h-control-xl w-full flex-row items-center gap-4 py-2 text-left text-body-lg text-foreground outline-none not-first:border-t not-first:border-border/60 focus-visible:ring-3 focus-visible:ring-ring/50',
			danger && 'text-danger-text'
		)}
	>
		<Ionicon name={icon} class="icon-lg shrink-0" />
		<span class="can-hover:group-hover:underline">{label}</span>
	</button>
{/snippet}

<!-- U-84 Π2: ⋯ of a conversation: the archive, its copy, a report, a block. -->
<ActionDialog
	bind:open
	{title}
	closeLabel={m.messages_close({}, options)}
	testId="messages-menu-dialog"
>
	<div class="grid">
		{@render row(
			'archive-outline',
			archived ? m.messages_unarchive({}, options) : m.messages_archive({}, options),
			onArchive,
			'messages-menu-archive'
		)}
		{@render row('download-outline', m.messages_copy({}, options), onCopy, 'messages-menu-copy')}
		{#if canReport}
			{@render row(
				'flag-outline',
				m.messages_report({}, options),
				onReport,
				'messages-menu-report'
			)}
		{/if}
		{#if canBlock}
			{@render row(
				'ban-outline',
				m.messages_block({}, options),
				onBlock,
				'messages-menu-block',
				true
			)}
		{/if}
	</div>
</ActionDialog>
