<script lang="ts">
	import ArticlesRow from '$modules/articles/ui/home-row';
	import DiscoveryHome from '$modules/search-doctors/ui/discovery-home';
	import type { HomeScreenProps } from '../types';

	let { data }: HomeScreenProps = $props();
</script>

<!-- The home (U-20): the search and the doctors' rows, then «Άρθρα & συμβουλές υγείας» last, on the white page —
     only once the rows show (never under their skeleton or error, the application's home and the prototype). -->
<main data-slot="home" class="bg-card">
	<DiscoveryHome {data}>
		{#snippet after()}
			<ArticlesRow articles={data.articles} />
		{/snippet}
	</DiscoveryHome>
</main>
