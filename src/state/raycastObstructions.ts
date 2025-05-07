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
import { METADATA_KEY_OBSTRUCTION_PERMISSIVENESS } from "../constants";
import { type Obstruction, isObstructionPolygon } from "../obstructions";
import {
    getCurveWorldPoints,
    getLineWorldPoints,
    getShapeWorldPoints,
    isNonCircleShape,
} from "../utils";

export interface ObstructionProperties {
    /**
     * If set, the partial obstruction is a character token.
     */
    characterId?: string;
    /**
     * How much the obstruction lets the line through. 0 = total
     * blockage, 1 = no obstruction.
     */
    permissiveness: number;
}
type RaycastLineString = Feature<LineString, ObstructionProperties>;
interface RaycastCircle {
    properties: ObstructionProperties;
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
export type RaycastObstruction = RaycastLineString | RaycastCircle;

export function vector2ToPosition(vector: { x: number; y: number }): Position {
    return [vector.x, vector.y];
}

export function wallToLineString(wall: Readonly<Wall>): Feature<LineString> {
    const coords: Position[] = wall.points.map(vector2ToPosition);
    if (coords.length < 2) {
        throw new Error("Invalid wall: " + JSON.stringify(coords));
    }
    return lineString(coords);
}

export function boundingBoxToLineString(
    box: Readonly<BoundingBox>,
    properties: ObstructionProperties,
): RaycastObstruction {
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

export function getRaycastObstruction(
    obstruction: Obstruction,
): RaycastObstruction {
    const properties: ObstructionProperties = {
        permissiveness:
            obstruction.metadata[METADATA_KEY_OBSTRUCTION_PERMISSIVENESS],
    };
    let points: Vector2[];
    if (isObstructionPolygon(obstruction)) {
        points = getCurveWorldPoints(obstruction);
        // OBR polygons auto-close, so add a final line back
        // to the starting point.
        points.push(points[0]);
    } else if (isLine(obstruction)) {
        points = getLineWorldPoints(obstruction);
    } else if (isShape(obstruction)) {
        if (isNonCircleShape(obstruction)) {
            points = getShapeWorldPoints(obstruction);
            // OBR polygons auto-close, so add a final line back
            // to the starting point.
            points.push(points[0]);
        } else {
            const transform = MathM.fromItem(obstruction);
            return {
                properties,
                radius: Math.max(obstruction.width, obstruction.height) / 2,
                transform,
                inverseTransformCache: MathM.inverse(transform),
            } satisfies RaycastCircle;
        }
    } else {
        throw new Error("Should be unreachable - unknown obstruction type");
    }

    return lineString(points.map(vector2ToPosition), properties);
}
