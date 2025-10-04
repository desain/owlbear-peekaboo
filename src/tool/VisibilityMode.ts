import type {
    KeyEvent,
    ToolContext,
    ToolEvent,
    ToolIcon,
    ToolMode,
    Vector2,
} from "@owlbear-rodeo/sdk";
import OBR, { Math2 } from "@owlbear-rodeo/sdk";
import type { ItemApi } from "owlbear-utils";
import {
    createLocalInteraction,
    getId,
    wrapRealInteraction,
} from "owlbear-utils";
import eyeTarget from "../../assets/eye-target.svg";
import {
    ID_TOOL,
    ID_TOOL_MODE_VISIBILITY,
    METADATA_KEY_TOOL_MEASURE_PRIVATE,
} from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { snapToCenter } from "../utils/utils";
import type { ControlItems } from "./ControlItems";
import {
    fixControlItems,
    isControl,
    makeIcon,
    makeInteractionItems,
} from "./ControlItems";
import { getVisibilityPolygons } from "./getVisibilityPolygons";
import type {
    DisplayPreviousDragState,
    DraggingState,
    InitializingDragState,
    ModeState,
} from "./ModeState";
import {
    deleteIcons,
    isDisplayingPreviousDragState,
    isDraggingState,
    isInitializingDragState,
    isRememberPreviousDragState,
    stopDisplayingPreviousDrag,
    stopDragging,
} from "./ModeState";
import type { LocationPin, Pin, TokenPin } from "./Pin";
import {
    getPinLocation,
    isLocationPin,
    isTokenPin,
    movePin,
    updatePin,
} from "./Pin";
import { intersectVisibility, raycast } from "./raycast";

function getIsPrivate(context: ToolContext): boolean {
    return !!context.metadata[METADATA_KEY_TOOL_MEASURE_PRIVATE];
}

function getItemApi(context: ToolContext): ItemApi {
    return getIsPrivate(context) ? OBR.scene.local : OBR.scene.items;
}

function getStartInteraction(context: ToolContext) {
    return getIsPrivate(context) ? createLocalInteraction : wrapRealInteraction;
}

function createPinIcon(pin: Pin): string | null {
    if (isTokenPin(pin)) {
        const icon = makeIcon(pin.cachedPosition);
        void OBR.scene.local.addItems([icon]);
        return icon.id;
    }
    return null;
}

export class VisibilityMode implements ToolMode {
    readonly id = ID_TOOL_MODE_VISIBILITY;
    readonly shortcut = "V";
    readonly cursors = [
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
    readonly icons: ToolIcon[] = [
        {
            icon: eyeTarget,
            label: "Check Visibility",
            filter: {
                activeTools: [ID_TOOL],
            },
        },
    ];

    /**
     * State of tool mode.
     */
    #modeState: ModeState = null;
    /**
     * Whether the meta key is held down.
     */
    #metaDown = false;
    /**
     * Whether the control key is held down.
     */
    #controlDown = false;

    static readonly #getStart = async (event: ToolEvent): Promise<Pin> => {
        let startPosition = event.pointerPosition;
        const snapTo = usePlayerStorage.getState().snapTo;
        if (snapTo !== "disabled") {
            const useCorners = snapTo === "corners";
            const useCenter = snapTo === "center";
            startPosition = await OBR.scene.grid.snapPosition(
                startPosition,
                1.0,
                useCorners,
                useCenter,
            );
        }
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

    static readonly #fixEndIcon = (
        end: Pin,
        state: DisplayPreviousDragState | DraggingState,
    ) => {
        if (isLocationPin(end)) {
            // Remove icon
            if (state.endIconId) {
                void OBR.scene.local.deleteItems([state.endIconId]);
                state.endIconId = null;
            }
        } else {
            // Token pin
            const position = end.cachedPosition;

            // Create or update icon
            if (state.endIconId) {
                void OBR.scene.local.updateItems([state.endIconId], (images) =>
                    images.forEach((image) => {
                        image.position = position;
                    }),
                );
            } else {
                state.endIconId = createPinIcon(end);
            }
        }
    };

    readonly onActivate = async (context: ToolContext) => {
        if (isRememberPreviousDragState(this.#modeState)) {
            const [newStart, newEnd] = await Promise.all([
                updatePin(this.#modeState.start),
                updatePin(this.#modeState.end),
            ]);
            const endCenter = await snapToCenter(getPinLocation(newEnd));
            if (!isRememberPreviousDragState(this.#modeState)) {
                return; // state was changed from underneath us
            }

            const displayItems = makeInteractionItems(
                newStart,
                newEnd,
                endCenter,
            );
            const itemApi = getItemApi(context);
            void itemApi.addItems(displayItems);

            this.#modeState = {
                start: this.#modeState.start,
                end: this.#modeState.end,
                startIconId: createPinIcon(newStart),
                endIconId: createPinIcon(newEnd),
                displayItems,
                itemApi,
            } satisfies DisplayPreviousDragState;
        } else if (this.#modeState === null) {
            // noop - no drag to restore
        } else {
            console.warn(
                "[Peekaboo] onActiviate, expected null or remembering state, got",
                this.#modeState,
            );
        }
    };

    readonly onKeyDown = (_context: ToolContext, event: KeyEvent) => {
        switch (event.key) {
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
                break;
        }
    };

    readonly #shouldSnap = () => !this.#controlDown && !this.#metaDown;

    readonly onToolDragStart = (context: ToolContext, event: ToolEvent) => {
        // console.log("onToolDragStart");
        if (isDisplayingPreviousDragState(this.#modeState)) {
            this.#modeState = stopDisplayingPreviousDrag(
                this.#modeState,
                false,
            );
        }

        if (
            this.#modeState !== null &&
            !isRememberPreviousDragState(this.#modeState)
        ) {
            console.warn(
                "[Peekaboo] onToolDragStart without null/remembering state",
                this.#modeState,
            );
            return;
        }

        this.#modeState = {
            lastPointerPosition: event.pointerPosition,
        } satisfies InitializingDragState;

        void this.#initializeDrag(context, event);
    };

    readonly #initializeDrag = async (
        context: ToolContext,
        event: ToolEvent,
    ) => {
        const [start, [initialEnd, , endCenter]] = await Promise.all([
            VisibilityMode.#getStart(event),
            movePin(null, event.pointerPosition, this.#shouldSnap()),
        ]);

        const visibilityPolygons =
            usePlayerStorage.getState().measureTo === "precise"
                ? await getVisibilityPolygons(start)
                : undefined;

        if (!isInitializingDragState(this.#modeState)) {
            return; // state was changed underneath us
        }

        const controls = makeInteractionItems(start, initialEnd, endCenter);
        const startInteraction = getStartInteraction(context);
        const interaction = await startInteraction<ControlItems>(...controls);

        if (!isInitializingDragState(this.#modeState)) {
            void interaction.keepAndStop([]); // TODO change to using?
            return; // state was changed underneath us
        }

        const lastPointerPosition = this.#modeState.lastPointerPosition;
        this.#modeState = {
            start,
            startIconId: createPinIcon(start),
            end: initialEnd,
            endIconId: null,
            lastUpdatedItems: controls,
            interaction,
            itemApi: getItemApi(context),
            visibilityPolygons,
        } satisfies DraggingState;

        // console.log("initializeDrag done");
        void this.#handleDragEvent(lastPointerPosition);
    };

    readonly onToolDragMove = (_: ToolContext, event: ToolEvent) => {
        // console.log("onToolDragMove");
        if (isInitializingDragState(this.#modeState)) {
            // console.log("onToolDragMove: initializing");
            this.#modeState.lastPointerPosition = event.pointerPosition;
        } else if (isDraggingState(this.#modeState)) {
            // console.log("onToolDragMove: dragging");
            void this.#handleDragEvent(event.pointerPosition);
        } else if (this.#modeState === null) {
            // Likely we're here because the user cleared the drag in the middle of dragging
            return;
        } else {
            console.warn(
                "[Peekaboo] onToolDragMove: expected initializing/dragging/null, got",
                this.#modeState,
            );
        }
    };

    readonly #handleDragEvent = async (newPointerPosition: Vector2) => {
        if (!isDraggingState(this.#modeState)) {
            return; // state was changed from underneath us
        }
        const [newEnd, changedEnd, cellCenter] = await movePin(
            this.#modeState.end,
            newPointerPosition,
            this.#shouldSnap(),
        );
        if (!changedEnd) {
            return;
        }
        if (!isDraggingState(this.#modeState)) {
            return; // state was changed from underneath us
        }
        this.#modeState.end = newEnd;

        const raycastResult = this.#modeState.visibilityPolygons
            ? intersectVisibility(
                  this.#modeState.start,
                  this.#modeState.end,
                  this.#modeState.visibilityPolygons,
              )
            : raycast(this.#modeState.start, this.#modeState.end);

        const lastUpdatedItems = await this.#modeState.interaction.update(
            (items) => {
                fixControlItems(items, raycastResult, cellCenter);
            },
        );
        if (!isDraggingState(this.#modeState)) {
            return; // state was changed from underneath us
        }

        VisibilityMode.#fixEndIcon(newEnd, this.#modeState);
        this.#modeState.lastUpdatedItems = lastUpdatedItems;
    };

    readonly onToolDragCancel = (_: ToolContext, event: ToolEvent) => {
        // console.log("onToolDragCancel");
        void this.#stopCurrentState(event, false);
    };

    readonly onToolDragEnd = (_: ToolContext, event: ToolEvent) => {
        // console.log("onToolDragEnd");
        void this.#stopCurrentState(
            event,
            !usePlayerStorage.getState().hideOnDragStop,
        );
    };

    readonly #stopCurrentState = async (event: ToolEvent, keep: boolean) => {
        if (isInitializingDragState(this.#modeState)) {
            this.#modeState = null;
        } else if (isDraggingState(this.#modeState)) {
            if (keep) {
                await this.#handleDragEvent(event.pointerPosition);
            }
            if (!isDraggingState(this.#modeState)) {
                return; // state was changed from underneath us
            }
            this.#modeState = stopDragging(this.#modeState, keep);
        } else if (this.#modeState === null) {
            return; // we're here because we already cancelled a drag
        } else {
            console.warn(
                "[Peekaboo] stopCurrentState: Expected dragging/initializing, got",
                this.#modeState,
            );
        }
    };

    readonly onDeactivate = () => {
        // console.log("onDeactivate");
        void this.clear(true);
    };

    readonly clear = async (remember: boolean) => {
        if (isDisplayingPreviousDragState(this.#modeState)) {
            await deleteIcons(this.#modeState);
            this.#modeState = stopDisplayingPreviousDrag(
                this.#modeState,
                remember,
            );
        } else if (isDraggingState(this.#modeState)) {
            await deleteIcons(this.#modeState);
            this.#modeState = stopDragging(this.#modeState, false);
        }

        const state = usePlayerStorage.getState();
        await Promise.all([
            OBR.scene.local
                .getItems(isControl)
                .then((items) => items.map(getId))
                .then((ids) => OBR.scene.local.deleteItems(ids)),
            OBR.scene.items
                .getItems(
                    (item) =>
                        isControl(item) &&
                        state.playerId === item.createdUserId,
                )
                .then((items) => items.map(getId))
                .then((ids) => OBR.scene.items.deleteItems(ids)),
        ]);
    };
}
