/**
 * In-house headless primitives layer.
 *
 * These framework-level building blocks (context, ids, focus management,
 * dismissable layers, scroll lock, roving focus, typeahead, floating
 * positioning) replace the former `bits-ui` dependency. Styled shadcn-style
 * components in `$shared/ui/primitives` are built on top of them.
 */
export { createContext } from './context';
export { useId, __resetIdCounter } from './id';
export { focusTrap, getFocusableElements, type FocusTrapOptions } from './focus';
export { dismissable, type DismissableOptions } from './dismissable';
export { scrollLock, lockBodyScroll, __getLockCount } from './scroll-lock';
export {
	handleRovingKeydown,
	getRovingItems,
	type RovingOptions,
	type RovingOrientation,
	type RovingDirection
} from './roving-focus';
export { createTypeahead, getNextMatch, wrapArray, type Typeahead } from './typeahead';
export {
	floating,
	computePosition,
	type Placement,
	type Side,
	type Align,
	type Rect,
	type PositionResult,
	type ComputePositionOptions,
	type FloatingOptions
} from './floating';
export { portal } from './portal';
