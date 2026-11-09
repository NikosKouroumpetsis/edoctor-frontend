<script lang="ts">
	import { SiteErrorScreen } from '$screens/home';
</script>

<!-- Review w3-w2 R1 NIT-2: a booking step out of the closed list, or screen 31 naming no appointment, is the SITE's 404
     (the root's `+error`, its own words): the doctor exists, so never «Ο γιατρός δεν βρέθηκε». The layout's own errors
     (a profile nobody may see, a failed read) stay the profile's page, one level up. -->
<SiteErrorScreen />
