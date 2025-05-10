import { type Vector2 } from "@owlbear-rodeo/sdk";
import { lineIntersect, lineString } from "@turf/turf";
import { matrixMultiply } from "owlbear-utils";
import {
    type RaycastCover,
    isRaycastCircle,
    positionToVector2,
} from "../state/raycastCoverTypes";
import type { PlayerStorage } from "../state/usePlayerStorage";
import { vector2Equals } from '../utils';

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
            positionToVector2(pt.geometry.coordinates),
        );
    }
}

/**
 * @return Closest blocking point if the ray was blocked, or permissiveness if the ray
 *         was partially blocked. Permissiveness 1 means unblocked.
 */
export function raycastSingle(
    state: Readonly<Pick<PlayerStorage, "walls" | "partialCover">>,
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
): Vector2 | number {
    // Check for blocking cover
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
            if (x === undefined || y === undefined) {
                continue;
            }
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

    // Check for partial cover
    const blockingCover = state.partialCover.find((cover) => {
        // Skip cover corresponding to the origin or destination
        if (
            (originId && cover.properties.characterId === originId) ||
            (destinationId && cover.properties.characterId === destinationId)
        ) {
            return false;
        }
        const intersections = intersect(start, end, cover);
        // Filter out intersections that are exactly at the origin or end
        const filteredIntersections = intersections.filter(
            (intersection) =>
                !vector2Equals(intersection, start) &&
                !vector2Equals(intersection, end),
        );
        if (filteredIntersections.length === 0) {
            return false;
        }
        return true;
    });

    return blockingCover?.properties.permissiveness ?? 1;
}
