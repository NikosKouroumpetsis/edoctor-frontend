<script lang="ts">
	import DevicesPart from '../components/devices-part.svelte';
	import PasswordPart from '../components/password-part.svelte';
	import ProvidersPart from '../components/providers-part.svelte';
	import { useSecurity } from '../hooks/use-security.svelte';
	import type { SecurityPageProps } from '../types';

	let props: SecurityPageProps = $props();

	const security = useSecurity(() => props);
</script>

<!-- Wave 4.5 · screen 59 «Σύνδεση και ασφάλεια» (record §5.4; the approved prototype `59-security/sec.js`), a section of
     the shell (its title and its «←» are the shell's). Three parts in the record's order: «Σύνδεση» — the password,
     changed or set IN its row at every width — «Σύνδεση με Google ή Apple» and «Συσκευές». Each part waits and fails
     on its own. 🔴 U-168: no password and no code reaches an address, a storage, a cache or a log; the sign-in address
     is printed exactly as the SERVER hides it. 🔴 Only `401 EC401` is a session that ended: a wrong password (`EC412`)
     or a wrong code (`EC011`) is said under its field. The page only composes. -->
<div data-testid="security-page">
	<PasswordPart locale={props.locale} {security} />
	<ProvidersPart locale={props.locale} {security} />
	<DevicesPart locale={props.locale} {security} />
</div>
