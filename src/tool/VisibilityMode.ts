import OBR, {
    BoundingBox,
    Curve,
    Image,
    ImageContent,
    ImageGrid,
    Item,
    Label,
    Line,
    Math2,
    ToolContext,
    ToolEvent,
    ToolMode,
    Vector2,
    buildCurve,
    buildImage,
    buildLabel,
    buildLine,
} from "@owlbear-rodeo/sdk";
import { getId } from "owlbear-utils";
import logo from "../../assets/logo.svg";
import { TOOL_ID, TOOL_VISIBILITY_MODE_ID } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import {
    LocationPin,
    Pin,
    TokenPin,
    getPinLocation,
    isLocationPin,
    isTokenPin,
    updatePin,
} from "./Pin";
import { getGridCorners } from "./gridUtils";
import { raycast } from "./raycast";

function boundingBoxContains(point: Vector2, boundingBox: BoundingBox) {
    return (
        point.x >= boundingBox.min.x &&
        point.x <= boundingBox.max.x &&
        point.y >= boundingBox.min.y &&
        point.y <= boundingBox.max.y
    );
}

function vector2Equals(a: Vector2, b: Vector2) {
    return a.x === b.x && a.y === b.y;
}

export class VisibilityMode implements ToolMode {
    id = TOOL_VISIBILITY_MODE_ID;
    icons = [
        {
            icon: logo,
            label: "Check Visibility",
            filter: {
                activeTools: [TOOL_ID],
            },
        },
    ];

    cursors = [
        {
            cursor: "cell",
            filter: {
                target: [
                    {
                        key: "layer",
                        value: "CHARACTER",
                    },
                ],
            },
        },
        { cursor: "crosshair" },
    ];

    #start: Pin | null = null;

    /**
     * Location: center of square we're looking at. Plus maybe a pin to a creature
     * at that location.
     */
    #end: Pin | null = null;

    /**
     * Cache of local line items IDs.
     */
    #lineIds: string[] = [];

    /**
     * ID of item used to highlight target grid cell.
     */
    #highlightId: string | null = null;

    /**
     * ID of label item used to show cover label.
     */
    #labelId: string | null = null;

    /**
     * ID of image item used to mark the start pin (if TokenPin).
     */
    #startIconId: string | null = null;

    /**
     * ID of image item used to mark the end pin (if TokenPin).
     */
    #endIconId: string | null = null;

    static readonly #getStart = (event: ToolEvent): Pin => {
        const startPosition = event.pointerPosition;
        if (event.target && event.target.layer === "CHARACTER") {
            return {
                id: event.target.id,
                cachedPosition: event.target.position,
                offset: Math2.subtract(startPosition, event.target.position),
            } satisfies TokenPin;
        } else {
            return {
                position: startPosition,
            } satisfies LocationPin;
        }
    };

    /**
     * @returns Whether the end position changed.
     */
    readonly #updateEnd = async (event: ToolEvent): Promise<boolean> => {
        const snappedPosition = await VisibilityMode.#snap(
            event.pointerPosition,
        );

        if (
            this.#end &&
            vector2Equals(snappedPosition, getPinLocation(this.#end))
        ) {
            return false;
        }

        const boundingBoxes =
            usePlayerStorage.getState().characterBoundingBoxes;
        const targetToken = boundingBoxes.find(([, boundingBox]) =>
            boundingBoxContains(snappedPosition, boundingBox),
        );
        if (targetToken) {
            // Update end pin
            const [targetId, { center }] = targetToken;
            this.#end = {
                id: targetId,
                cachedPosition: center,
                offset: Math2.subtract(snappedPosition, center),
            } satisfies TokenPin;
        } else {
            // Update end pin
            this.#end = {
                position: snappedPosition,
            } satisfies LocationPin;
        }

        return true;
    };

    readonly #fixEndIcon = () => {
        if (isLocationPin(this.#end)) {
            // Remove icon
            if (this.#endIconId) {
                void OBR.scene.local.deleteItems([this.#endIconId]);
                this.#endIconId = null;
            }
        } else if (this.#end !== null) {
            const position = this.#end.cachedPosition;

            // Create or update icon
            if (this.#endIconId) {
                void OBR.scene.local.updateItems([this.#endIconId], (images) =>
                    images.forEach((image) => {
                        image.position = position;
                    }),
                );
            } else {
                const icon = VisibilityMode.makeIcon(position);
                void OBR.scene.local.addItems([icon]);
                this.#endIconId = icon.id;
            }
        }
    };

    static readonly #snap = (position: Vector2) =>
        OBR.scene.grid.snapPosition(position, 1.0, false, true);

    static readonly #makeLine = (
        start: Vector2,
        end: Vector2,
        color: string,
    ): Line =>
        buildLine()
            .strokeColor(color)
            .strokeWidth(10)
            .strokeOpacity(0.6)
            .strokeDash([1, 30])
            .startPosition(start)
            .endPosition(end)
            .disableHit(true)
            .locked(true)
            .layer("CONTROL")
            .build();

    static readonly #fixHighlight = (
        curve: Curve,
        centerPosition: Vector2,
        color: string,
    ) => {
        const grid = usePlayerStorage.getState().grid;
        curve.points = getGridCorners({ x: 0, y: 0 }, grid);
        curve.position = centerPosition;
        curve.style.fillColor = color;
        curve.style.strokeColor = color;
    };

    static readonly #makeHighlight = (
        centerPosition: Vector2,
        color: string,
    ): Curve => {
        const curve = buildCurve()
            .fillColor(color)
            .fillOpacity(0.2)
            .strokeColor(color)
            .strokeOpacity(1)
            .strokeWidth(5)
            .tension(0)
            .closed(true)
            .disableHit(true)
            .locked(true)
            .layer("CONTROL")
            .build();
        VisibilityMode.#fixHighlight(curve, centerPosition, color);
        return curve;
    };

    static readonly #fixLabel = (
        label: Label,
        centerPosition: Vector2,
        text: string,
    ) => {
        if (text === "") {
            label.scale = { x: 0, y: 0 };
        } else {
            label.scale = { x: 1, y: 1 };
        }
        const dpi = usePlayerStorage.getState().grid.dpi;
        label.text.plainText = text;
        label.position = Math2.add(centerPosition, { x: 0, y: -dpi / 2 });
    };

    static readonly #makeLabel = (
        centerPosition: Vector2,
        text: string,
    ): Label => {
        const label = buildLabel()
            // .fontSize(Math.max(18, dpi / 5))
            .pointerHeight(10)
            .pointerWidth(10)
            .disableHit(true)
            .locked(true)
            .layer("CONTROL")
            .build();
        VisibilityMode.#fixLabel(label, centerPosition, text);
        return label;
    };

    readonly #deleteControls = async () => {
        const toDelete = [...this.#lineIds];
        if (this.#highlightId) {
            toDelete.push(this.#highlightId);
        }
        if (this.#labelId) {
            toDelete.push(this.#labelId);
        }
        if (this.#startIconId) {
            toDelete.push(this.#startIconId);
        }
        if (this.#endIconId) {
            toDelete.push(this.#endIconId);
        }
        if (toDelete.length > 0) {
            this.#lineIds = [];
            this.#highlightId = null;
            this.#labelId = null;
            this.#startIconId = null;
            this.#endIconId = null;
            await OBR.scene.local.deleteItems(toDelete);
        }
    };

    static readonly makeIcon = (position: Vector2): Image => {
        const imageContent: ImageContent = {
            height: 300,
            width: 300,
            mime: "image/svg+xml",
            url:
                window.location.origin +
                // import.meta.env.BASE_URL +
                logo,
        };
        const imageGrid: ImageGrid = {
            dpi: 300,
            offset: { x: 150, y: 150 },
        };
        return buildImage(imageContent, imageGrid)
            .position(position)
            .disableHit(true)
            .locked(true)
            .layer("CONTROL")
            .scale({ x: 0.7, y: 0.7 })
            .build();
    };

    readonly #fixControls = async () => {
        if (this.#start === null || this.#end === null) {
            return;
        }

        this.#fixEndIcon();

        let startPosition = getPinLocation(this.#start);
        if (usePlayerStorage.getState().snapOrigin) {
            startPosition = await VisibilityMode.#snap(startPosition);
        }

        const state = usePlayerStorage.getState();
        const endPosition = getPinLocation(this.#end);
        const corners = getGridCorners(endPosition, state.grid);
        const collidedPositions = await raycast(startPosition, corners);

        const castResults = collidedPositions.map((endpoint, i) =>
            Math2.compare(endpoint, corners[i], 0.1),
        );
        const numCastsSucceeded = castResults.reduce(
            (a, v) => a + Number(v),
            0,
        );

        const toAdd: Item[] = [];

        // Create or update highlight
        const highlightColor =
            state.cornerColors[numCastsSucceeded] ?? "#cccccc";
        if (this.#highlightId === null) {
            const highlight = VisibilityMode.#makeHighlight(
                endPosition,
                highlightColor,
            );
            this.#highlightId = highlight.id;
            toAdd.push(highlight);
        } else {
            await OBR.scene.local.updateItems<Curve>(
                [this.#highlightId],
                (curves) =>
                    curves.forEach((curve) => {
                        VisibilityMode.#fixHighlight(
                            curve,
                            endPosition,
                            highlightColor,
                        );
                    }),
            );
        }

        // Create or update label
        const labelText = state.cornerLabels[numCastsSucceeded] ?? "";
        if (this.#labelId === null) {
            const label = VisibilityMode.#makeLabel(endPosition, labelText);
            this.#labelId = label.id;
            toAdd.push(label);
        } else {
            await OBR.scene.local.updateItems<Label>(
                [this.#labelId],
                (labels) =>
                    labels.forEach((label) => {
                        VisibilityMode.#fixLabel(label, endPosition, labelText);
                    }),
            );
        }

        // Create or update lines
        const lineColors = castResults.map((castResult) =>
            castResult ? "#ffffff" : "#ff0000",
        );
        if (this.#lineIds.length === 0) {
            const lines = collidedPositions.map((endpoint, i) =>
                VisibilityMode.#makeLine(
                    startPosition,
                    endpoint,
                    lineColors[i],
                ),
            );
            this.#lineIds = lines.map(getId);
            toAdd.push(...lines);
        } else {
            await OBR.scene.local.updateItems<Line>(this.#lineIds, (lines) =>
                lines.forEach((line, i) => {
                    line.startPosition = startPosition;
                    line.endPosition = collidedPositions[i];
                    line.style.strokeColor = lineColors[i];
                }),
            );
        }

        if (toAdd.length > 0) {
            await OBR.scene.local.addItems(toAdd);
        }
    };

    readonly #createStartIcon = async () => {
        if (isTokenPin(this.#start)) {
            if (this.#startIconId) {
                // Defensive: remove any existing icon first
                await OBR.scene.local.deleteItems([this.#startIconId]);
                this.#startIconId = null;
            }
            const icon = VisibilityMode.makeIcon(this.#start.cachedPosition);
            this.#startIconId = icon.id;
            await OBR.scene.local.addItems([icon]);
        }
    };

    readonly onActivate = async () => {
        async function tryUpdatePin(pin: Pin | null): Promise<Pin | null> {
            if (pin) {
                return updatePin(pin);
            } else {
                return null;
            }
        }
        [this.#start, this.#end] = await Promise.all([
            tryUpdatePin(this.#start),
            tryUpdatePin(this.#end),
        ]);
        await this.#createStartIcon();
        await this.#fixControls();
    };

    readonly onToolDragStart = async (_: ToolContext, event: ToolEvent) => {
        [this.#start] = await Promise.all([
            VisibilityMode.#getStart(event),
            this.#updateEnd(event),
        ]);
        await this.#createStartIcon();
    };

    readonly onToolDragMove = async (_: ToolContext, event: ToolEvent) => {
        if (!this.#start || !this.#end) {
            return;
        }

        const changedEnd = await this.#updateEnd(event);
        if (!changedEnd) {
            return;
        }

        await this.#fixControls();
    };

    readonly onDeactivate = async () => {
        await this.#deleteControls();
    };

    readonly onToolDragCancel = async () => {
        await this.#deleteControls();
    };
}
