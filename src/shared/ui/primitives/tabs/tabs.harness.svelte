<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from './index';

	let { value = $bindable('account') }: { value?: string } = $props();
</script>

<Tabs bind:value>
	<TabsList>
		<TabsTrigger value="account">Account</TabsTrigger>
		<TabsTrigger value="password">Password</TabsTrigger>
	</TabsList>
	<TabsContent value="account">Account panel</TabsContent>
	<TabsContent value="password">Password panel</TabsContent>
</Tabs>
