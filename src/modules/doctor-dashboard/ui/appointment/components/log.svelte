<script lang="ts">
	import type { DoctorAppointmentLogLine } from '$modules/doctor-dashboard/lib/detail';

	let { title, lines }: { title: string; lines: DoctorAppointmentLogLine[] } = $props();
</script>

<!-- 🔴 D-W51-38 «Χρονολόγιο» (`sw.js:435`, `sw.css:184-188` `.ap-log`): the title as screen 50's over-title (13/600 muted),
     then each line on a thin line down the side, its ring of 10 — what happened (14/600) and «when · by whom» (13 muted).
     Every word a text node (U-65.6). -->
<section data-testid="doctor-appointment-log" aria-labelledby="doctor-appointment-log" class="mt-6">
	<h2 id="doctor-appointment-log" class="text-label-lg font-semibold text-muted-foreground">
		{title}
	</h2>
	<ol class="mt-3 ml-1.5 grid gap-3.5 border-l-2 border-line pl-4">
		{#each lines as line (line.id)}
			<li data-testid="doctor-appointment-log-line" class="relative grid gap-0.5 text-body-sm">
				<span
					aria-hidden="true"
					class="absolute top-1.5 -left-5.5 size-2.5 rounded-full border-2 border-muted-foreground bg-card"
				></span>
				<span class="font-semibold text-foreground">{line.title}</span>
				<span class="text-label-lg text-muted-foreground">{line.detail}</span>
			</li>
		{/each}
	</ol>
</section>
