import { Math2, Vector2 } from "@owlbear-rodeo/sdk";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { snapToCenter } from "../utils";
import { getGridCorners } from "./gridUtils";
import { Pin, getPinLocation } from "./Pin";
import { raycastTurf } from "./raycastTurf";

export interface RaycastResult {
    startPosition: Vector2;
    endPosition: Vector2;
    labelText: string;
    highlightColor: string;
    collidedPositions: Vector2[];
    lineColors: string[];
}

export async function raycast(
    start: Readonly<Pin>,
    end: Readonly<Pin>,
    checkCancel: VoidFunction,
): Promise<RaycastResult> {
    let startPosition = getPinLocation(start);
    if (usePlayerStorage.getState().snapOrigin) {
        startPosition = await snapToCenter(startPosition);
        checkCancel();
    }

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
