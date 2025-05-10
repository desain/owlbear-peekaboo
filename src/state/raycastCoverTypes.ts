import type { Matrix } from "@owlbear-rodeo/sdk";
import {
    type BoundingBox,
    type Vector2,
    type Wall,
    isLine,
    isShape,
    MathM,
} from "@owlbear-rodeo/sdk";
import { lineString } from "@turf/helpers";
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
function isCoverProperties(properties: unknown): properties is CoverProperties {
    return (
        isObject(properties) &&
        "permissiveness" in properties &&
        typeof properties.permissiveness === "number" &&
        ("characterId" in properties
            ? typeof properties.characterId === "string"
            : true)
    );
}

type RaycastLineString = Feature<LineString, CoverProperties>;
interface RaycastCircle {
    properties: CoverProperties;
    /**
     * Matrix that encodes the position, rotation, and scale.
     * The scale includes the original width and height of the circle, as well
     * as any scaling that was applied after - this transform turns a unit
     * circle centered at the origin into the circle represented
     * by this object.
     */
    transform: Matrix;
    inverseTransformCache: Matrix;
}
export function isRaycastCircle(circle: unknown): circle is RaycastCircle {
    return (
        isObject(circle) &&
        "properties" in circle &&
        isCoverProperties(circle.properties) &&
        "transform" in circle &&
        Array.isArray(circle.transform) &&
        circle.transform.length === 9 &&
        circle.transform.every((n) => typeof n === "number") &&
        "inverseTransformCache" in circle &&
        Array.isArray(circle.inverseTransformCache) &&
        circle.inverseTransformCache.length === 9 &&
        circle.inverseTransformCache.every((n) => typeof n === "number")
    );
}
export type RaycastCover = RaycastLineString | RaycastCircle;

export function vector2ToPosition(vector: { x: number; y: number }): Position {
    return [vector.x, vector.y];
}

export function positionToVector2([x, y]: Position): Vector2 {
    if (x === undefined || y === undefined) {
        throw Error("invalid position");
    }
    return { x, y };
}

export function getWallPositions(wall: Readonly<Wall>): Position[] {
    if (wall.points.length < 2) {
        throw new Error("Invalid wall: " + JSON.stringify(wall));
    }
    return getWorldPoints(wall).map(vector2ToPosition);
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
        if (points[0]) {
            points.push(points[0]);
        }
    } else if (isLine(cover)) {
        points = getLineWorldPoints(cover);
    } else if (isShape(cover)) {
        if (isNonCircleShape(cover)) {
            points = getShapeWorldPoints(cover);
            // OBR polygons auto-close, so add a final line back
            // to the starting point.
            if (points[0]) {
                points.push(points[0]);
            }
        } else {
            const transform = MathM.multiply(
                MathM.fromItem(cover),
                MathM.fromScale({
                    x: cover.width / 2,
                    y: cover.height / 2,
                }),
            );
            return {
                properties,
                transform,
                inverseTransformCache: MathM.inverse(transform),
            } satisfies RaycastCircle;
        }
    } else {
        throw new Error("Should be unreachable - unknown cover type");
    }

    return lineString(points.map(vector2ToPosition), properties);
}
