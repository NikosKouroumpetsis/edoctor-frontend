<script lang="ts">
	import { untrack } from 'svelte';
	import { setToasts, ToastState } from './toast-state.svelte';
	import Toaster from './toaster.svelte';

	let { toasts }: { toasts: ToastState } = $props();

	setToasts(untrack(() => toasts));
</script>

<Toaster />
