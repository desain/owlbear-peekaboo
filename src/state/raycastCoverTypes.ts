import type { Matrix } from "@owlbear-rodeo/sdk";
import {
    type BoundingBox,
    type Vector2,
    type Wall,
    isLine,
    isShape,
    MathM,
} from "@owlbear-rodeo/sdk";
import { lineString } from "@turf/turf";
import type { Feature, LineString, Position } from "geojson";
import { isObject } from "owlbear-utils";
import { METADATA_KEY_PERMISSIVENESS } from "../constants";
import { type Cover, isCoverPolygon } from "../coverTypes";
import {
    getLineWorldPoints,
    getShapeWorldPoints,
    getWorldPoints,
    isNonCircleShape,
} from "../utils";

export interface CoverProperties {
    /**
     * If set, the partial cover is a character token.
     */
    characterId?: string;
    /**
     * How much the cover lets the line through. 0 = total
     * blockage, 1 = no cover.
     */
    permissiveness: number;
}
type RaycastLineString = Feature<LineString, CoverProperties>;
interface RaycastCircle {
    properties: CoverProperties;
    radius: number;
    /**
     * Matrix that encodes the position, rotation, and scale.
     */
    transform: Matrix;
    inverseTransformCache: Matrix;
}
export function isRaycastCircle(circle: unknown): circle is RaycastCircle {
    return (
        isObject(circle) &&
        "radius" in circle &&
        typeof circle.radius === "number" &&
        "transform" in circle &&
        Array.isArray(circle.transform) &&
        circle.transform.length === 9 &&
        // TODO check all elements are numbers?
        "inverseTransformCache" in circle &&
        Array.isArray(circle.inverseTransformCache) &&
        circle.inverseTransformCache.length === 9
    );
}
export type RaycastCover = RaycastLineString | RaycastCircle;

export function vector2ToPosition(vector: { x: number; y: number }): Position {
    return [vector.x, vector.y];
}

export function wallToLineString(wall: Readonly<Wall>): Feature<LineString> {
    const coords: Position[] = getWorldPoints(wall).map(vector2ToPosition);
    if (coords.length < 2) {
        throw new Error("Invalid wall: " + JSON.stringify(coords));
    }
    return lineString(coords);
}

export function boundingBoxToLineString(
    box: Readonly<BoundingBox>,
    properties: CoverProperties,
): RaycastCover {
    const { min, max } = box;
    const corners: Position[] = [
        [min.x, min.y],
        [max.x, min.y],
        [max.x, max.y],
        [min.x, max.y],
        [min.x, min.y],
    ];
    return lineString(corners, properties);
}

export function getRaycastCover(cover: Cover): RaycastCover {
    const properties: CoverProperties = {
        permissiveness: cover.metadata[METADATA_KEY_PERMISSIVENESS],
    };
    let points: Vector2[];
    if (isCoverPolygon(cover)) {
        points = getWorldPoints(cover);
        // OBR polygons auto-close, so add a final line back
        // to the starting point.
        points.push(points[0]);
    } else if (isLine(cover)) {
        points = getLineWorldPoints(cover);
    } else if (isShape(cover)) {
        if (isNonCircleShape(cover)) {
            points = getShapeWorldPoints(cover);
            // OBR polygons auto-close, so add a final line back
            // to the starting point.
            points.push(points[0]);
        } else {
            const transform = MathM.fromItem(cover);
            return {
                properties,
                radius: Math.max(cover.width, cover.height) / 2,
                transform,
                inverseTransformCache: MathM.inverse(transform),
            } satisfies RaycastCircle;
        }
    } else {
        throw new Error("Should be unreachable - unknown cover type");
    }

    return lineString(points.map(vector2ToPosition), properties);
}
