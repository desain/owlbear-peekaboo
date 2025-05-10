import type {
    Item,
    KeyEvent,
    Line,
    ToolContext,
    ToolEvent,
    ToolMode,
    Vector2,
} from "@owlbear-rodeo/sdk";
import OBR, {
    buildCurve,
    buildLabel,
    buildLine,
    isLine,
} from "@owlbear-rodeo/sdk";
import pen from "../../assets/pen.svg";
import {
    COLOR_PARTIAL_COVER,
    ID_TOOL,
    ID_TOOL_MODE_PARTIAL_COVER,
    ID_TOOL_MODE_PEN,
    CONTROL_METADATA as METADATA_CONTROL,
    METADATA_KEY_IS_PEEKABOO_CONTROL,
    METADATA_KEY_PERMISSIVENESS,
    METADATA_KEY_TOOL_PEN_ENABLED,
    STYLE_PARTIAL_COVER,
} from "../constants";

function makePreviewLine(start: Vector2, end: Vector2): Line {
    return buildLine()
        .name("Peekaboo Cover Builder Line")
        .startPosition(start)
        .endPosition(end)
        .style(STYLE_PARTIAL_COVER)
        .metadata(METADATA_CONTROL)
        .disableHit(true)
        .locked(true)
        .build();
}

/**
 * Tool that allows the user to draw cover polygons
 */
export class DrawCoverMode implements ToolMode {
    readonly id = ID_TOOL_MODE_PEN;
    readonly icons = [
        {
            icon: pen,
            label: "Draw Partial Cover",
            filter: {
                activeTools: [ID_TOOL],
                metadata: [
                    {
                        key: METADATA_KEY_TOOL_PEN_ENABLED,
                        value: true,
                    },
                ],
            },
        },
    ];
    readonly cursors = [
        {
            cursor: "pointer",
            filter: {
                target: [
                    {
                        key: "type",
                        value: "LABEL",
                    },
                    {
                        key: ["metadata", METADATA_KEY_IS_PEEKABOO_CONTROL],
                        value: true,
                    },
                ],
            },
        },
        {
            cursor: "crosshair",
        },
    ];

    #inputPosition?: Vector2;
    #finishLabelId?: string;
    /**
     * IDs of local line items. If nonempty, has at least two elements.
     * The last two are always the line going into and out of the mouse position.
     */
    #lineIds: string[] = [];
    #metaDown = false;
    #controlDown = false;

    readonly setInputPosition = (position: Vector2) => {
        this.#inputPosition = position;
    };

    readonly onActivate = async () => {
        if (!this.#inputPosition) {
            return;
        }

        const position = await this.#doSnap(this.#inputPosition);
        // Reset input position for next time
        this.#inputPosition = undefined;

        // Place the Finish label
        const label = buildLabel()
            .position(position)
            .plainText("Finish")
            .disableHit(false) // need to be able to click it
            .locked(true)
            .pointerHeight(10)
            .pointerWidth(10)
            .metadata(METADATA_CONTROL)
            .build();
        this.#finishLabelId = label.id;

        // Place the preview lines
        const lineToPointer = makePreviewLine(position, position);
        const loopbackLine = makePreviewLine(position, position);
        this.#lineIds = [lineToPointer.id, loopbackLine.id];

        await OBR.scene.local.addItems([label, lineToPointer, loopbackLine]);
    };

    readonly onToolMove = (_context: ToolContext, event: ToolEvent) => {
        void this.#updatePosition(event.pointerPosition);
    };

    readonly #doSnap = async (position: Vector2): Promise<Vector2> => {
        if (!this.#metaDown && !this.#controlDown) {
            return await OBR.scene.grid.snapPosition(position);
        }
        return position;
    };

    readonly #updatePosition = async (position: Vector2): Promise<Vector2> => {
        const lineToPointer = this.#lineIds[this.#lineIds.length - 2];
        const loopbackLine = this.#lineIds[this.#lineIds.length - 1];
        if (!lineToPointer || !loopbackLine) {
            // not drawing
            return position;
        }

        const snappedPosition = await this.#doSnap(position);

        await OBR.scene.local.updateItems<Line>(
            [lineToPointer, loopbackLine],
            ([lineToPointer, loopbackLine]) => {
                if (
                    !lineToPointer ||
                    !loopbackLine ||
                    !isLine(lineToPointer) ||
                    !isLine(loopbackLine)
                ) {
                    return;
                }
                lineToPointer.endPosition = snappedPosition;
                loopbackLine.startPosition = snappedPosition;
            },
        );
        return snappedPosition;
    };

    readonly onToolClick = async (_context: ToolContext, event: ToolEvent) => {
        const position = await this.#updatePosition(event.pointerPosition);

        if (event.target && event.target.id === this.#finishLabelId) {
            void this.#doFinish();
        } else {
            const newLineToPointer = makePreviewLine(position, position);
            this.#lineIds.splice(-1, 0, newLineToPointer.id);
            await OBR.scene.local.addItems([newLineToPointer]);
        }
    };

    readonly #doFinish = async () => {
        if (this.#lineIds.length < 2) {
            console.warn("doFinish() called without lines");
            return;
        }

        // Take the results
        const linesActual = await OBR.scene.local.getItems<Line>(this.#lineIds);
        if (linesActual.length !== this.#lineIds.length) {
            throw Error("Wrong number of lines");
        }

        // Build item
        const metadata = { [METADATA_KEY_PERMISSIVENESS]: 0.5 };
        let result: Item;
        if (linesActual[0] && linesActual.length <= 3) {
            // pressed enter with just a first point and a preview line
            // or clicked once then either pressed enter or clicked finish
            result = buildLine()
                .startPosition(linesActual[0].startPosition)
                .endPosition(linesActual[0].endPosition)
                .name("Partial Cover")
                .style(STYLE_PARTIAL_COVER)
                .visible(false)
                .metadata(metadata)
                .locked(true)
                .layer("DRAWING")
                .build();
        } else {
            result = buildCurve()
                .name("Partial Cover")
                .points(
                    linesActual
                        // remove the preview line
                        .slice(undefined, -1)
                        .map((line) => line.startPosition),
                )
                .style({
                    ...STYLE_PARTIAL_COVER,
                    fillColor: COLOR_PARTIAL_COVER,
                    fillOpacity: 0.1,
                    tension: 0,
                })
                .visible(false)
                .metadata(metadata)
                .locked(true)
                .layer("DRAWING")
                .build();
        }

        await Promise.all([
            this.#doLeaveTool(),
            OBR.scene.items.addItems([result]),
        ]);
    };

    readonly #deleteControls = async () => {
        // Clean up local items
        const toDelete = [];
        if (this.#finishLabelId) {
            toDelete.push(this.#finishLabelId);
            this.#finishLabelId = undefined;
        }
        toDelete.push(...this.#lineIds);
        this.#lineIds = [];
        await OBR.scene.local.deleteItems(toDelete);
    };

    onKeyDown = (_context: ToolContext, event: KeyEvent) => {
        switch (event.key) {
            case "Escape":
                return this.#doLeaveTool();
            case "Enter":
                return this.#doFinish();
            case "Control":
                this.#controlDown = true;
                break;
            case "Meta":
                this.#metaDown = true;
                break;
        }
    };

    readonly onKeyUp = (_context: ToolContext, event: KeyEvent) => {
        switch (event.key) {
            case "Control":
                this.#controlDown = false;
                break;
            case "Meta":
                this.#metaDown = false;
        }
    };

    readonly #doLeaveTool = () => {
        void this.#deleteControls();

        // Disable pen tool
        void OBR.tool
            .activateMode(ID_TOOL, ID_TOOL_MODE_PARTIAL_COVER)
            .then(() =>
                OBR.tool.setMetadata(ID_TOOL, {
                    [METADATA_KEY_TOOL_PEN_ENABLED]: false,
                }),
            );
    };

    readonly onDeactivate = () => {
        this.#doLeaveTool();
    };

    // onToolDoubleClick?:
    //     | ((
    //           context: ToolContext,
    //           event: ToolEvent,
    //       ) => boolean | undefined | void | Promise<boolean | undefined | void>)
    //     | undefined;
    // onToolDown?: ((context: ToolContext, event: ToolEvent) => void) | undefined;
    // readonly onToolUp = (context: ToolContext, event: ToolEvent) => {
    //     console.log("up");
    // };
    // onToolDragStart?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
    // onToolDragMove?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
    // onToolDragEnd?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
    // onToolDragCancel?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
}
