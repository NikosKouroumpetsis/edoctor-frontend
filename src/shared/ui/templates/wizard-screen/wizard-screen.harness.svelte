<script lang="ts">
	import { WizardScreen, type WizardScreenPill, type WizardScreenProgress } from './index';

	let {
		title = 'Τα στοιχεία σας',
		subtitle = 'Όπως αναγράφονται στην ταυτότητά σας.',
		progress = { steps: 3, currentStep: 0, fill: 0.5, label: 'Στάδιο 1 από 3' },
		withProgress = true,
		nextDisabled = false,
		nextLoading = false,
		withBrand = true,
		withActions = true,
		withFooter = false,
		centered,
		pills = [
			{
				key: 'help',
				label: 'Χρειάζεστε βοήθεια;',
				shortLabel: 'Βοήθεια',
				icon: 'help-circle-outline',
				href: '/help',
				testId: 'help'
			},
			{ key: 'exit', label: 'Αποθήκευση και έξοδος', testId: 'exit' }
		],
		onBack = () => {},
		onNext = () => {},
		onExit
	}: {
		title?: string;
		subtitle?: string;
		progress?: WizardScreenProgress;
		withProgress?: boolean;
		nextDisabled?: boolean;
		nextLoading?: boolean;
		withBrand?: boolean;
		withActions?: boolean;
		withFooter?: boolean;
		centered?: boolean;
		pills?: WizardScreenPill[];
		onBack?: () => void;
		onNext?: () => void;
		onExit?: () => void;
	} = $props();

	const shown = $derived(
		onExit
			? pills.map((pill) => (pill.key === 'exit' ? { ...pill, onClick: onExit } : pill))
			: pills
	);
</script>

{#snippet brand()}<a href="#home" class="min-h-touch min-w-touch">Σήμα</a>{/snippet}
{#snippet start()}<button type="button" class="min-h-touch w-full">Ξεκινήστε</button>{/snippet}

<WizardScreen
	{title}
	{subtitle}
	progress={withProgress ? progress : undefined}
	{centered}
	brand={withBrand ? brand : undefined}
	pills={shown}
	back={withActions ? { label: 'Πίσω', onClick: onBack, testId: 'back' } : undefined}
	next={withActions
		? {
				label: 'Επόμενο',
				onClick: onNext,
				disabled: nextDisabled,
				loading: nextLoading,
				testId: 'next'
			}
		: undefined}
	footer={withFooter ? start : undefined}
	testId="wizard"
>
	<p>Περιεχόμενο βήματος</p>
</WizardScreen>
