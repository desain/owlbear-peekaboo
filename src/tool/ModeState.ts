import type { Vector2 } from "@owlbear-rodeo/sdk";
import OBR from "@owlbear-rodeo/sdk";
import type { AbstractInteraction, ItemApi } from "owlbear-utils";
import { getId, isObject } from "owlbear-utils";
import type { ControlItems } from "./ControlItems";
import type { Pin } from "./Pin";

/**
 * State for when we're not displaying, but we remember where the start
 * and end pins were from the last time we did a drag, so we can display
 * the drag again if we need to.
 */
export interface RememberPreviousDragState {
    start: Pin;
    end: Pin;
    wasPrivate: boolean;
}

/**
 * State for when the tool is only displaying a previous drag, but the user is not
 * actively interacting with it.
 */
export interface DisplayPreviousDragState {
    start: Pin;
    end: Pin;
    /**
     * ID of image item used to mark the start pin (if TokenPin).
     */
    startIconId: string | null;

    /**
     * ID of image item used to mark the end pin (if TokenPin).
     */
    endIconId: string | null;
    /**
     * Items displayed when the tool switched back to tool with pins, or finished drag
     */
    displayItems: ControlItems;
    /**
     * API used to manage the above items.
     */
    itemApi: ItemApi;
}

/**
 * State for when the user has started dragging, but we don't have all the UI elements
 * created yet.
 */
export interface InitializingDragState {
    start: Pin;
    /**
     * ID of image item used to mark the start pin (if TokenPin).
     */
    startIconId: string | null;
    lastPointerPosition: Vector2;
}

export interface DraggingState {
    start: Pin;
    /**
     * Location: center of square we're looking at. Plus maybe a pin to a creature
     * at that location.
     */
    end: Pin;
    /**
     * ID of image item used to mark the start pin (if TokenPin).
     */
    startIconId: string | null;

    /**
     * ID of image item used to mark the end pin (if TokenPin).
     */
    endIconId: string | null;
    /**
     * Current state of drag items
     */
    lastUpdatedItems: ControlItems;
    /**
     * Local or remote interaction
     */
    interaction: AbstractInteraction<ControlItems>;
    /**
     * Item API that will be used to persist the items once the drag is done.
     */
    itemApi: ItemApi;
}

/**
 * Finite state machine of states the tool can be in.
 */
export type ModeState =
    | null // Initial state
    | RememberPreviousDragState
    | DisplayPreviousDragState
    | InitializingDragState
    | DraggingState;

export function isRememberPreviousDragState(
    state: ModeState,
): state is RememberPreviousDragState {
    return isObject(state) && "wasPrivate" in state;
}

export function isDisplayingPreviousDragState(
    state: ModeState,
): state is DisplayPreviousDragState {
    return isObject(state) && "displayItems" in state;
}

export async function deleteIcons(
    state: DisplayPreviousDragState | DraggingState | InitializingDragState,
) {
    const toDelete = [];
    if (state.startIconId) {
        toDelete.push(state.startIconId);
    }
    if ("endIconId" in state && state.endIconId) {
        toDelete.push(state.endIconId);
    }
    if (toDelete.length > 0) {
        await OBR.scene.local.deleteItems(toDelete);
    }
}

export function stopDisplayingPreviousDrag(
    state: DisplayPreviousDragState,
): RememberPreviousDragState {
    const toDelete: string[] = state.displayItems.map(getId);
    void state.itemApi.deleteItems(toDelete);
    void deleteIcons(state);

    return {
        start: state.start,
        end: state.end,
        wasPrivate: state.itemApi === OBR.scene.local, // TODO better tracking?
    };
}

export function isInitializingDragState(
    state: ModeState,
): state is InitializingDragState {
    return isObject(state) && "lastPointerPosition" in state;
}

export function stopInitializing(state: InitializingDragState): null {
    void deleteIcons(state);
    return null;
}

export function isDraggingState(state: ModeState): state is DraggingState {
    return isObject(state) && "interaction" in state;
}

export function stopDragging(state: DraggingState, keep: boolean): ModeState {
    const toKeep = keep ? state.lastUpdatedItems : [];
    void state.interaction.keepAndStop(toKeep);
    return keep
        ? ({
              start: state.start,
              end: state.end,
              startIconId: state.startIconId,
              endIconId: state.endIconId,
              displayItems: state.lastUpdatedItems,
              itemApi: state.itemApi,
          } satisfies DisplayPreviousDragState)
        : null;
}
