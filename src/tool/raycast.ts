import type { Vector2 } from "@owlbear-rodeo/sdk";
import { COLOR_BACKUP } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { getPartialCoverColor } from "../utils";
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
            // Success value is the reverse of solidity - eg a line through 75% solid cover
            // counts for 25% of a line
            numCastsSucceeded += 1 - result;
            return {
                endPosition: target,
                color: getPartialCoverColor(result),
            };
        } else {
            return {
                endPosition: result,
                color: getPartialCoverColor(0),
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
