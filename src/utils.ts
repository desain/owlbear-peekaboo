import type {
    BoundingBox,
    Curve,
    Line,
    Shape,
    ShapeType,
    Vector2,
    Wall,
} from "@owlbear-rodeo/sdk";
import OBR, { MathM } from "@owlbear-rodeo/sdk";
import { matrixMultiply, PI_6 } from "owlbear-utils";

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

export function getWorldPoints(curve: Curve | Wall): Vector2[] {
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
