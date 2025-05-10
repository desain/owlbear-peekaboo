import type {
    Curve,
    Image,
    ImageContent,
    ImageGrid,
    Item,
    Label,
    Line,
    Vector2,
} from "@owlbear-rodeo/sdk";
import {
    buildCurve,
    buildImage,
    buildLabel,
    buildLine,
    Math2,
} from "@owlbear-rodeo/sdk";
import type { HasParameterizedMetadata } from "owlbear-utils";
import eyeTarget from "../../assets/eye-target.svg";
import { CONTROL_METADATA, METADATA_KEY_IS_CONTROL } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { getGridCorners } from "./gridUtils";
import type { Pin } from "./Pin";
import type { RaycastResult } from "./raycast";
import { raycast } from "./raycast";

export type Control = Item &
    HasParameterizedMetadata<typeof METADATA_KEY_IS_CONTROL, true>;
export function isControl(item: Item): item is Control {
    return item.metadata[METADATA_KEY_IS_CONTROL] === true;
}

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
     * Visibility lines from start to end corners or end center
     */
    ...lines: Line[],
];

export function makeIcon(position: Vector2): Image {
    const size = 150;
    const imageContent: ImageContent = {
        height: size,
        width: size,
        mime: "image/svg+xml",
        url:
            window.location.origin +
            // import.meta.env.BASE_URL +
            eyeTarget,
    };
    const imageGrid: ImageGrid = {
        dpi: size,
        offset: { x: size / 2, y: size / 2 },
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
export function makeInteractionItems(
    start: Pin,
    end: Pin,
    endCenter: Vector2,
): ControlItems {
    const state = usePlayerStorage.getState();

    const label = buildLabel()
        .name("Peekaboo Cover Label")
        .pointerHeight(10)
        .pointerWidth(10)
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .metadata(CONTROL_METADATA)
        .build();

    const highlight = buildCurve()
        .name("Peekaboo Cell Highlight")
        .fillOpacity(0.2)
        .strokeOpacity(1)
        .strokeWidth(5)
        .tension(0)
        .closed(true)
        .disableHit(true)
        .locked(true)
        .layer("POINTER")
        .metadata(CONTROL_METADATA)
        .build();

    // Determine number of lines based on measureTo setting
    const measureTo = state.measureTo;
    const numLines = measureTo === "center" ? 1 : state.getGridCornerCount();
    const lines = Array.from(Array(numLines), () =>
        buildLine()
            .name("Peekaboo Visibility Line")
            .strokeWidth(10)
            .strokeOpacity(0.6)
            .strokeDash([1, 30])
            .disableHit(true)
            .locked(true)
            .layer("RULER")
            .metadata(CONTROL_METADATA)
            .build(),
    );

    const items: ControlItems = [label, highlight, ...lines];

    const raycastResult = raycast(start, end);

    fixControlItems(items, raycastResult, endCenter);
    return items;
}

export function fixControlItems(
    [label, highlight, ...lines]: ControlItems,
    { startPosition, labelText, highlightColor, lineResults }: RaycastResult,
    endCenter: Vector2,
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
    label.position = Math2.add(endCenter, { x: 0, y: -dpi / 2 });

    // Fix highlight
    highlight.points = getGridCorners({ x: 0, y: 0 }, state.grid);
    highlight.position = endCenter;
    highlight.style.fillColor = highlightColor;
    highlight.style.strokeColor = highlightColor;

    // Fix lines
    lines.forEach((line, i) => {
        line.startPosition = startPosition;
        const lineResult = lineResults[i];
        if (!lineResult) {
            return;
        }
        line.endPosition = lineResult.endPosition;
        line.style.strokeColor = lineResult.color;
    });
}
