import type {
    BoundingBox,
    Curve,
    Image,
    Line,
    Path,
    Shape,
    ShapeType,
    Vector2,
    Wall,
} from "@owlbear-rodeo/sdk";
import OBR, { isCurve, isLine, Math2, MathM } from "@owlbear-rodeo/sdk";
import {
    matrixMultiply,
    PI_6,
    RED_RGB,
    rgbToHex,
    WHITE_RGB,
    YELLOW_RGB,
    type GridParams,
    type HexColor,
    type RgbColor,
} from "owlbear-utils";
import simplify from "simplify-js";
import { METADATA_KEY_SOLIDITY } from "../constants";
import type { Cover } from "../coverTypes";
import { parseSubpath } from "./bezierUtils";

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

export function getCurveWallWorldPoints(curve: Curve | Wall): Vector2[] {
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
                { x: 0, y: 0 }, // top left
                { x: shape.width, y: 0 }, // top right
                { x: shape.width, y: shape.height }, // bottom right
                { x: 0, y: shape.height }, // bottom left
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
                { x: 0, y: 0 }, // top
                { x: -shape.height / 2, y: shape.height }, // bottom left
                { x: shape.height / 2, y: shape.height }, // bottom right
            ];
            break;
    }
    const transform = MathM.fromItem(shape);
    return points.map((point) => matrixMultiply(transform, point));
}

/**
 * @returns Points tracing the (rotated) bounding box for an image.
 *          If the image is square, disregards rotation.
 *          Does not return a closed polygon.
 */
export function getImageWorldPoints(item: Image, grid: GridParams): Vector2[] {
    let transform = MathM.fromItem(item);
    // Counteract rotation for square images, as they're likely to be
    // circular tokens, in which case having the bounding box extend
    // outside the grid cell when the token is rotated is untuitive
    // behavior.
    // This behavior is incorrect for images of squares though.
    // TODO: is there a way to detect when images are circular tokens?
    if (item.image.width === item.image.height && item.rotation !== 0) {
        transform = MathM.multiply(
            transform,
            MathM.fromRotation(-item.rotation),
        );
    }

    const dpiScaling = grid.dpi / item.grid.dpi;
    return [
        { x: 0, y: 0 }, // top left
        { x: 0, y: item.image.height }, // bottom left
        { x: item.image.width, y: item.image.height }, // bottom right
        { x: item.image.width, y: 0 }, // top right
    ].map((point) =>
        matrixMultiply(
            transform,
            Math2.multiply(Math2.subtract(point, item.grid.offset), dpiScaling),
        ),
    );
}

export function getPathWorldPoints(path: Path): Vector2[][] {
    const lineStrings: Vector2[][] = [];
    let idx = 0;
    while (idx < path.commands.length) {
        const [points, newIdx] = parseSubpath(path.commands, idx);
        lineStrings.push(points);
        idx = newIdx;
    }

    const transform = MathM.fromItem(path);
    return lineStrings.map((lineString) =>
        simplify(lineString, 5.0).map((point) =>
            matrixMultiply(transform, point),
        ),
    );
}

export function getPartialCoverColor(solidity: number): HexColor {
    const clamped = Math.max(Math.min(solidity, 1), 0);
    const [a, b, alpha] =
        clamped <= 0.5
            ? [WHITE_RGB, YELLOW_RGB, clamped * 2]
            : [YELLOW_RGB, RED_RGB, (clamped - 0.5) * 2];
    return rgbToHex({
        x: a.x + (b.x - a.x) * alpha,
        y: a.y + (b.y - a.y) * alpha,
        z: a.z + (b.z - a.z) * alpha,
    } as RgbColor);
}

export function updatePartialCoverStyle(cover: Cover) {
    const color = getPartialCoverColor(cover.metadata[METADATA_KEY_SOLIDITY]);
    cover.style.strokeColor = color;
    cover.style.strokeOpacity = 1;
    cover.style.strokeWidth = 10;
    cover.style.strokeDash = [25, 25];
    if (!isLine(cover)) {
        cover.style.fillColor = color;
        cover.style.fillOpacity = 0.2;
        if (isCurve(cover)) {
            cover.style.tension = 0;
        }
    }
}

export function distanceSquared(a: Vector2, b: Vector2) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
}
