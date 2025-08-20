import { Math2, type Vector2 } from "@owlbear-rodeo/sdk";
import type { GridParsed } from "owlbear-utils";
import { ANGLE_DIMETRIC_RADIANS, isHexGrid, PI_6, SQRT_3 } from "owlbear-utils";
import { getHexagonPoints } from "../utils/utils";

const X_SCALE_DIMETRIC = 1 / Math.tan(ANGLE_DIMETRIC_RADIANS);

/**
 * @returns the corner positions of a grid cell (square or hex) given its center and grid info.
 *          the point list is open (last position is not equal to first).
 */
export function getGridCorners(
    center: Vector2,
    { type, dpi }: Pick<GridParsed, "type" | "dpi">,
): Vector2[] {
    if (isHexGrid(type)) {
        // 6 corners for hex, dpi is flat-to-flat distance
        const angleOffset = type === "HEX_HORIZONTAL" ? 0 : PI_6;
        const radius = dpi / Math.sqrt(3); // center to corner
        return getHexagonPoints(radius, angleOffset).map((point) =>
            Math2.add(point, center),
        );
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
