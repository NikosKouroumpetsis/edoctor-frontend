<script lang="ts">
	import Favorites from '$modules/search-doctors/ui/favorites';
	import { useFavoritesScreen } from '../hooks';

	const screen = useFavoritesScreen();
</script>

<!-- The saved doctors (wave 2, screen 20, U-83, U-85): the search module's page; the browser fills it in (U-80.1 Ε6). -->
<Favorites locale={screen.locale} profileHref={screen.profileHref} searchHref={screen.searchHref} />
