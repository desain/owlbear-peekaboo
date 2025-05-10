import type { Vector2 } from "@owlbear-rodeo/sdk";
import {
    COLOR_BACKUP,
    COLOR_BLOCKED,
    COLOR_PARTIAL_COVER,
    COLOR_UNBLOCKED,
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
    const originId = getPinId(start);
    const destinationId = getPinId(end);

    // Determine cast targets based on user setting
    const [castTargets, castCountFactor] =
        state.measureTo === "center"
            ? [[endPosition], state.getGridCornerCount()]
            : [getGridCorners(endPosition, state.grid), 1];

    let numCastsSucceeded = 0;
    const lineResults: LineResult[] = castTargets.map((target) => {
        const result = raycastSingle(
            state,
            startPosition,
            target,
            originId,
            destinationId,
        );
        if (typeof result === "number") {
            numCastsSucceeded += result;
            return {
                endPosition: target,
                color: result === 1 ? COLOR_UNBLOCKED : COLOR_PARTIAL_COVER,
            };
        } else {
            return {
                endPosition: result,
                color: COLOR_BLOCKED,
            };
        }
    });

    const cornerConfig = state.roomMetadata.cornerConfigs[
        Math.floor(numCastsSucceeded * castCountFactor)
    ] ?? {
        label: "",
        color: COLOR_BACKUP,
    };

    return {
        startPosition,
        endPosition,
        labelText: cornerConfig.label,
        highlightColor: cornerConfig.color,
        lineResults,
    };
}
