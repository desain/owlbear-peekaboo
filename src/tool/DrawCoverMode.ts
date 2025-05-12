import type {
    Item,
    KeyEvent,
    Label,
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
import { assertItem } from "owlbear-utils";
import pen from "../../assets/pen.svg";
import {
    DEFAULT_SOLIDITY,
    ID_TOOL,
    ID_TOOL_MODE_PARTIAL_COVER,
    ID_TOOL_MODE_PEN,
    CONTROL_METADATA as METADATA_CONTROL,
    METADATA_KEY_IS_CONTROL,
    METADATA_KEY_SOLIDITY,
    METADATA_KEY_TOOL_PEN_ENABLED,
} from "../constants";
import { isCover } from "../coverTypes";
import { getPartialCoverColor, updatePartialCoverStyle } from "../utils/utils";

function makePreviewLine(start: Vector2, end: Vector2): Line {
    const line = buildLine()
        .name("Peekaboo Cover Builder Line")
        .startPosition(start)
        .endPosition(end)
        .metadata(METADATA_CONTROL)
        .strokeColor(getPartialCoverColor(DEFAULT_SOLIDITY))
        .disableHit(true)
        .locked(true)
        .build();
    return line;
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
                        key: ["metadata", METADATA_KEY_IS_CONTROL],
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
    #finishLabel?: Pick<Label, "id" | "position">;
    /**
     * IDs of local line items. If nonempty, has at least two elements.
     * The last two are always the line going into and out of the mouse position.
     */
    #lineIds: string[] = [];

    readonly activate = async (position: Vector2) => {
        this.#inputPosition = position;
        await OBR.tool.setMetadata(ID_TOOL, {
            [METADATA_KEY_TOOL_PEN_ENABLED]: true,
        });
        await OBR.tool.activateMode(ID_TOOL, ID_TOOL_MODE_PEN);
    };

    readonly onActivate = async () => {
        if (!this.#inputPosition) {
            return;
        }

        const position = await OBR.scene.grid.snapPosition(this.#inputPosition);
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
        this.#finishLabel = { id: label.id, position: label.position };

        // Place the preview lines
        const lineToPointer = makePreviewLine(position, position);
        const loopbackLine = makePreviewLine(position, position);
        this.#lineIds = [lineToPointer.id, loopbackLine.id];

        await OBR.scene.local.addItems([label, lineToPointer, loopbackLine]);
    };

    readonly onToolMove = (_context: ToolContext, event: ToolEvent) => {
        if (this.#finishLabel && event.target?.id === this.#finishLabel?.id) {
            // hovering over the finish label, so show the line back to the origin
            return this.#updatePosition(this.#finishLabel.position);
        } else {
            return this.#updatePosition(event.pointerPosition);
        }
    };

    readonly #updatePosition = async (position: Vector2): Promise<Vector2> => {
        const lineToPointer = this.#lineIds[this.#lineIds.length - 2];
        const loopbackLine = this.#lineIds[this.#lineIds.length - 1];
        if (!lineToPointer || !loopbackLine) {
            // not drawing
            return position;
        }

        const snappedPosition = await OBR.scene.grid.snapPosition(position);

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

    /**
     * Called when we click without moving the mouse between mouse button down and up.
     * Mutally exclusive with onToolDragEnd.
     */
    readonly onToolClick = async (_context: ToolContext, event: ToolEvent) => {
        // console.log("onToolClick");
        const position = await this.#updatePosition(event.pointerPosition);

        if (event.target && event.target.id === this.#finishLabel?.id) {
            void this.#doFinish();
        } else {
            await this.#doAddPoint(position);
        }
    };

    /**
     * Called when we finish clicking and dragging. Mutually exclusive with onToolClick.
     */
    readonly onToolDragEnd = async (
        _context: ToolContext,
        event: ToolEvent,
    ) => {
        // console.log("onToolDragEnd");
        const position = await this.#updatePosition(event.pointerPosition);
        await this.#doAddPoint(position);
    };

    readonly #doAddPoint = async (position: Vector2) => {
        const newLineToPointer = makePreviewLine(position, position);
        this.#lineIds.splice(-1, 0, newLineToPointer.id);
        await OBR.scene.local.addItems([newLineToPointer]);
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
        const solidity = DEFAULT_SOLIDITY;
        const metadata = { [METADATA_KEY_SOLIDITY]: solidity };
        let result: Item;
        if (linesActual[0] && linesActual.length <= 3) {
            // pressed enter with just a first point and a preview line
            // or clicked once then either pressed enter or clicked finish
            result = buildLine()
                .startPosition(linesActual[0].startPosition)
                .endPosition(linesActual[0].endPosition)
                .name("Partial Cover")
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
                .visible(false)
                .metadata(metadata)
                .locked(true)
                .layer("MAP")
                .build();
        }

        assertItem(result, isCover);
        updatePartialCoverStyle(result);

        await Promise.all([
            this.#doLeaveTool(),
            OBR.scene.items.addItems([result]),
        ]);
    };

    readonly #deleteControls = async () => {
        // Clean up local items
        const toDelete = [];
        if (this.#finishLabel) {
            toDelete.push(this.#finishLabel.id);
            this.#finishLabel = undefined;
        }
        toDelete.push(...this.#lineIds);
        this.#lineIds = [];
        await OBR.scene.local.deleteItems(toDelete);
    };

    readonly onKeyDown = (_context: ToolContext, event: KeyEvent) => {
        switch (event.key) {
            case "Escape":
                return this.#doLeaveTool();
            case "Enter":
                return this.#doFinish();
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
}
