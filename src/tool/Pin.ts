import type { Vector2 } from "@owlbear-rodeo/sdk";
import OBR, { Math2 } from "@owlbear-rodeo/sdk";
import { isObject, isVector2 } from "owlbear-utils";
import { usePlayerStorage } from "../state/usePlayerStorage";
import { boundingBoxContains, snapToCenter, vector2Equals } from "../utils";

export interface LocationPin {
    readonly position: Vector2;
}
export function isLocationPin(pin: unknown): pin is LocationPin {
    return isObject(pin) && "position" in pin && isVector2(pin.position);
}
export interface TokenPin {
    /**
     * ID of item the pin is pinned to.
     */
    readonly id: string;
    /**
     * Cached position of item.
     */
    readonly cachedPosition: Vector2;
    /**
     * Offset of pin relative to item.
     */
    readonly offset: Vector2;
}
export function isTokenPin(pin: unknown): pin is TokenPin {
    return (
        isObject(pin) &&
        "id" in pin &&
        typeof pin.id === "string" &&
        "cachedPosition" in pin &&
        isVector2(pin.cachedPosition) &&
        "offset" in pin &&
        isVector2(pin.offset)
    );
}

export type Pin = LocationPin | TokenPin;

export function getPinLocation(pin: Readonly<Pin>): Vector2 {
    if (isLocationPin(pin)) {
        return pin.position;
    } else {
        return Math2.add(pin.cachedPosition, pin.offset);
    }
}

export function getPinId(pin: Readonly<Pin>): string | undefined {
    if (isTokenPin(pin)) {
        return pin.id;
    }
    return undefined;
}

export async function updatePin(pin: Pin): Promise<Pin> {
    if (isLocationPin(pin)) {
        return pin;
    } else {
        const [item] = await OBR.scene.items.getItems([pin.id]);
        if (item) {
            return { ...pin, cachedPosition: item.position } satisfies TokenPin;
        } else {
            // Item was deleted, convert to location pin of last location
            return { position: pin.cachedPosition } satisfies LocationPin;
        }
    }
}

export async function movePin(
    oldPin: Pin | null,
    newPosition: Vector2,
    doSnap: boolean,
): Promise<[pin: Pin, didChange: boolean, cellCenter: Vector2]> {
    const cellCenter = await snapToCenter(newPosition);

    if (doSnap) {
        newPosition = cellCenter;
    }

    if (oldPin && vector2Equals(newPosition, getPinLocation(oldPin))) {
        return [oldPin, false, cellCenter];
    }

    const boundingBoxes = usePlayerStorage.getState().characterBoundingBoxes;
    const targetToken = boundingBoxes.find(([, boundingBox]) =>
        boundingBoxContains(newPosition, boundingBox),
    );
    if (targetToken) {
        const [targetId, { center }] = targetToken;
        return [
            {
                id: targetId,
                cachedPosition: center,
                offset: Math2.subtract(newPosition, center),
            } satisfies TokenPin,
            true,
            cellCenter,
        ];
    } else {
        return [
            {
                position: newPosition,
            } satisfies LocationPin,
            true,
            cellCenter,
        ];
    }
}
