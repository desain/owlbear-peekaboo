import { featureCollection, lineString } from "@turf/turf";
import { describe, expect, it } from "vitest";
import type { PlayerStorage } from "../src/state/usePlayerStorage";
import { raycastSingle } from "../src/tool/raycastSingle";

describe("raycastSingle", () => {
    const MOCK_ID = "mock-id";

    const NO_WALLS: Partial<PlayerStorage> = {
        walls: {
            lastModified: 0,
            lastIdSetSize: 0,
            geometry: featureCollection([]),
        },
    };
    const SQUARE_TOP_RIGHT_OF_ORIGIN: Partial<PlayerStorage> = {
        partialObstructions: [
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

    it("Shouldn't return obstructions for start-adjacent objects", () => {
        const state: PlayerStorage = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        } as PlayerStorage;

        // Go from origin to the left
        const start = { x: 0, y: 0 };
        const end = { x: -10, y: 0 };

        const result = raycastSingle(state, start, end);
        expect(result).toEqual(1);
    });

    it("Shouldn't return obstructions for end-adjacent objects", () => {
        const state: PlayerStorage = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        } as PlayerStorage;

        // Come in from the top left of the origin - shouldn't hit anything
        const start = { x: -75, y: -75 };
        const end = { x: 0, y: 0 };

        const result = raycastSingle(state, start, end);
        expect(result).toEqual(1);
    });

    it("Shouldn't return obstructions for both start and end-adjacent objects", () => {
        const state: PlayerStorage = {
            ...NO_WALLS,
            ...SQUARE_TOP_RIGHT_OF_ORIGIN,
        } as PlayerStorage;

        // Cross the square
        const start = { x: 0, y: 0 };
        const end = { x: 150, y: -150 };

        const result = raycastSingle(state, start, end);
        expect(result).toEqual(1);
    });

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

        const results = ends.map((end) => raycastSingle(state, start, end));

        results.forEach((result, i) => {
            expect(result).not.toEqual(ends[i]);
        });
    });
});
