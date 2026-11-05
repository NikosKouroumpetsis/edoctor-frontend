<script lang="ts">
	import ProfileTab from '$modules/profile/ui/tab';
	import { useProfileScreen } from '../hooks';

	const screen = useProfileScreen();
</script>

<!-- The phone's «Προφίλ» (U-81.1): the application's tab, a page of the site. -->
<ProfileTab locale={screen.locale} hrefOf={screen.hrefOf} onRow={screen.onRow} />
