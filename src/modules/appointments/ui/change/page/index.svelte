<script lang="ts">
	import ForWhom from './for-whom.svelte';
	import Note from './note.svelte';
	import Relative from './relative.svelte';
	import Time from './time.svelte';
	import type { AppointmentChangeScreenProps } from '../types';

	let {
		step,
		picked,
		picker,
		onRepick,
		onGone,
		toMobilePhone,
		...props
	}: AppointmentChangeScreenProps = $props();
</script>

<!-- Screen 52 «Αλλαγή ραντεβού» (record §8, U-136; P-W4 §4.3): the slice's entry — the screen the address names (D-W4-20),
     each a screen of its own (U-102), never a window. -->
{#if step === 'time'}
	<Time {...props} {picked} {picker} {onRepick} {onGone} />
{:else if step === 'for-whom'}
	<ForWhom {...props} />
{:else if step === 'relative'}
	<Relative {...props} {toMobilePhone} />
{:else}
	<Note {...props} />
{/if}
