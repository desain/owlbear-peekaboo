import type { Vector2 } from "@owlbear-rodeo/sdk";
import { Math2 } from "@owlbear-rodeo/sdk";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { getGridCorners } from "./gridUtils";
import type { Pin } from "./Pin";
import { getPinLocation } from "./Pin";
import { raycastTurf } from "./raycastTurf";

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
    const collidedPositions = raycastTurf(startPosition, corners);

    const castResults = collidedPositions.map((endpoint, i) =>
        Math2.compare(endpoint, corners[i], 0.1),
    );
    const numCastsSucceeded = castResults.reduce((a, v) => a + Number(v), 0);
    const highlightColor = state.cornerColors[numCastsSucceeded] ?? "#cccccc";
    const labelText = state.cornerLabels[numCastsSucceeded] ?? "";
    const lineColors = castResults.map((castResult) =>
        castResult ? "#ffffff" : "#ff0000",
    );

    return {
        startPosition,
        endPosition,
        labelText,
        highlightColor,
        collidedPositions,
        lineColors,
    };
}
