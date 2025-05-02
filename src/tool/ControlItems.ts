import {
    buildCurve,
    buildLabel,
    buildLine,
    Curve,
    Label,
    Line,
    Math2,
    Metadata,
} from "@owlbear-rodeo/sdk";
import { METADATA_KEY_IS_PEEKABOO_CONTROL } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { NOT_CANCELLABLE } from "../utils";
import { getGridCorners } from "./gridUtils";
import { Pin } from "./Pin";
import { doRaycast, RaycastResult } from "./raycast";

export type ControlItems = [
    /**
     * Label item used to show cover label
     */
    label: Label,
    /**
     * Item used to highlight target grid cell
     */
    highlight: Curve,
    /**
     * Visibility lines from start to end corners
     */
    ...lines: Line[],
];

/**
 * @returns Item temporaries (not added to OBR yet).
 */
export async function makeInteractionItems(
    start: Pin,
    end: Pin,
): Promise<ControlItems> {
    const state = usePlayerStorage.getState();
    const metadata: Metadata = {
        [METADATA_KEY_IS_PEEKABOO_CONTROL]: true,
    };

    const label = buildLabel()
        .name("Peekaboo Cover Label")
        // .fontSize(Math.max(18, dpi / 5))
        .pointerHeight(10)
        .pointerWidth(10)
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .metadata(metadata)
        .build();

    const highlight = buildCurve()
        .name("Peekaboo Cell Highlight")
        // .fillColor(color)
        .fillOpacity(0.2)
        // .strokeColor(color)
        .strokeOpacity(1)
        .strokeWidth(5)
        .tension(0)
        .closed(true)
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .metadata(metadata)
        .build();

    const lines = Array.from(Array(state.getGridCorners()), () =>
        buildLine()
            .name("Peekaboo Visibility Line")
            // .strokeColor(color)
            .strokeWidth(10)
            .strokeOpacity(0.6)
            .strokeDash([1, 30])
            // .startPosition(start)
            // .endPosition(end)
            .disableHit(true)
            .locked(true)
            .layer("CONTROL")
            .metadata(metadata)
            .build(),
    );

    const items: ControlItems = [label, highlight, ...lines];

    const raycastResult = await doRaycast(start, end, NOT_CANCELLABLE);

    fixControlItems(items, raycastResult);
    return items;
}

export function fixControlItems(
    [label, highlight, ...lines]: ControlItems,
    {
        startPosition,
        endPosition,
        labelText,
        highlightColor,
        collidedPositions,
        lineColors,
    }: RaycastResult,
) {
    const state = usePlayerStorage.getState();

    // Fix label
    if (labelText === "") {
        label.scale = { x: 0, y: 0 };
    } else {
        label.scale = { x: 1, y: 1 };
    }
    const dpi = state.grid.dpi;
    label.text.plainText = labelText;
    label.position = Math2.add(endPosition, { x: 0, y: -dpi / 2 });

    // Fix highlight
    highlight.points = getGridCorners({ x: 0, y: 0 }, state.grid);
    highlight.position = endPosition;
    highlight.style.fillColor = highlightColor;
    highlight.style.strokeColor = highlightColor;

    // Fix lines
    lines.forEach((line, i) => {
        line.startPosition = startPosition;
        line.endPosition = collidedPositions[i];
        line.style.strokeColor = lineColors[i];
    });
}
