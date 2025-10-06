import type { Path, Vector2 } from "@owlbear-rodeo/sdk";
import OBR, { isCurve, isLine, MathM } from "@owlbear-rodeo/sdk";
import {
    matrixMultiply,
    parseSubpath,
    RED_RGB,
    rgbToHex,
    WHITE_RGB,
    YELLOW_RGB,
    type HexColor,
    type RgbColor,
} from "owlbear-utils";
import simplify from "simplify-js";
import { METADATA_KEY_SOLIDITY } from "../constants";
import type { Cover } from "../coverTypes";

export async function snapToCenter(pos: Vector2): Promise<Vector2> {
    return OBR.scene.grid.snapPosition(pos, 1.0, false, true);
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
