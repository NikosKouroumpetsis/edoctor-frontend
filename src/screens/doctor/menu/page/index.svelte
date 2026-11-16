<script lang="ts">
	import DoctorMenu from '$modules/doctor-dashboard/ui/menu';
	import { NotificationBell } from '$modules/notifications/ui/inbox';
	import { useDoctorMenuScreen } from '../hooks';

	const screen = useDoctorMenuScreen();
</script>

<!-- Round 2 (U-81.2, `76-menu` m-51): the bell of the notifications module at the end of the title, below 744 only (from
     744 the ☰ has «Ειδοποιήσεις») — the «Προφίλ»'s own (screen 63, D-W45-59); since step 11 the doctor's list (screen 75,
     D-W51-89), its dot the doctor's side (the host reads the side of the page's mode). -->
{#snippet bell()}
	<NotificationBell locale={screen.locale} href={screen.notificationsHref} />
{/snippet}

<!-- Wave 5.1 · screen 76 as 5.1 ships it (D-W51-04): «Μενού» of the doctor, inside the doctor's frame. -->
<DoctorMenu locale={screen.locale} headerAction={bell} />
