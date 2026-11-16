<script lang="ts">
	import DoctorToday from '$modules/doctor-dashboard/ui/today';
	import { useDoctorTodayScreen } from '../hooks';

	const screen = useDoctorTodayScreen();
</script>

<!-- Wave 5.1 · screen 66 (step 2, D-W51-21 … 27): «Σήμερα» of the doctor, inside the doctor's frame (the group's layout);
     the module's slice owns its reads, clocks and answers, the toast is the site frame's (`ToastState`). -->
<DoctorToday
	locale={screen.locale}
	appointmentsHref={screen.appointmentsHref}
	newAppointmentHref={screen.newAppointmentHref}
	appointmentHref={screen.appointmentHref}
	appointmentStepHref={screen.appointmentStepHref}
/>
