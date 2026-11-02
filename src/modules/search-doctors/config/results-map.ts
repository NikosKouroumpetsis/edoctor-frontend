import type { MapViewCamera } from '$shared/ui/organisms/map-view';

/**
 * Where the results map opens before its pins are fitted (the prototype's camera, `results.js`): Athens, the whole
 * basin in view. The pins of the page then set the camera (`fitBounds`).
 */
export const RESULTS_MAP_CAMERA: MapViewCamera = { center: [23.735, 37.975], zoom: 10.6 };
