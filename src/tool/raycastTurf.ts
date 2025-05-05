import { Math2, type Vector2 } from "@owlbear-rodeo/sdk";
import { featureCollection, lineIntersect, lineString } from "@turf/turf";
import type { PlayerStorage } from "../state/usePlayerStorage";

export function findBlockingPoint(
    state: PlayerStorage,
    origin: Readonly<Vector2>,
    end: Readonly<Vector2>,
): Vector2 {
    const ray = lineString([
        [origin.x, origin.y],
        [end.x, end.y],
    ]);
    let closestPt: Vector2 | null = null;
    let minDist = Infinity;
    for (const wall of state.walls.geometry.features) {
        const intersections = lineIntersect(ray, wall.geometry);
        for (const feat of intersections.features) {
            const [x, y] = feat.geometry.coordinates;
            const pt = { x, y };
            const d = Math2.distance(origin, pt);
            if (d < minDist) {
                minDist = d;
                closestPt = pt;
            }
        }
    }
    return closestPt ?? end;
}

/**
 * @returns Permissiveness of line given partial obstructions. 1 for no obstruction, less for partial obstruction.
 */
export function partialObstructionPermissiveness(
    state: PlayerStorage,
    origin: Readonly<Vector2>,
    end: Readonly<Vector2>,
    /**
     * ID of origin obstruction. Ignored because lines coming from origin won't be
     * blocked by origin.
     */
    originId?: string,
    /**
     * ID of destination obstruction. Ignored because lines going to destination won't be
     * blocked by destination.
     */
    destinationId?: string,
): number {
    const ray = lineString([
        [origin.x, origin.y],
        [end.x, end.y],
    ]);
    const blockingObstruction = state.partialObstructions.features.find(
        (obstruction) => {
            // Skip obstructions corresponding to the origin or destination
            if (
                (originId && obstruction.properties.characterId === originId) ||
                (destinationId &&
                    obstruction.properties.characterId === destinationId)
            ) {
                return false;
            }
            const intersections = lineIntersect(ray, obstruction.geometry);
            // Filter out intersections that are exactly at the origin or end
            const filteredIntersections = intersections.features.filter(
                ({
                    geometry: {
                        coordinates: [x, y],
                    },
                }) =>
                    (x !== origin.x || y !== origin.y) &&
                    (x !== end.x || y !== end.y),
            );
            if (filteredIntersections.length === 0) {
                return false;
            }
            // console.log(origin, end, obstruction.geometry);
            return true;
        },
    );
    return blockingObstruction?.properties.permissiveness ?? 1;
}

if (import.meta.vitest) {
    const { describe, it, expect } = import.meta.vitest;

    describe("partialObstructionPermissiveness", () => {
        it("Shouldn't self-interfere", () => {
            const MOCK_ID = "mock-id";
            const state: PlayerStorage = {
                partialObstructions: featureCollection([
                    // Square to the top right of the origin
                    lineString(
                        [
                            [0, -150],
                            [150, -150],
                            [150, 0],
                            [0, 0],
                            [0, -150],
                        ],
                        {
                            characterId: MOCK_ID,
                            permissiveness: 0.5,
                        },
                    ),
                ]),
            } as PlayerStorage;

            // start in the center and go straight right, through the square
            const start = { x: 75, y: 75 };
            const end = { x: 200, y: 75 };

            const result = partialObstructionPermissiveness(
                state,
                start,
                end,
                MOCK_ID,
            );
            expect(result).toEqual(1);
        });

        it("Shouldn't let the destination interfere", () => {
            const MOCK_ID = "mock-id";
            const state: PlayerStorage = {
                partialObstructions: featureCollection([
                    // Square to the top right of the origin
                    lineString(
                        [
                            [0, -150],
                            [150, -150],
                            [150, 0],
                            [0, 0],
                            [0, -150],
                        ],
                        {
                            characterId: MOCK_ID,
                            permissiveness: 0.5,
                        },
                    ),
                ]),
            } as PlayerStorage;

            // start from outside the square and go in
            const start = { x: -75, y: -75 };
            const end = { x: 75, y: 75 };

            const result = partialObstructionPermissiveness(
                state,
                start,
                end,
                undefined,
                MOCK_ID,
            );
            expect(result).toEqual(1);
        });

        it("Shouldn't return obstructions for start-adjacent objects", () => {
            const state: PlayerStorage = {
                partialObstructions: featureCollection([
                    // Square to the top right of the origin
                    lineString(
                        [
                            [0, -150],
                            [150, -150],
                            [150, 0],
                            [0, 0],
                            [0, -150],
                        ],
                        {
                            characterId: "interference",
                            permissiveness: 0.5,
                        },
                    ),
                ]),
            } as PlayerStorage;

            // Go from origin to the left
            const start = { x: 0, y: 0 };
            const end = { x: -10, y: 0 };

            const result = partialObstructionPermissiveness(state, start, end);
            expect(result).toEqual(1);
        });

        it("Shouldn't return obstructions for end-adjacent objects", () => {
            const state: PlayerStorage = {
                partialObstructions: featureCollection([
                    // Square to the top right of the origin
                    lineString(
                        [
                            [0, -150],
                            [150, -150],
                            [150, 0],
                            [0, 0],
                            [0, -150],
                        ],
                        {
                            characterId: "interference",
                            permissiveness: 0.5,
                        },
                    ),
                ]),
            } as PlayerStorage;

            // Come in from the top left of the origin - shouldn't hit anything
            const start = { x: -75, y: -75 };
            const end = { x: 0, y: 0 };

            const result = partialObstructionPermissiveness(state, start, end);
            expect(result).toEqual(1);
        });

        it("Shouldn't return obstructions for both start and end-adjacent objects", () => {
            const state: PlayerStorage = {
                partialObstructions: featureCollection([
                    // Square to the top right of the origin
                    lineString(
                        [
                            [0, -150],
                            [150, -150],
                            [150, 0],
                            [0, 0],
                            [0, -150],
                        ],
                        {
                            characterId: "interference",
                            permissiveness: 0.5,
                        },
                    ),
                ]),
            } as PlayerStorage;

            // Cross the square
            const start = { x: 0, y: 0 };
            const end = { x: 150, y: -150 };

            const result = partialObstructionPermissiveness(state, start, end);
            expect(result).toEqual(1);
        });
    });

    describe("findBlockingPoint", () => {
        it("Should return intersections", () => {
            const state: PlayerStorage = {
                walls: {
                    lastModified: 0,
                    lastIdSetSize: 0,
                    geometry: featureCollection([
                        lineString([
                            [0, 0],
                            [0, -300],
                            [300, -300],
                            [300, 0],
                            [0, 0],
                        ]),
                    ]),
                },
            } as PlayerStorage;

            const start = { x: -75, y: -225 };
            const ends = [
                { x: 150, y: -300 },
                { x: 300, y: -300 },
                { x: 300, y: -150 },
                { x: 150, y: -150 },
            ];

            const results = ends.map((end) =>
                findBlockingPoint(state, start, end),
            );

            results.forEach((result, i) => {
                expect(result).not.toEqual(ends[i]);
            });
        });
    });
}
