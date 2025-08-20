import type { Matrix } from "@owlbear-rodeo/sdk";
import {
    type Vector2,
    type Wall,
    isCurve,
    isLine,
    isPath,
    isShape,
    Math2,
    MathM,
} from "@owlbear-rodeo/sdk";
import { multiLineString } from "@turf/helpers";
import type { Feature, MultiLineString, Position } from "geojson";
import { isObject } from "owlbear-utils";
import { METADATA_KEY_SOLIDITY } from "../constants";
import { type Cover } from "../coverTypes";
import {
    getCurveWallWorldPoints,
    getLineWorldPoints,
    getPathWorldPoints,
    getShapeWorldPoints,
    isNonCircleShape,
} from "../utils/utils";
import type { CharacterBoundingPolygon } from "./usePlayerStorage";

export interface CoverProperties {
    /**
     * How much the cover blocks the line line. 0 = no cover, 1 = full cover.
     */
    solidity: number;
}
function isCoverProperties(properties: unknown): properties is CoverProperties {
    return (
        isObject(properties) &&
        "solidity" in properties &&
        typeof properties.solidity === "number"
    );
}

export type RaycastLineString = Feature<MultiLineString, CoverProperties>;
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

export function vector2ToPosition(vector: Vector2): Position {
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
        throw Error("Invalid wall: " + JSON.stringify(wall));
    }
    return getCurveWallWorldPoints(wall).map(vector2ToPosition);
}

export function characterBoundingPolygonToRaycastCover(
    { worldPoints }: CharacterBoundingPolygon,
    tokenCoverProperties: CoverProperties,
): RaycastCover {
    const positions = worldPoints.map(vector2ToPosition);
    if (positions[0]) {
        positions.push(positions[0]);
    }
    return multiLineString([positions], tokenCoverProperties);
}

// export function boundingBoxToLineString(
//     box: Readonly<BoundingBox>,
//     properties: CoverProperties,
// ): RaycastCover {
//     const { min, max } = box;
//     const corners: Position[] = [
//         [min.x, min.y], // top left
//         [min.x, max.y], // bottom left
//         [max.x, max.y], // bottom right
//         [max.x, min.y], // top right
//         [min.x, min.y], // top left
//     ];
//     return lineString(corners, properties);
// }

export function getRaycastCover(
    cover: Cover,
): [raycastCover: RaycastCover, centroid: Vector2] {
    const properties: CoverProperties = {
        solidity: cover.metadata[METADATA_KEY_SOLIDITY],
    };
    let centroid: Vector2;
    let points: Vector2[][];
    if (isCurve(cover)) {
        const worldPoints = getCurveWallWorldPoints(cover);
        centroid = Math2.centroid(worldPoints);
        // OBR polygons auto-close, so add a final line back
        // to the starting point.
        worldPoints.push(worldPoints[0]!);
        points = [worldPoints];
    } else if (isLine(cover)) {
        const worldPoints = getLineWorldPoints(cover);
        centroid = Math2.centroid(worldPoints);
        points = [worldPoints];
    } else if (isShape(cover)) {
        if (isNonCircleShape(cover)) {
            const worldPoints = getShapeWorldPoints(cover);
            centroid = Math2.centroid(worldPoints);
            worldPoints.push(worldPoints[0]!);
            // Add a final line back to the starting point.
            points = [worldPoints];
        } else {
            const transform = MathM.multiply(
                MathM.fromItem(cover),
                MathM.fromScale({
                    x: cover.width / 2,
                    y: cover.height / 2,
                }),
            );
            const raycastCover = {
                properties,
                transform,
                inverseTransformCache: MathM.inverse(transform),
            } satisfies RaycastCircle;
            return [raycastCover, cover.position];
        }
    } else if (isPath(cover)) {
        points = getPathWorldPoints(cover);
        const centroids = points.map((lineString) =>
            Math2.centroid(lineString),
        );
        centroid = Math2.centroid(centroids);
        // debugDrawPoints(points);
    } else {
        throw new Error("Should be unreachable - unknown cover type");
    }

    const raycastCover = multiLineString(
        points.map((lineString) => lineString.map(vector2ToPosition)),
        properties,
    );
    return [raycastCover, centroid];
}

// function debugDrawPoints(points: Vector2[]) {
//     void OBR.scene.local.addItems(
//         points.map((point) =>
//             buildShape()
//                 .shapeType("CIRCLE")
//                 .width(10)
//                 .height(10)
//                 .layer("CONTROL")
//                 .position(point)
//                 .build(),
//         ),
//     );
// }
