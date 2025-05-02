import OBR, {
    Item,
    Math2,
    Vector2,
    buildLight,
    buildShape,
} from "@owlbear-rodeo/sdk";
import { getId } from "owlbear-utils";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { snapToCenter } from "../utils";
import { getGridCorners } from "./gridUtils";
import { Pin, getPinLocation } from "./Pin";

async function raycast(
    origin: Readonly<Vector2>,
    ends: ReadonlyArray<Vector2>,
    checkCancel: VoidFunction,
): Promise<Vector2[]> {
    const dummies = ends.map(() =>
        buildShape()
            .shapeType("CIRCLE")
            .width(10)
            .height(10)
            .fillOpacity(0)
            .strokeOpacity(0)
            .strokeColor("#ffffff")
            .position(origin)
            .layer("CONTROL")
            .build(),
    );
    const lights = dummies.map((dummy) =>
        buildLight()
            .position(dummy.position)
            .attachedTo(dummy.id)
            .sourceRadius(0)
            .attenuationRadius(0)
            .build(),
    );

    let dummiesNew: Item[] = [];
    try {
        await OBR.scene.local.addItems([...dummies, ...lights]);
        checkCancel();

        await OBR.scene.local.updateItems(dummies, (dummies) =>
            dummies.forEach((dummy, i) => {
                dummy.position = ends[i];
            }),
        );
        checkCancel();

        dummiesNew = await OBR.scene.local.getItems(dummies.map(getId));
        checkCancel();
    } finally {
        // lights will get auto-deleted since they're attached
        if (dummiesNew.length > 0) {
            void OBR.scene.local.deleteItems(dummiesNew.map(getId));
        }
    }

    if (dummiesNew.length !== dummies.length) {
        throw new Error("Raycast dummy object deleted");
    }

    return dummiesNew.map((dummy) => dummy.position);
}

export interface RaycastResult {
    startPosition: Vector2;
    endPosition: Vector2;
    labelText: string;
    highlightColor: string;
    collidedPositions: Vector2[];
    lineColors: string[];
}

export async function doRaycast(
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
    const collidedPositions = await raycast(
        startPosition,
        corners,
        checkCancel,
    );
    checkCancel();

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
