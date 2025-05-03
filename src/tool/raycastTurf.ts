import type { Vector2 } from "@owlbear-rodeo/sdk";
import {
    distance,
    featureCollection,
    lineIntersect,
    lineString,
    point,
    polygon,
} from "@turf/turf";
import { usePlayerStorage } from "../state/usePlayerStorage";

export function raycastTurf(
    origin: Readonly<Vector2>,
    ends: readonly Vector2[],
): Vector2[] {
    const walls = usePlayerStorage.getState().walls.geometry;

    return ends.map((end) => {
        const ray = lineString([
            [origin.x, origin.y],
            [end.x, end.y],
        ]);
        let closestPt: Vector2 | null = null;
        let minDist = Infinity;
        for (const wall of walls.features) {
            let intersections;
            if (wall.geometry.type === "Polygon") {
                // Intersect with each ring of the polygon
                for (const ring of wall.geometry.coordinates) {
                    const polyLine = lineString(ring);
                    intersections = lineIntersect(ray, polyLine);
                    for (const feat of intersections.features) {
                        const pt = feat.geometry.coordinates;
                        const d = distance(
                            point([origin.x, origin.y]),
                            point(pt),
                        );
                        if (d < minDist) {
                            minDist = d;
                            closestPt = { x: pt[0], y: pt[1] };
                        }
                    }
                }
            } else if (wall.geometry.type === "LineString") {
                intersections = lineIntersect(ray, wall.geometry);
                for (const feat of intersections.features) {
                    const pt = feat.geometry.coordinates;
                    const d = distance(point([origin.x, origin.y]), point(pt));
                    if (d < minDist) {
                        minDist = d;
                        closestPt = { x: pt[0], y: pt[1] };
                    }
                }
            }
        }
        return closestPt ?? end;
    });
}

if (import.meta.vitest) {
    const { describe, it, expect, vi } = import.meta.vitest;
    describe("raycastTurf", () => {
        it("Should return intersections", () => {
            const start = { x: -75, y: -225 };
            const ends = [
                { x: 150, y: -300 },
                { x: 300, y: -300 },
                { x: 300, y: -150 },
                { x: 150, y: -150 },
            ];

            // Mock usePlayerStorage.getState to return our test walls
            vi.mock("../state/usePlayerStorage", () => ({
                usePlayerStorage: {
                    getState: () => {
                        return {
                            walls: {
                                lastModified: 0,
                                lastIdSet: new Set<string>(),
                                geometry: featureCollection([
                                    polygon([
                                        [
                                            [0, 0],
                                            [0, -300],
                                            [300, -300],
                                            [300, 0],
                                            [0, 0],
                                        ],
                                    ]),
                                ]),
                            },
                        };
                    },
                },
            }));

            const results = raycastTurf(start, ends);

            results.forEach((result, i) => {
                expect(result).not.toEqual(ends[i]);
            });
        });
    });
}
