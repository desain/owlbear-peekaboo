import type {
    Curve,
    Image,
    ImageContent,
    ImageGrid,
    Label,
    Line,
    Metadata,
    Vector2,
} from "@owlbear-rodeo/sdk";
import {
    buildCurve,
    buildImage,
    buildLabel,
    buildLine,
    Math2,
} from "@owlbear-rodeo/sdk";
import eyeTarget from "../../assets/eye-target.svg";
import { METADATA_KEY_IS_PEEKABOO_CONTROL } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { getGridCorners } from "./gridUtils";
import type { Pin } from "./Pin";
import type { RaycastResult } from "./raycast";
import { raycast } from "./raycast";

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

const CONTROL_METADATA: Metadata = {
    [METADATA_KEY_IS_PEEKABOO_CONTROL]: true,
};

export function makeIcon(position: Vector2): Image {
    const imageContent: ImageContent = {
        height: 150,
        width: 150,
        mime: "image/svg+xml",
        url:
            window.location.origin +
            // import.meta.env.BASE_URL +
            eyeTarget,
    };
    const imageGrid: ImageGrid = {
        dpi: 150,
        offset: { x: 75, y: 75 },
    };
    return buildImage(imageContent, imageGrid)
        .name("Peekaboo Icon")
        .position(position)
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .scale({ x: 0.6, y: 0.6 })
        .metadata(CONTROL_METADATA)
        .build();
}

/**
 * @returns Item temporaries (not added to OBR yet).
 */
export function makeInteractionItems(start: Pin, end: Pin): ControlItems {
    const state = usePlayerStorage.getState();

    const label = buildLabel()
        .name("Peekaboo Cover Label")
        // .fontSize(Math.max(18, dpi / 5))
        .pointerHeight(10)
        .pointerWidth(10)
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .metadata(CONTROL_METADATA)
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
        .metadata(CONTROL_METADATA)
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
            .metadata(CONTROL_METADATA)
            .build(),
    );

    const items: ControlItems = [label, highlight, ...lines];

    const raycastResult = raycast(start, end);

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
