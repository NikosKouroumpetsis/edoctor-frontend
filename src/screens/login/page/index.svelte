<script lang="ts">
	import AuthLoginPage from '$modules/auth/ui/login-page';
	import type { LoginScreenProps } from '../types';

	let { data }: LoginScreenProps = $props();
</script>

<!-- Ε2 (U-80.1): the page of the sign-in, for a direct link, a refresh and a provider's return. -->
<AuthLoginPage params={data.params} />
