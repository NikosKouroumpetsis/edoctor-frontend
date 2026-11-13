<script lang="ts">
	import Code from '../components/code.svelte';
	import Review from '../components/review.svelte';
	import type { DeletionFlowProps } from '../types';

	let { locale, step, flow, policyHref }: DeletionFlowProps = $props();
</script>

<!-- 🔴 D-W45-30 (wave 4.5, screen 62; U-173 Ε1 Α): «Διαγραφή λογαριασμού» on the web, the application's two steps on
     the server's existing routes — what the deletion does (`review`), then the code that carries it out (`code`). The
     screen draws each at its own address inside «Απόρρητο», and the end (`DeletionDone`) in their place. The public
     page `/account-deletion` (`ui/deletion`) is another slice and does not change. -->
{#if step === 'code'}
	<Code {locale} {flow} />
{:else}
	<Review {locale} {flow} {policyHref} />
{/if}
