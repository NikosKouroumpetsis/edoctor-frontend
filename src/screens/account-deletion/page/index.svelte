<script lang="ts">
	import AccountDeletion from '$modules/account/ui/deletion';
	import { useAccountDeletionScreen } from '../hooks';

	const screen = useAccountDeletionScreen();
</script>

<AccountDeletion
	homeHref={screen.homeHref}
	legalHref={screen.legalHref}
	otherRows={screen.otherRows}
	onAnchor={screen.onAnchor}
	canonicalUrl={screen.canonicalUrl}
	alternateUrls={screen.alternateUrls}
/>
