<script lang="ts" module>
	import type { AppointmentStatusTone } from '$modules/appointments/lib/status';

	// Record §6.1 (screen 31's `.b-state`, `appt.css:99-102`): waiting warm, kept green, every other state neutral.
	const toneClasses: Record<AppointmentStatusTone, string> = {
		warning: 'border-warning/40 bg-warning/10 text-foreground',
		success: 'border-success/40 bg-success/10 text-success-text',
		muted: 'border-line-2 bg-chip text-foreground'
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import type { StatusPillProps } from '../types';

	let { pill, class: className, testId }: StatusPillProps = $props();
</script>

<!-- The appointment's status pill, one look on every page that shows a visit (P-W4 Σ-27): 24 high, the 999 corner, 12/500,
     the tone's tint and line; never a hex (the prototype's warn / ok / chip are the theme's warning, success, chip). -->
<span
	data-slot="appointment-status"
	data-tone={pill.tone}
	data-testid={testId}
	class={cn(
		'inline-flex min-h-6 items-center self-start rounded-full border px-2.5 text-label-md font-medium whitespace-nowrap',
		toneClasses[pill.tone],
		className
	)}
>
	{pill.label}
</span>
