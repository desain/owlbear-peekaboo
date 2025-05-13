import type { Vector2 } from "@owlbear-rodeo/sdk";
import { COLOR_BACKUP } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { getPartialCoverColor } from "../utils/utils";
import { getGridCorners } from "./gridUtils";
import type { Pin } from "./Pin";
import { getPinId, getPinLocation } from "./Pin";
import { raycastSingle } from "./raycastSingle";

interface LineResult {
    /**
     * Position where the line intersected cover.
     * If there was no intersection, this equals the end position.
     */
    intersectPosition: Vector2;
    endPosition: Vector2;
    /**
     * Color of the line from the intersect to the end.
     */
    color: string;
}

export interface RaycastResult {
    startPosition: Vector2;
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
        const [point, solidity] = raycastSingle(
            state,
            startPosition,
            target,
            originId,
            destinationId,
        );
        // Success value is the reverse of solidity - eg a line through 75% solid cover
        // counts for 25% of a line
        numCastsSucceeded += 1 - solidity;
        return {
            intersectPosition: point,
            endPosition: target,
            color: getPartialCoverColor(solidity),
        };
    });

    const cornerConfig = state.roomMetadata.cornerConfigs[
        Math.floor(numCastsSucceeded * castCountFactor)
    ] ?? {
        label: "",
        color: COLOR_BACKUP,
    };

    return {
        startPosition,
        labelText: cornerConfig.label,
        highlightColor: cornerConfig.color,
        lineResults,
    };
}
