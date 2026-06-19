<script lang="ts">
	import { DateOfBirthField } from './index';

	let value = $state('');
</script>

<DateOfBirthField bind:value label="Date of birth" />
<p data-testid="dob-value">{value || 'empty'}</p>
