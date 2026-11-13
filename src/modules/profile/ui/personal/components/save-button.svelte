<script lang="ts">
	import { Button } from '$shared/ui/primitives/button';

	let {
		label,
		loading = false,
		testId
	}: { label: string; loading?: boolean; testId: string } = $props();
</script>

<!-- A row's own button («Αποθήκευση», «Συνέχεια», «Επαλήθευση»; `58-personal/pers.css` `.f-acts .a-btn.dark`): the dark
     fill, its label 16 / 600, no colour under the pointer (U-100). While its request is out it takes no second press. -->
<Button
	type="submit"
	tone="contrast"
	hover={false}
	{label}
	{loading}
	textClass="text-body-lg"
	class="px-6"
	data-testid={testId}
/>
