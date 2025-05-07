import { type Vector2 } from "@owlbear-rodeo/sdk";
import {
    featureCollection,
    lineIntersect,
    lineString,
    point,
} from "@turf/turf";
import type { FeatureCollection, Point } from "geojson";
import { matrixMultiply } from "owlbear-utils";
import {
    type RaycastObstruction,
    isRaycastCircle,
    vector2ToPosition,
} from "../state/raycastObstructions";
import type { PlayerStorage } from "../state/usePlayerStorage";

/**
 * Find intercepts with a circle centered on the origin.
 * https://stackoverflow.com/questions/37224912/circle-line-segment-collision
 */
function interceptCircleLineSeg(
    radius: number,
    p1: Vector2,
    p2: Vector2,
): Vector2[] {
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p1.x, y: p1.y };
    const b = (v1.x * v2.x + v1.y * v2.y) * -2;
    const c = 2 * (v1.x * v1.x + v1.y * v1.y);
    const d = Math.sqrt(
        b * b - 2 * c * (v2.x * v2.x + v2.y * v2.y - radius * radius),
    );
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

function intersect(
    start: Readonly<Vector2>,
    end: Readonly<Vector2>,
    obstruction: RaycastObstruction,
): FeatureCollection<Point> {
    if (isRaycastCircle(obstruction)) {
        const circleSpaceStart = matrixMultiply(
            obstruction.inverseTransformCache,
            start,
        );
        const circleSpaceEnd = matrixMultiply(
            obstruction.inverseTransformCache,
            end,
        );
        const circleSpaceIntersections = interceptCircleLineSeg(
            obstruction.radius,
            circleSpaceStart,
            circleSpaceEnd,
        );
        return featureCollection(
            circleSpaceIntersections.map((pt) =>
                point(
                    vector2ToPosition(
                        matrixMultiply(obstruction.transform, pt),
                    ),
                ),
            ),
        );
    } else {
        const ray = lineString([
            [start.x, start.y],
            [end.x, end.y],
        ]);
        return lineIntersect(ray, obstruction);
    }
}

/**
 * @return Closest blocking point if the ray was blocked, or permissiveness if the ray
 *         was partially blocked. Permissiveness 1 means unblocked.
 */
export function raycastSingle(
    state: PlayerStorage,
    start: Readonly<Vector2>,
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
): Vector2 | number {
    // Check for blocking obstructions
    let closestPt: Vector2 | null = null;
    let minDistSq = Infinity;
    for (const wall of state.walls.geometry.features) {
        // TODO use single intersect for both
        const ray = lineString([
            [start.x, start.y],
            [end.x, end.y],
        ]);
        const intersections = lineIntersect(ray, wall.geometry);
        for (const feat of intersections.features) {
            const [x, y] = feat.geometry.coordinates;
            const pt = { x, y };
            const dx = start.x - pt.x;
            const dy = start.y - pt.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDistSq) {
                minDistSq = dSq;
                closestPt = pt;
            }
        }
    }
    if (closestPt) {
        return closestPt;
    }

    // Check for partial obstructions
    const blockingObstruction = state.partialObstructions.find(
        (obstruction) => {
            // Skip obstructions corresponding to the origin or destination
            if (
                (originId && obstruction.properties.characterId === originId) ||
                (destinationId &&
                    obstruction.properties.characterId === destinationId)
            ) {
                return false;
            }
            const intersections = intersect(start, end, obstruction);
            // Filter out intersections that are exactly at the origin or end
            const filteredIntersections = intersections.features.filter(
                ({
                    geometry: {
                        coordinates: [x, y],
                    },
                }) =>
                    (x !== start.x || y !== start.y) &&
                    (x !== end.x || y !== end.y),
            );
            if (filteredIntersections.length === 0) {
                return false;
            }
            return true;
        },
    );

    return blockingObstruction?.properties.permissiveness ?? 1;
}
