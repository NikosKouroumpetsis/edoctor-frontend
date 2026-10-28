<script lang="ts">
	import { SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem } from './index';

	let { value = $bindable() }: { value?: string } = $props();
</script>

<SelectRoot bind:value name="specialty">
	<SelectTrigger aria-label="Specialty">
		<SelectValue placeholder="Pick a specialty" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="cardio">Cardiology</SelectItem>
		<SelectItem value="derma">Dermatology</SelectItem>
		<SelectItem value="neuro">Neurology</SelectItem>
	</SelectContent>
</SelectRoot>
