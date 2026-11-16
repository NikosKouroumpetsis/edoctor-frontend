<script lang="ts">
	import DoctorFrame from '$modules/doctor-dashboard/ui/frame';

	let { children } = $props();
</script>

<!-- 🔴 Wave 5.1 · screen 65 (D-W51-16): the doctor's dashboard is a group of routes with its own frame — the patient's
     frame stays as it is and draws none of its own here. -->
<DoctorFrame>
	{@render children()}
</DoctorFrame>
