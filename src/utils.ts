import type {
    BoundingBox,
    Curve,
    Line,
    Matrix,
    Shape,
    ShapeType,
    Vector2,
    Wall,
} from "@owlbear-rodeo/sdk";
import OBR, { isLine, isShape, MathM } from "@owlbear-rodeo/sdk";
import { lineString } from "@turf/turf";
import type { Feature, LineString, Position } from "geojson";
import { isObject, matrixMultiply, PI_6 } from "owlbear-utils";
import { METADATA_KEY_CURVE_PERMISSIVENESS } from "./constants";
import type { Obstruction } from "./obstructions";
import { isObstructionPolygon } from "./obstructions";

export function boundingBoxContains(
    point: Vector2,
    boundingBox: Pick<BoundingBox, "min" | "max">,
): boolean {
    return (
        point.x >= boundingBox.min.x &&
        point.x <= boundingBox.max.x &&
        point.y >= boundingBox.min.y &&
        point.y <= boundingBox.max.y
    );
}

export function vector2Equals(a: Vector2, b: Vector2) {
    return a.x === b.x && a.y === b.y;
}

export async function snapToCenter(pos: Vector2): Promise<Vector2> {
    return OBR.scene.grid.snapPosition(pos, 1.0, false, true);
}

/**
 * @param radius center to corner distance
 * @param angleOffset 0 for flat-top, pi/6 for pointy top
 */
export function getHexagonPoints(radius: number, angleOffset = 0): Vector2[] {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = angleOffset + (Math.PI / 3) * i;
        return {
            x: radius * Math.cos(angle),
            y: radius * Math.sin(angle),
        };
    });
}

export function getCurveWorldPoints(curve: Curve): Vector2[] {
    const transform = MathM.fromItem(curve);
    return curve.points.map((point) => matrixMultiply(transform, point));
}

export function getLineWorldPoints(line: Line): Vector2[] {
    const transform = MathM.fromItem(line);
    return [
        matrixMultiply(transform, line.startPosition),
        matrixMultiply(transform, line.endPosition),
    ];
}

type NonCircleShape = Shape & { shapeType: Exclude<ShapeType, "CIRCLE"> };
export function isNonCircleShape(shape: Shape): shape is NonCircleShape {
    return shape.shapeType !== "CIRCLE";
}

export function getShapeWorldPoints(shape: NonCircleShape): Vector2[] {
    let points: Vector2[];
    switch (shape.shapeType) {
        case "RECTANGLE":
            points = [
                { x: 0, y: 0 },
                { x: shape.width, y: 0 },
                { x: shape.width, y: shape.height },
                { x: 0, y: shape.height },
            ];
            break;
        case "HEXAGON":
            points = getHexagonPoints(
                Math.max(shape.width, shape.height) / 2,
                PI_6,
            );
            break;
        case "TRIANGLE":
            points = [
                { x: 0, y: 0 },
                { x: -shape.height / 2, y: shape.height },
                { x: shape.height / 2, y: shape.height },
            ];
            break;
    }
    const transform = MathM.fromItem(shape);
    return points.map((point) => matrixMultiply(transform, point));
}

// TURF UTILS
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
        permissiveness: obstruction.metadata[METADATA_KEY_CURVE_PERMISSIVENESS],
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
