import { Command, Math2, type Vector2 } from "@owlbear-rodeo/sdk";
import { multiLineString } from "@turf/helpers";
import { ORIGIN } from "owlbear-utils";
import { describe, expect, it } from "vitest";
import { METADATA_KEY_SOLIDITY, SOLIDITY_NO_COVER } from "../src/constants";
import type { Cover } from "../src/coverTypes";
import {
    getRaycastCover,
    vector2ToPosition,
} from "../src/state/raycastCoverTypes";
import type { RoomMetadata } from "../src/state/roomMetadata";
import type { PlayerStorage } from "../src/state/usePlayerStorage";
import { raycastSingle } from "../src/tool/raycastSingle";

describe("raycastSingle", () => {
    const MOCK_ID = "mock-id";
    const MOCK_CHARACTER_SOLIDITY = 0.12345;
    const EMPTY_MAP: Pick<
        PlayerStorage,
        "walls" | "partialCover" | "characterBoundingPolygons" | "roomMetadata"
    > = {
        walls: {
            lastModified: 0,
            lastWallCount: 0,
            geometry: multiLineString([]),
        },
        partialCover: new Map(),
        characterBoundingPolygons: [],
        roomMetadata: {
            characterSolidity: MOCK_CHARACTER_SOLIDITY,
        } as RoomMetadata,
    };
    function makeMockPartialCover(points: Vector2[], solidity = 0.5) {
        return [
            MOCK_ID,
            {
                lastModified: "",
                centroid: Math2.centroid(points),
                raycastCover: multiLineString([points.map(vector2ToPosition)], {
                    solidity,
                }),
            },
        ] as const;
    }

    const SQUARE_TOP_RIGHT_OF_ORIGIN_POINTS = [
        { x: 0, y: -150 },
        { x: 150, y: -150 },
        { x: 150, y: 0 },
        { x: 0, y: 0 },
        { x: 0, y: -150 },
    ];
    const STATE_SQUARE_TOP_RIGHT_OF_ORIGIN: Pick<
        PlayerStorage,
        "partialCover"
    > = {
        partialCover: new Map([
            makeMockPartialCover(SQUARE_TOP_RIGHT_OF_ORIGIN_POINTS),
        ]),
    };

    it("Shouldn't self-interfere", () => {
        const state: PlayerStorage = {
            ...EMPTY_MAP,
            ...STATE_SQUARE_TOP_RIGHT_OF_ORIGIN,
        } as PlayerStorage;

        // start in the center and go straight right, through the square
        const start = { x: 75, y: 75 };
        const end = { x: 200, y: 75 };

        const [, solidity] = raycastSingle(state, start, end, MOCK_ID);
        expect(solidity).toEqual(SOLIDITY_NO_COVER);
    });

    it("Shouldn't let the destination interfere", () => {
        const state: PlayerStorage = {
            ...EMPTY_MAP,
            ...STATE_SQUARE_TOP_RIGHT_OF_ORIGIN,
        } as PlayerStorage;

        // start from outside the square and go in
        const start = { x: -75, y: -75 };
        const end = { x: 75, y: 75 };

        const [, solidity] = raycastSingle(
            state,
            start,
            end,
            undefined,
            MOCK_ID,
        );
        expect(solidity).toEqual(SOLIDITY_NO_COVER);
    });

    it("Shouldn't return cover for start-adjacent objects", () => {
        const state = {
            ...EMPTY_MAP,
            ...STATE_SQUARE_TOP_RIGHT_OF_ORIGIN,
        };

        // Go from origin to the left
        const start = { x: 0, y: 0 };
        const end = { x: -10, y: 0 };

        const [, solidity] = raycastSingle(state, start, end);
        expect(solidity).toEqual(SOLIDITY_NO_COVER);
    });

    it("Shouldn't return cover for end-adjacent objects", () => {
        const state = {
            ...EMPTY_MAP,
            ...STATE_SQUARE_TOP_RIGHT_OF_ORIGIN,
        };

        // Come in from the top left of the origin - shouldn't hit anything
        const start = { x: -75, y: -75 };
        const end = { x: 0, y: 0 };

        const [point, solidity] = raycastSingle(state, start, end);
        expect(point).toEqual(end);
        expect(solidity).toEqual(SOLIDITY_NO_COVER);
    });

    it("Shouldn't return cover for both start and end-adjacent objects", () => {
        const state = {
            ...EMPTY_MAP,
            ...STATE_SQUARE_TOP_RIGHT_OF_ORIGIN,
        };

        // Cross the square
        const start = { x: 0, y: 0 };
        const end = { x: 150, y: -150 };

        const [point, solidity] = raycastSingle(state, start, end);
        expect(point).toEqual(end);
        expect(solidity).toEqual(SOLIDITY_NO_COVER);
    });

    it("Should return intersections", () => {
        const state = {
            ...EMPTY_MAP,
            walls: {
                lastModified: 0,
                lastWallCount: 0,
                geometry: multiLineString(
                    [
                        [
                            [0, 0],
                            [0, -300],
                            [300, -300],
                            [300, 0],
                            [0, 0],
                        ],
                    ],
                    { solidity: 1 },
                ),
            },
        };

        const start = { x: -75, y: -225 };
        const ends = [
            { x: 150, y: -300 },
            { x: 300, y: -300 },
            { x: 300, y: -150 },
            { x: 150, y: -150 },
        ];

        const results = ends.map((end) => raycastSingle(state, start, end));

        results.forEach(([point, solidity], i) => {
            expect(point).not.toEqual(ends[i]);
            expect(solidity).toEqual(1);
        });
    });

    it("Should intersect circles", () => {
        const state = {
            ...EMPTY_MAP,
            partialCover: new Map([
                [
                    MOCK_ID,
                    {
                        lastModified: "",
                        centroid: ORIGIN,
                        raycastCover: getRaycastCover({
                            type: "SHAPE",
                            shapeType: "CIRCLE",
                            position: ORIGIN,
                            rotation: 0,
                            scale: { x: 1, y: 1 },
                            width: 10,
                            height: 10,
                            metadata: {
                                [METADATA_KEY_SOLIDITY]: 0.5,
                            },
                        } as Cover)[0],
                    },
                ],
            ]),
        };

        const start = { x: -20, y: 0 };
        const end = { x: 0, y: 0 };
        const [, solidity] = raycastSingle(state, start, end);

        expect(solidity).toEqual(0.5);
    });

    it("Should pass over top of wide-scaled ovals", () => {
        const state = {
            ...EMPTY_MAP,
            partialCover: new Map([
                [
                    MOCK_ID,
                    {
                        lastModified: "",
                        centroid: ORIGIN,
                        raycastCover:
                            // oval that extends from -10 to 10 on the x axis
                            // but only -5 to 5 on the y axis
                            getRaycastCover({
                                type: "SHAPE",
                                shapeType: "CIRCLE",
                                position: ORIGIN,
                                rotation: 0,
                                scale: { x: 2, y: 1 },
                                width: 10,
                                height: 10,
                                metadata: {
                                    [METADATA_KEY_SOLIDITY]: 0.5,
                                },
                            } as Cover)[0],
                    },
                ],
            ]),
        };

        const start = { x: -20, y: -7 };
        const end = { x: 20, y: -7 };
        const [point, solidity] = raycastSingle(state, start, end);
        expect(point).toEqual(end);
        expect(solidity).toEqual(SOLIDITY_NO_COVER);
    });

    it("Should pass over top of wide ovals", () => {
        const state = {
            ...EMPTY_MAP,
            partialCover: new Map([
                [
                    MOCK_ID,
                    {
                        lastModified: "",
                        centroid: ORIGIN,
                        raycastCover:
                            // oval that extends from -10 to 10 on the x axis
                            // but only -5 to 5 on the y axis
                            getRaycastCover({
                                type: "SHAPE",
                                shapeType: "CIRCLE",
                                position: ORIGIN,
                                rotation: 0,
                                scale: { x: 1, y: 1 },
                                width: 20,
                                height: 10,
                                metadata: {
                                    [METADATA_KEY_SOLIDITY]: 0.5,
                                },
                            } as Cover)[0],
                    },
                ],
            ]),
        };

        const start = { x: -20, y: -7 };
        const end = { x: 20, y: -7 };
        const [point, solidity] = raycastSingle(state, start, end);
        expect(point).toEqual(end);
        expect(solidity).toEqual(SOLIDITY_NO_COVER);
    });

    it("Should only return the most solid when there are multiple partial covers", () => {
        const state = {
            ...EMPTY_MAP,
            partialCover: new Map([
                // first line to pass through - should be ignored since low solidity
                makeMockPartialCover(
                    [
                        { x: 5, y: -10 },
                        { x: 5, y: 10 },
                    ],
                    0.2,
                ),
                // second vertical line - should bind
                makeMockPartialCover(
                    [
                        { x: 10, y: -10 },
                        { x: 10, y: 10 },
                    ],
                    0.9,
                ),
            ]),
        };

        // start -> first vertical line -> second vertical line -> end
        const start = { x: 0, y: 0 };
        const end = { x: 20, y: 0 };
        const [point, solidity] = raycastSingle(state, start, end);
        expect(point).toEqual({ x: 10, y: 0 });
        expect(solidity).toEqual(0.9);
    });

    it("Should treat characters as partial cover", () => {
        const state = {
            ...EMPTY_MAP,
            characterBoundingPolygons: [
                {
                    id: MOCK_ID,
                    worldPoints: SQUARE_TOP_RIGHT_OF_ORIGIN_POINTS,
                },
            ],
        };

        const start = { x: -10, y: -10 };
        const end = { x: 10, y: -10 };
        const [, solidity] = raycastSingle(state, start, end);

        expect(solidity).toEqual(MOCK_CHARACTER_SOLIDITY);
    });

    it("Should intersect path quads", () => {
        const state = {
            ...EMPTY_MAP,
            partialCover: new Map([
                // Hump above a line from origin to x=10
                [
                    MOCK_ID,
                    {
                        lastModified: "",
                        centroid: ORIGIN, // wrong but it's not read by this test
                        raycastCover: getRaycastCover({
                            type: "PATH",
                            position: ORIGIN,
                            rotation: 0,
                            scale: { x: 1, y: 1 },
                            commands: [
                                [Command.MOVE, 0, 0],
                                [Command.QUAD, 5, -10, 10, 0],
                                [Command.CLOSE],
                            ],
                            metadata: {
                                [METADATA_KEY_SOLIDITY]: 0.5,
                            },
                        } as Cover)[0],
                    },
                ],
            ]),
        };

        const start = { x: 0, y: -1 };
        const end = { x: 10, y: -1 };
        const [, solidity] = raycastSingle(state, start, end);

        expect(solidity).toEqual(0.5);
    });
});
