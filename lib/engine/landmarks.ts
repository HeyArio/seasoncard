// MediaPipe Face Mesh landmark indices (478-point topology with iris refinement, as
// output by @mediapipe/tasks-vision FaceLandmarker). "Right"/"left" are the SUBJECT's
// sides, which appear on the image left/right respectively in a non-mirrored photo.
// Rings are ordered so they can be used directly as polygons.

export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

/** Upper part of the face oval (temple to temple over the forehead) — base of the hair band. */
export const UPPER_OVAL = [21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251] as const;

export const RIGHT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246] as const;
export const LEFT_EYE = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466] as const;

export const RIGHT_BROW = [46, 53, 52, 65, 55, 107, 66, 105, 63, 70] as const;
export const LEFT_BROW = [276, 283, 282, 295, 285, 336, 296, 334, 293, 300] as const;

export const LIPS_OUTER = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
] as const;

export const RIGHT_IRIS_CENTER = 468;
export const RIGHT_IRIS_RING = [469, 470, 471, 472] as const;
export const LEFT_IRIS_CENTER = 473;
export const LEFT_IRIS_RING = [474, 475, 476, 477] as const;

/** Cheek anchors: 50/280 sit on the cheekbone below the eye, 205/425 on the mid cheek. */
export const RIGHT_CHEEK = [50, 205] as const;
export const LEFT_CHEEK = [280, 425] as const;

export const FOREHEAD_TOP = 10;
export const FOREHEAD_CENTER = 151;
export const GLABELLA = 9;
export const CHIN = 152;

/** Right/left outer eye corners (fallback for inter-ocular distance without iris points). */
export const RIGHT_EYE_OUTER = 33;
export const LEFT_EYE_OUTER = 263;

export const MIN_LANDMARKS = 468;
export const IRIS_LANDMARKS = 478;

/** Every index the engine reads (used by tests to build synthetic faces). */
export const USED_INDICES: readonly number[] = Array.from(new Set<number>([
  ...FACE_OVAL, ...RIGHT_EYE, ...LEFT_EYE, ...RIGHT_BROW, ...LEFT_BROW, ...LIPS_OUTER,
  RIGHT_IRIS_CENTER, ...RIGHT_IRIS_RING, LEFT_IRIS_CENTER, ...LEFT_IRIS_RING,
  ...RIGHT_CHEEK, ...LEFT_CHEEK, FOREHEAD_TOP, FOREHEAD_CENTER, GLABELLA, CHIN,
])).sort((a, b) => a - b);
