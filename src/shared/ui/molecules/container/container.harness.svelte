<script lang="ts">
	import { Container, type ContainerProps } from './index';

	let props: Omit<ContainerProps, 'children'> = $props();
</script>

<Container data-testid="column" {...props}>
	<p>Περιεχόμενο</p>
</Container>
