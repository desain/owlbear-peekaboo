import { Vector2 } from "@owlbear-rodeo/sdk";
import {
    ANGLE_DIMETRIC_RADIANS,
    GridParsed,
    isHexGrid,
    SQRT_3,
} from "owlbear-utils";

const X_SCALE_DIMETRIC = 1 / Math.tan(ANGLE_DIMETRIC_RADIANS);

/**
 * @returns the corner positions of a grid cell (square or hex) given its center and grid info.
 */
export function getGridCorners(
    center: Vector2,
    { type, dpi }: GridParsed,
): Vector2[] {
    if (isHexGrid(type)) {
        // 6 corners for hex, dpi is flat-to-flat distance
        const angleOffset = type === "HEX_HORIZONTAL" ? 0 : Math.PI / 6;
        const radius = dpi / Math.sqrt(3); // center to corner
        return Array.from({ length: 6 }, (_, i) => {
            const angle = angleOffset + (Math.PI / 3) * i;
            return {
                x: center.x + radius * Math.cos(angle),
                y: center.y + radius * Math.sin(angle),
            };
        });
    } else if (type === "ISOMETRIC") {
        const halfDpi = dpi / 2;
        const xOffset = halfDpi * SQRT_3;
        return [
            { x: center.x, y: center.y - halfDpi }, // top
            {
                x: center.x + xOffset,
                y: center.y,
            }, // right
            { x: center.x, y: center.y + halfDpi }, // bottom
            {
                x: center.x - xOffset,
                y: center.y,
            }, // left
        ];
    } else if (type === "DIMETRIC") {
        const halfDpi = dpi / 2;
        const xOffset = halfDpi * X_SCALE_DIMETRIC;
        return [
            { x: center.x, y: center.y - halfDpi }, // top
            {
                x: center.x + xOffset,
                y: center.y,
            }, // right
            { x: center.x, y: center.y + halfDpi }, // bottom
            {
                x: center.x - xOffset,
                y: center.y,
            }, // left
        ];
    } else {
        // 4 corners for square
        const halfDpi = dpi / 2;
        return [
            { x: center.x - halfDpi, y: center.y - halfDpi }, // top left
            { x: center.x + halfDpi, y: center.y - halfDpi }, // top right
            { x: center.x + halfDpi, y: center.y + halfDpi }, // bottom right
            { x: center.x - halfDpi, y: center.y + halfDpi }, // bottom left
        ];
    }
}
