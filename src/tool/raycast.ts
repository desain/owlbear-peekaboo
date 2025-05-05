import type { Vector2 } from "@owlbear-rodeo/sdk";
import { Math2 } from "@owlbear-rodeo/sdk";
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
            lineColors.push(permissiveness === 1 ? "#ffffff" : "#ffff00");
        } else {
            lineColors.push("#ff0000");
        }
    });

    const highlightColor =
        state.cornerColors[Math.floor(numCastsSucceeded)] ?? "#cccccc";
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
