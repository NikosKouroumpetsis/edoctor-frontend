<script lang="ts">
	import { Switch } from '$shared/ui/primitives/switch';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';
	import type { NotificationPreferenceChange } from '$modules/notifications/api/preferences';
	import type { NotificationSettingsRow } from '$modules/notifications/types';

	let {
		open = $bindable(false),
		row,
		closeLabel,
		onToggle
	}: {
		open?: boolean;
		/** The kind «Αλλαγή» was pressed on; `null` before the first. */
		row: NotificationSettingsRow | null;
		closeLabel: string;
		onToggle: (change: NotificationPreferenceChange) => void;
	} = $props();
</script>

<!-- 🔴 «Αλλαγή» opens a WINDOW at every width of the site (record §3, §5.5; Airbnb's `w31`): the shared `ActionDialog` — in
     the middle from 744, the sheet from below under it — with «×», the kind as its title, one line of what it is, and
     one row a channel (`60-notifications/not.css:16-20` `.n-ch`, 64 high, a line between): the account's switch, or
     «Πάντα» / «Ορίζει ο γιατρός» where it decides nothing; a partial switch says so under its name. 🔴 D-W45-24: every
     press is saved at once and the window stays open. Every word a text node. -->
<ActionDialog bind:open title={row?.title ?? ''} {closeLabel} testId="notification-dialog">
	{#if row}
		{#if row.line}
			<p data-slot="notification-dialog-line" class="text-body-sm text-muted-foreground">
				{row.line}
			</p>
		{/if}
		<ul class="mt-2" data-category={row.category}>
			{#each row.cells as cell (cell.channel)}
				<li
					data-testid={`notification-channel-${cell.channel}`}
					data-control={cell.control}
					class="flex min-h-control-xl flex-row items-center justify-between gap-4 border-t border-line first:border-t-0"
				>
					<span class="grid min-w-0 gap-0.5">
						<span class="text-body-lg text-foreground">{cell.label}</span>
						{#if cell.note}
							<span class="text-label-lg font-normal text-muted-foreground">{cell.note}</span>
						{/if}
					</span>
					{#if cell.control === 'switch'}
						<Switch
							checked={cell.on}
							onCheckedChange={(enabled) =>
								onToggle({ category: row.category, channel: cell.channel, enabled })}
							showCheck={false}
							hover={false}
							aria-label={cell.label}
							data-testid={`notification-switch-${cell.channel}`}
							class="shrink-0"
						/>
					{:else}
						<span class="shrink-0 text-body-sm whitespace-nowrap text-muted-foreground">
							{cell.fixed}
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</ActionDialog>
