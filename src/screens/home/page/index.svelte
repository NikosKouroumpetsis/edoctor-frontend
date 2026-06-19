<script lang="ts">
	import DiscoveryHome from '$modules/search-doctors/ui/discovery-home';
	import type { HomeScreenProps } from '../types';

	let { data }: HomeScreenProps = $props();
</script>

<DiscoveryHome {data} />
