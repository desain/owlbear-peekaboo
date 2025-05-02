import OBR, {
    Image,
    ImageContent,
    ImageGrid,
    Math2,
    ToolContext,
    ToolEvent,
    ToolMode,
    Vector2,
    buildImage,
} from "@owlbear-rodeo/sdk";
import { ItemApi } from "owlbear-utils";
import eyeTarget from "../../assets/eye-target.svg";

import {
    createLocalInteraction,
    wrapRealInteraction,
} from "../AbstractInteraction";
import {
    ID_TOOL,
    ID_TOOL_MODE_VISIBILITY,
    METADATA_KEY_TOOL_MEASURE_PRIVATE,
} from "../constants";
import { CANCEL_SYMBOL, createGetCheckCancel } from "../utils";
import {
    ControlItems,
    fixControlItems,
    makeInteractionItems,
} from "./ControlItems";
import {
    DisplayPreviousDragState,
    DraggingState,
    InitializingDragState,
    ModeState,
    deleteIcons,
    isDisplayingPreviousDragState,
    isDraggingState,
    isInitializingDragState,
    isRememberPreviousDragState,
    stopDisplayingPreviousDrag,
    stopDragging,
    stopInitializing,
} from "./ModeState";
import {
    LocationPin,
    Pin,
    TokenPin,
    isLocationPin,
    isTokenPin,
    movePin,
    updatePin,
} from "./Pin";
import { doRaycast } from "./raycast";

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
        .build();
}

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

    readonly icons = [
        {
            icon: eyeTarget,
            label: "Check Visibility",
            filter: {
                activeTools: [ID_TOOL],
            },
        },
    ];

    readonly id = ID_TOOL_MODE_VISIBILITY;

    readonly #getCheckCancel = createGetCheckCancel();

    /**
     * State of tool mode.
     */
    #modeState: ModeState = null;

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
            if (!isRememberPreviousDragState(this.#modeState)) {
                return; // state was changed from underneath us
            }

            const displayItems = await makeInteractionItems(newStart, newEnd);
            if (!isRememberPreviousDragState(this.#modeState)) {
                return; // state was changed from underneath us
            }

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

    readonly onToolDragStart = (context: ToolContext, event: ToolEvent) => {
        console.log("onToolDragStart");
        if (isDisplayingPreviousDragState(this.#modeState)) {
            this.#modeState = stopDisplayingPreviousDrag(this.#modeState);
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

        const start = VisibilityMode.#getStart(event);
        this.#modeState = {
            start,
            startIconId: createPinIcon(start),
            lastPointerPosition: event.pointerPosition,
        } satisfies InitializingDragState;

        void this.#initializeDrag(context, event);
    };

    readonly #initializeDrag = async (
        context: ToolContext,
        event: ToolEvent,
    ) => {
        const [initialEnd] = await movePin(null, event.pointerPosition);
        if (!isInitializingDragState(this.#modeState)) {
            return; // state was changed underneath us
        }
        const controls = await makeInteractionItems(
            this.#modeState.start,
            initialEnd,
        );
        if (!isInitializingDragState(this.#modeState)) {
            return; // state was changed underneath us
        }

        const startInteraction = getStartInteraction(context);
        const interaction = await startInteraction<ControlItems>(...controls);
        if (!isInitializingDragState(this.#modeState)) {
            void interaction.keepAndStop([]); // TODO change to using?
            return; // state was changed underneath us
        }

        const lastPointerPosition = this.#modeState.lastPointerPosition;
        this.#modeState = {
            start: this.#modeState.start,
            startIconId: this.#modeState.startIconId,
            end: initialEnd,
            endIconId: null,
            lastUpdatedItems: controls,
            interaction,
            itemApi: getItemApi(context),
        } satisfies DraggingState;

        // console.log("initializeDrag done");
        void this.#handleDragEvent(lastPointerPosition);
    };

    readonly onToolDragMove = (_: ToolContext, event: ToolEvent) => {
        // console.log("onToolDragMove");
        if (isInitializingDragState(this.#modeState)) {
            console.log("onToolDragMove: initializing");
            this.#modeState.lastPointerPosition = event.pointerPosition;
        } else if (isDraggingState(this.#modeState)) {
            console.log("onToolDragMove: dragging");
            void this.#handleDragEvent(event.pointerPosition);
        } else {
            console.warn(
                "[Peekaboo] onToolDragMove: expected initializing or dragging, got",
                this.#modeState,
            );
        }
    };

    readonly #handleDragEvent = async (newPointerPosition: Vector2) => {
        try {
            if (!isDraggingState(this.#modeState)) {
                return; // state was changed from underneath us
            }
            const [newEnd, changedEnd] = await movePin(
                this.#modeState.end,
                newPointerPosition,
            );
            if (!changedEnd) {
                return;
            }
            if (!isDraggingState(this.#modeState)) {
                return; // state was changed from underneath us
            }
            this.#modeState.end = newEnd;

            const checkCancel = this.#getCheckCancel();

            const raycastResult = await doRaycast(
                this.#modeState.start,
                this.#modeState.end,
                checkCancel,
            );
            checkCancel();
            if (!isDraggingState(this.#modeState)) {
                return; // state was changed from underneath us
            }

            const lastUpdatedItems = await this.#modeState.interaction.update(
                (items) => {
                    fixControlItems(items, raycastResult);
                },
            );
            if (!isDraggingState(this.#modeState)) {
                return; // state was changed from underneath us
            }

            VisibilityMode.#fixEndIcon(newEnd, this.#modeState);
            this.#modeState.lastUpdatedItems = lastUpdatedItems;
        } catch (e) {
            if (e === CANCEL_SYMBOL) {
                return;
            } else {
                throw e;
            }
        }
    };

    readonly onToolDragCancel = (_: ToolContext, event: ToolEvent) => {
        console.log("onToolDragCancel");
        void this.#stopCurrentState(event, false);
    };

    readonly onToolDragEnd = (_: ToolContext, event: ToolEvent) => {
        console.log("onToolDragEnd");
        void this.#stopCurrentState(event, true);
    };

    readonly #stopCurrentState = async (event: ToolEvent, keep: boolean) => {
        if (isInitializingDragState(this.#modeState)) {
            this.#modeState = stopInitializing(this.#modeState);
        } else if (isDraggingState(this.#modeState)) {
            if (keep) {
                await this.#handleDragEvent(event.pointerPosition);
            }
            if (!isDraggingState(this.#modeState)) {
                return; // state was changed from underneath us
            }
            this.#modeState = stopDragging(this.#modeState, keep);
        } else {
            console.warn(
                "[Peekaboo] stopCurrentState: Expected dragging/initializing, got",
                this.#modeState,
            );
        }
    };

    readonly onDeactivate = () => {
        console.log("onDeactivate");
        if (isDisplayingPreviousDragState(this.#modeState)) {
            void deleteIcons(this.#modeState);
            this.#modeState = stopDisplayingPreviousDrag(this.#modeState);
        } else if (isDraggingState(this.#modeState)) {
            void deleteIcons(this.#modeState);
            this.#modeState = stopDragging(this.#modeState, false);
        }
    };
}
