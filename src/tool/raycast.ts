import type { Vector2 } from "@owlbear-rodeo/sdk";
import {
    COLOR_BACKUP,
    COLOR_NO_OBSTRUCTION,
    COLOR_OBSTRUCTED,
    COLOR_PARTIAL_OBSTRUCTION,
} from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { getGridCorners } from "./gridUtils";
import type { Pin } from "./Pin";
import { getPinId, getPinLocation } from "./Pin";
import { raycastSingle } from "./raycastSingle";

interface LineResult {
    endPosition: Vector2;
    color: string;
}

export interface RaycastResult {
    startPosition: Vector2;
    endPosition: Vector2;
    labelText: string;
    highlightColor: string;
    lineResults: LineResult[];
}

export function raycast(
    start: Readonly<Pin>,
    end: Readonly<Pin>,
): RaycastResult {
    const startPosition = getPinLocation(start);

    const state = usePlayerStorage.getState();
    const endPosition = getPinLocation(end);
    const corners = getGridCorners(endPosition, state.grid);
    const originId = getPinId(start);
    const destinationId = getPinId(end);

    let numCastsSucceeded = 0;
    const lineResults: LineResult[] = corners.map((corner) => {
        const result = raycastSingle(
            state,
            startPosition,
            corner,
            originId,
            destinationId,
        );

        if (typeof result === "number") {
            numCastsSucceeded += result;
            return {
                endPosition: corner,
                color:
                    result === 1
                        ? COLOR_NO_OBSTRUCTION
                        : COLOR_PARTIAL_OBSTRUCTION,
            };
        } else {
            return {
                endPosition: result,
                color: COLOR_OBSTRUCTED,
            };
        }
    });

    const highlightColor =
        state.cornerColors[Math.floor(numCastsSucceeded)] ?? COLOR_BACKUP;
    const labelText = state.cornerLabels[Math.floor(numCastsSucceeded)] ?? "";

    return {
        startPosition,
        endPosition,
        labelText,
        highlightColor,
        lineResults,
    };
}
