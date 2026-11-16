<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { doctorDashboardPath } from '../lib/frame';
	import type { FrameMessageOptions, LocalizedHref } from '../types';

	let {
		href,
		messageOptions,
		onDoctorMode
	}: {
		href: LocalizedHref;
		messageOptions: FrameMessageOptions;
		/** The switch of mode (the transition, then the doctor's page); without it the link goes there plainly. */
		onDoctorMode?: () => void;
	} = $props();

	function doctorMode(event: MouseEvent) {
		if (!onDoctorMode) return;
		event.preventDefault();
		onDoctorMode();
	}
</script>

<!-- 🔴 Wave 5.1 · screen 64 (U-185.1, D-W51-19; `64-switch/sw.js:871`, `sw.css:6-14`, shot `w-user-1440`): «Λειτουργία
     γιατρού» beside the ☰ from 1128, ONE line at every width (14/600, 44 high, 14 a side) — only for a licence of the
     marketplace, as `<html data-doctor-mode>` says before the first paint (the wrapper is no box then, `contents`); for
     everyone else nothing at all. Below 1128 the ☰ has it. No colour under the pointer (U-100). -->
<span data-slot="doctor-mode-entry" class="hidden doctor-mode:contents">
	<a
		href={href(doctorDashboardPath)}
		onclick={doctorMode}
		data-testid="header-doctor-mode"
		class="hidden min-h-touch min-w-touch items-center rounded-full px-3.5 text-body-sm font-semibold whitespace-nowrap text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 laptop:inline-flex"
		>{m.doctor_mode_doctor({}, messageOptions)}</a
	>
</span>
