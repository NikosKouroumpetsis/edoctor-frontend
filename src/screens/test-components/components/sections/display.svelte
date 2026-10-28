<script lang="ts">
	import { Badge } from '$shared/ui/primitives/badge';
	import { Avatar, AvatarImage, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Progress } from '$shared/ui/primitives/progress';
	import { Separator } from '$shared/ui/primitives/separator';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
	import { Textarea } from '$shared/ui/primitives/textarea';
	import { Label } from '$shared/ui/primitives/label';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$shared/ui/primitives/card';
	import { Button } from '$shared/ui/primitives/button';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	let progress = $state(60);
	let bio = $state('');
</script>

<DemoSection
	id="display"
	title="Display & content"
	description="Badges, avatars, progress, card, textarea, separators."
>
	<DemoRow label="Badge">
		<Badge label="Primary" />
		<Badge tone="secondary" label="Secondary" />
		<Badge tone="success" label="Verified" />
		<Badge tone="warning" label="Pending" />
		<Badge tone="danger" label="Error" />
		<Badge tone="danger" solid label="Cancelled" />
		<Badge tone="outline" label="Outline" />
	</DemoRow>

	<DemoRow label="Avatar">
		<Avatar size="md">
			<AvatarImage src="https://i.pravatar.cc/80?img=5" alt="Maria" />
			<AvatarFallback class="text-body-sm font-normal">MA</AvatarFallback>
		</Avatar>
		<Avatar size="md">
			<AvatarImage src="" alt="broken" />
			<AvatarFallback class="text-body-sm font-normal">JD</AvatarFallback>
		</Avatar>
	</DemoRow>

	<DemoRow label="Progress ({progress}%)">
		<div class="w-full max-w-narrow"><Progress value={progress} class="h-2" /></div>
		<Button tone="outline" label="+10" onclick={() => (progress = (progress + 10) % 110)} />
	</DemoRow>

	<DemoRow label="Separator">
		<div class="flex h-5 items-center gap-3 text-body-sm">
			<span>Docs</span>
			<Separator orientation="vertical" />
			<span>Blog</span>
			<Separator orientation="vertical" />
			<span>About</span>
		</div>
	</DemoRow>

	<DemoRow label="Skeleton">
		<div class="flex items-center gap-3">
			<Skeleton class="size-avatar-md rounded-full" />
			<div class="w-narrow max-w-full space-y-2">
				<Skeleton class="h-3 w-full" />
				<Skeleton class="h-3 w-3/4" />
			</div>
		</div>
	</DemoRow>

	<DemoRow label="Textarea">
		<div class="grid w-full max-w-narrow gap-2">
			<Label for="bio">Bio</Label>
			<Textarea id="bio" size="sm" bind:value={bio} placeholder="Tell us about yourself" />
		</div>
	</DemoRow>

	<DemoRow label="Card + AspectRatio">
		<Card class="w-narrow">
			<CardHeader>
				<CardTitle>Dr. Maria Alexiou</CardTitle>
				<CardDescription>Cardiologist · Athens</CardDescription>
			</CardHeader>
			<CardContent>
				<AspectRatio ratio={16 / 9} class="overflow-hidden rounded-xl bg-muted">
					<img
						src="https://picsum.photos/seed/edoctor/320/180"
						alt="Office"
						class="size-full object-cover"
					/>
				</AspectRatio>
			</CardContent>
			<CardFooter>
				<Button class="w-full" label="Book appointment" />
			</CardFooter>
		</Card>
	</DemoRow>
</DemoSection>
