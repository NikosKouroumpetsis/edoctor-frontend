<script lang="ts">
	import { QueryProvider } from '$shared/providers';
	import BookingDraftHost from '$modules/appointments/ui/booking-draft';
	import AuthHost from '$modules/auth/ui/host';
	import OnboardingDraftHost from '$modules/doctor-onboarding/ui/draft-host';
	import MessagesUnreadHost from '$modules/messages/ui/unread-host';
	import { forgetPendingFavorite } from '$modules/search-doctors/lib/favorites';
	import PopularSearches from '$modules/search-doctors/ui/popular-searches';
	import SiteFrame from '$modules/shell/ui/site-frame';
	import './layout.css';
	import favicon from '$shared/design/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<QueryProvider>
	<AuthHost onSignInAbandoned={forgetPendingFavorite}>
		<MessagesUnreadHost>
			<!-- 🔴 U-112.2: the booking's and the sign-up's drafts above every page, inside the session (a sign-out
			     empties them). -->
			<BookingDraftHost>
				<OnboardingDraftHost>
					<SiteFrame>
						{#snippet popularSearches()}
							<PopularSearches />
						{/snippet}
						{@render children()}
					</SiteFrame>
				</OnboardingDraftHost>
			</BookingDraftHost>
		</MessagesUnreadHost>
	</AuthHost>
</QueryProvider>
