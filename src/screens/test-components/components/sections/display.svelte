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
		<Badge>Default</Badge>
		<Badge variant="secondary">Secondary</Badge>
		<Badge variant="success">Verified</Badge>
		<Badge variant="warning">Pending</Badge>
		<Badge variant="destructive">Error</Badge>
		<Badge variant="outline">Outline</Badge>
	</DemoRow>

	<DemoRow label="Avatar">
		<Avatar>
			<AvatarImage src="https://i.pravatar.cc/80?img=5" alt="Maria" />
			<AvatarFallback>MA</AvatarFallback>
		</Avatar>
		<Avatar>
			<AvatarImage src="" alt="broken" />
			<AvatarFallback>JD</AvatarFallback>
		</Avatar>
	</DemoRow>

	<DemoRow label="Progress ({progress}%)">
		<div class="w-64"><Progress value={progress} /></div>
		<Button size="sm" variant="outline" onclick={() => (progress = (progress + 10) % 110)}
			>+10</Button
		>
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
			<Skeleton class="size-10 rounded-full" />
			<div class="space-y-2">
				<Skeleton class="h-3 w-32" />
				<Skeleton class="h-3 w-24" />
			</div>
		</div>
	</DemoRow>

	<DemoRow label="Textarea">
		<div class="grid w-full max-w-sm gap-2">
			<Label for="bio">Bio</Label>
			<Textarea id="bio" bind:value={bio} placeholder="Tell us about yourself" />
		</div>
	</DemoRow>

	<DemoRow label="Card + AspectRatio">
		<Card class="w-72">
			<CardHeader>
				<CardTitle>Dr. Maria Alexiou</CardTitle>
				<CardDescription>Cardiologist · Athens</CardDescription>
			</CardHeader>
			<CardContent>
				<AspectRatio ratio={16 / 9} class="overflow-hidden rounded-media bg-muted">
					<img
						src="https://picsum.photos/seed/edoctor/320/180"
						alt="Office"
						class="size-full object-cover"
					/>
				</AspectRatio>
			</CardContent>
			<CardFooter>
				<Button class="w-full">Book appointment</Button>
			</CardFooter>
		</Card>
	</DemoRow>
</DemoSection>
