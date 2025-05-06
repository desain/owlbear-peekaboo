import type { Vector2 } from "@owlbear-rodeo/sdk";
import { Math2 } from "@owlbear-rodeo/sdk";
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
import {
    findBlockingPoint,
    partialObstructionPermissiveness,
} from "./raycastTurf";

export interface RaycastResult {
    startPosition: Vector2;
    endPosition: Vector2;
    labelText: string;
    highlightColor: string;
    collidedPositions: Vector2[];
    lineColors: string[];
}

export function raycast(
    start: Readonly<Pin>,
    end: Readonly<Pin>,
): RaycastResult {
    const startPosition = getPinLocation(start);

    const state = usePlayerStorage.getState();
    const endPosition = getPinLocation(end);
    const corners = getGridCorners(endPosition, state.grid);
    const collidedPositions = corners.map((corner) =>
        findBlockingPoint(state, startPosition, corner),
    );
    const originId = getPinId(start);
    const destinationId = getPinId(end);

    let numCastsSucceeded = 0;
    const lineColors: string[] = [];
    collidedPositions.forEach((endpoint, i) => {
        if (Math2.compare(endpoint, corners[i], 0.1)) {
            const permissiveness = partialObstructionPermissiveness(
                state,
                startPosition,
                corners[i],
                originId,
                destinationId,
            );
            numCastsSucceeded += permissiveness;
            lineColors.push(
                permissiveness === 1
                    ? COLOR_NO_OBSTRUCTION
                    : COLOR_PARTIAL_OBSTRUCTION,
            );
        } else {
            lineColors.push(COLOR_OBSTRUCTED);
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
        collidedPositions,
        lineColors,
    };
}
