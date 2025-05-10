import { featureCollection, lineString } from "@turf/helpers";
import { describe, expect, it } from "vitest";
import { METADATA_KEY_PERMISSIVENESS } from "../src/constants";
import type { Cover } from "../src/coverTypes";
import { getRaycastCover } from "../src/state/raycastCoverTypes";
import type { PlayerStorage } from "../src/state/usePlayerStorage";
import { raycastSingle } from "../src/tool/raycastSingle";

describe("raycastSingle", () => {
    const MOCK_ID = "mock-id";

    const NO_WALLS: Pick<PlayerStorage, "walls"> = {
        walls: {
            lastModified: 0,
            lastIdSetSize: 0,
            geometry: featureCollection([]),
        },
    };
    const SQUARE_TOP_RIGHT_OF_ORIGIN: Pick<PlayerStorage, "partialCover"> = {
        partialCover: [
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
        ],
    };

    it("Shouldn't self-interfere", () => {
        const state: PlayerStorage = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        } as PlayerStorage;

        // start in the center and go straight right, through the square
        const start = { x: 75, y: 75 };
        const end = { x: 200, y: 75 };

        const result = raycastSingle(state, start, end, MOCK_ID);
        expect(result).toEqual(1);
    });

    it("Shouldn't let the destination interfere", () => {
        const state: PlayerStorage = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        } as PlayerStorage;

        // start from outside the square and go in
        const start = { x: -75, y: -75 };
        const end = { x: 75, y: 75 };

        const result = raycastSingle(state, start, end, undefined, MOCK_ID);
        expect(result).toEqual(1);
    });

    it("Shouldn't return cover for start-adjacent objects", () => {
        const state = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        };

        // Go from origin to the left
        const start = { x: 0, y: 0 };
        const end = { x: -10, y: 0 };

        const result = raycastSingle(state, start, end);
        expect(result).toEqual(1);
    });

    it("Shouldn't return cover for end-adjacent objects", () => {
        const state = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        };

        // Come in from the top left of the origin - shouldn't hit anything
        const start = { x: -75, y: -75 };
        const end = { x: 0, y: 0 };

        const result = raycastSingle(state, start, end);
        expect(result).toEqual(1);
    });

    it("Shouldn't return cover for both start and end-adjacent objects", () => {
        const state = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        };

        // Cross the square
        const start = { x: 0, y: 0 };
        const end = { x: 150, y: -150 };

        const result = raycastSingle(state, start, end);
        expect(result).toEqual(1);
    });

    it("Should return intersections", () => {
        const state = {
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
            partialCover: [],
        };

        const start = { x: -75, y: -225 };
        const ends = [
            { x: 150, y: -300 },
            { x: 300, y: -300 },
            { x: 300, y: -150 },
            { x: 150, y: -150 },
        ];

        const results = ends.map((end) => raycastSingle(state, start, end));

        results.forEach((result, i) => {
            expect(result).not.toEqual(ends[i]);
        });
    });

    it("Should intersect circles", () => {
        const state = {
            ...NO_WALLS,
            partialCover: [
                getRaycastCover({
                    type: "SHAPE",
                    shapeType: "CIRCLE",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    scale: { x: 1, y: 1 },
                    width: 10,
                    height: 10,
                    metadata: {
                        [METADATA_KEY_PERMISSIVENESS]: 0.5,
                    },
                } as Cover),
            ],
        };

        const start = { x: -20, y: 0 };
        const end = { x: 0, y: 0 };
        const result = raycastSingle(state, start, end);

        expect(result).toEqual(0.5);
    });

    it("Should pass over top of wide-scaled ovals", () => {
        const state = {
            ...NO_WALLS,
            partialCover: [
                // oval that extends from -10 to 10 on the x axis
                // but only -5 to 5 on the y axis
                getRaycastCover({
                    type: "SHAPE",
                    shapeType: "CIRCLE",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    scale: { x: 2, y: 1 },
                    width: 10,
                    height: 10,
                    metadata: {
                        [METADATA_KEY_PERMISSIVENESS]: 0.5,
                    },
                } as Cover),
            ],
        };

        const start = { x: -20, y: -7 };
        const end = { x: 20, y: -7 };
        const result = raycastSingle(state, start, end);

        expect(result).toEqual(1);
    });

    it("Should pass over top of wide ovals", () => {
        const state = {
            ...NO_WALLS,
            partialCover: [
                // oval that extends from -10 to 10 on the x axis
                // but only -5 to 5 on the y axis
                getRaycastCover({
                    type: "SHAPE",
                    shapeType: "CIRCLE",
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    scale: { x: 1, y: 1 },
                    width: 20,
                    height: 10,
                    metadata: {
                        [METADATA_KEY_PERMISSIVENESS]: 0.5,
                    },
                } as Cover),
            ],
        };

        const start = { x: -20, y: -7 };
        const end = { x: 20, y: -7 };
        const result = raycastSingle(state, start, end);

        expect(result).toEqual(1);
    });
});
