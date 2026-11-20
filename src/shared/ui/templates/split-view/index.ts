import FoldButton from './split-view-fold-button.svelte';
import Root, {
	type SplitViewFold,
	type SplitViewFrom,
	type SplitViewWidths
} from './split-view.svelte';

export {
	FoldButton,
	Root,
	//
	Root as SplitView,
	FoldButton as SplitViewFoldButton,
	type SplitViewFold,
	type SplitViewFrom,
	type SplitViewWidths
};
