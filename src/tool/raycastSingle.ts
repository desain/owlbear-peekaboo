import { type Vector2 } from "@owlbear-rodeo/sdk";
import { lineString } from "@turf/helpers";
import { lineIntersect } from "@turf/line-intersect";
import {
    distanceSquared,
    matrixMultiply,
    toVector2Unchecked,
    vector2Equals,
} from "owlbear-utils";
import { SOLIDITY_NO_COVER } from "../constants";
import {
    type RaycastCover,
    characterBoundingPolygonToRaycastCover,
    isRaycastCircle,
} from "../state/raycastCoverTypes";
import type { PlayerStorage } from "../state/usePlayerStorage";

/**
 * Find intercepts with a unit circle centered on the origin.
 * Based on https://stackoverflow.com/questions/37224912/circle-line-segment-collision
 * @returns list of intercept points
 */
function interceptCircleLineSeg(p1: Vector2, p2: Vector2): Vector2[] {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p1.x, y: p1.y };
    const b = (v1.x * v2.x + v1.y * v2.y) * -2;
    const c = 2 * (v1.x * v1.x + v1.y * v1.y);
    const d = Math.sqrt(b * b - 2 * c * (v2.x * v2.x + v2.y * v2.y - 1));
    if (isNaN(d)) {
        // no intercept
        return [];
    }
    const u1 = (b - d) / c; // these represent the unit distance of point one and two on the line
    const u2 = (b + d) / c;
    const ret: Vector2[] = []; // return array
    if (u1 <= 1 && u1 >= 0) {
        // add point if on the line segment
        ret.push({ x: p1.x + v1.x * u1, y: p1.y + v1.y * u1 });
    }
    if (u2 <= 1 && u2 >= 0) {
        // second add point if on the line segment
        ret.push({ x: p1.x + v1.x * u2, y: p1.y + v1.y * u2 });
    }
    return ret;
}

/**
 * @returns All intersection points with cover.
 */
function intersect(
    start: Readonly<Vector2>,
    end: Readonly<Vector2>,
    cover: RaycastCover,
): Vector2[] {
    if (isRaycastCircle(cover)) {
        const circleSpaceStart = matrixMultiply(
            cover.inverseTransformCache,
            start,
        );
        const circleSpaceEnd = matrixMultiply(cover.inverseTransformCache, end);
        const circleSpaceIntersections = interceptCircleLineSeg(
            circleSpaceStart,
            circleSpaceEnd,
        );
        return circleSpaceIntersections.map((pt) =>
            matrixMultiply(cover.transform, pt),
        );
    } else {
        const ray = lineString([
            [start.x, start.y],
            [end.x, end.y],
        ]);
        return lineIntersect(ray, cover).features.map((pt) =>
            toVector2Unchecked(pt.geometry.coordinates),
        );
    }
}

/**
 * Get closest intersection, filtering out the start and end points.
 * @returns Closest intersection point, or null if there is no intersection,
 *          and square distance to it.
 */
function closestIntersection(
    start: Readonly<Vector2>,
    end: Readonly<Vector2>,
    cover: RaycastCover,
): [point: Vector2 | null, sqDist: number] {
    return (
        intersect(start, end, cover)
            // Filter out intersections that are exactly at the origin or end
            .filter(
                (intersection) =>
                    !vector2Equals(intersection, start) &&
                    !vector2Equals(intersection, end),
            )
            .reduce<[prevClosestPoint: Vector2 | null, prevMinSqDist: number]>(
                ([prevClosestPoint, prevMinSqDist], point) => {
                    const sqDist = distanceSquared(start, point);
                    if (sqDist < prevMinSqDist) {
                        return [point, sqDist];
                    }
                    return [prevClosestPoint, prevMinSqDist];
                },
                [null, Infinity],
            )
    );
}

function getCharactersRaycastCover(
    state: Pick<PlayerStorage, "characterBoundingPolygons" | "roomMetadata">,
) {
    if (state.roomMetadata.characterSolidity === 0) {
        return [];
    } else {
        const tokenCoverProperties = {
            solidity: state.roomMetadata.characterSolidity,
        };
        return state.characterBoundingPolygons.map(
            (poly) =>
                [
                    poly.id,
                    characterBoundingPolygonToRaycastCover(
                        poly,
                        tokenCoverProperties,
                    ),
                ] as const,
        );
    }
}

/**
 * @return Closest blocking point if the ray was blocked, or endpoint if ray was unobstructed;
 *         Solidity if the ray was partially blocked. Solidity 0 = unblocked, 1 = blocked.
 */
export function raycastSingle(
    state: Readonly<
        Pick<
            PlayerStorage,
            | "walls"
            | "partialCover"
            | "characterBoundingPolygons"
            | "roomMetadata"
        >
    >,
    start: Readonly<Vector2>,
    end: Readonly<Vector2>,
    /**
     * ID of origin cover item. Ignored because lines coming from origin won't be
     * blocked by origin.
     */
    originId?: string,
    /**
     * ID of destination cover item. Ignored because lines going to destination won't be
     * blocked by destination.
     */
    destinationId?: string,
): [intersectPoint: Vector2, solidity: number] {
    const raycastCoverItems = [
        ["walls", state.walls.geometry] as const,
        ...[...state.partialCover.entries()].map(
            ([id, { raycastCover }]) => [id, raycastCover] as const,
        ),
        ...getCharactersRaycastCover(state),
    ];

    const [point, , solidity] = raycastCoverItems.reduce<
        [pt: Vector2, dSq: number, s: number]
    >(
        ([prevPoint, prevMinSqDist, prevHighestSolidity], [id, cover]) => {
            if (
                // Skip cover that's less solid than our previous results
                prevHighestSolidity <= cover.properties.solidity &&
                // Skip cover corresponding to the origin or destination
                id !== originId &&
                id !== destinationId
            ) {
                const [intersection, sqDist] = closestIntersection(
                    start,
                    end,
                    cover,
                );
                if (
                    intersection &&
                    (prevHighestSolidity < cover.properties.solidity ||
                        sqDist < prevMinSqDist)
                ) {
                    // If we're more solid, or the same solidity but closer, use this point
                    return [intersection, sqDist, cover.properties.solidity];
                }
            }

            return [prevPoint, prevMinSqDist, prevHighestSolidity] as const;
        },
        [end, distanceSquared(start, end), SOLIDITY_NO_COVER] as const,
    );

    return [point, solidity];
}
