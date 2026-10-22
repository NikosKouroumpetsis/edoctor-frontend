<!--
  Per-photo overflow menu (shot7/shot8).

  The circular "…" trigger opens a dropdown with Edit / Move forward / Delete.
  Edit delegates to the parent `onEdit` callback (A7), Move forward promotes the
  item to the cover slot, Delete removes it (destructive styling).
-->
<script lang="ts">
	import EllipsisIcon from '~icons/lucide/ellipsis';
	import PencilIcon from '~icons/lucide/pencil';
	import ArrowUpToLineIcon from '~icons/lucide/arrow-up-to-line';
	import Trash2Icon from '~icons/lucide/trash-2';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem
	} from '$shared/ui/primitives/dropdown-menu';
	import { getImageUploaderContext } from '../lib/context';

	let { id, class: className }: { id: string; class?: string } = $props();

	const ctx = getImageUploaderContext();
</script>

<DropdownMenu
	open={ctx.menuOpenFor === id}
	onOpenChange={(open) => ctx.setMenuOpen(open ? id : null)}
>
	<DropdownMenuTrigger
		aria-label={m.image_uploader_options()}
		class={cn('group grid size-touch place-items-center rounded-full outline-none', className)}
	>
		<span
			class="grid size-control-xs place-items-center rounded-full bg-card text-foreground shadow-raised transition-colors group-hover:bg-muted group-focus-visible:ring-2 group-focus-visible:ring-ring"
		>
			<EllipsisIcon class="icon-sm" />
		</span>
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end">
		<DropdownMenuItem onclick={() => ctx.edit(id)}>
			<PencilIcon class="icon-sm" />
			{m.image_uploader_menu_edit()}
		</DropdownMenuItem>
		<DropdownMenuItem onclick={() => ctx.moveToFront(id)}>
			<ArrowUpToLineIcon class="icon-sm" />
			{m.image_uploader_menu_move_front()}
		</DropdownMenuItem>
		<DropdownMenuItem variant="destructive" onclick={() => ctx.remove(id)}>
			<Trash2Icon class="icon-sm" />
			{m.image_uploader_menu_delete()}
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
