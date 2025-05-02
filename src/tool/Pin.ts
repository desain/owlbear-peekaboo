import OBR, { Math2, Vector2 } from "@owlbear-rodeo/sdk";
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

export function getPinLocation(pin: Pin): Vector2 {
    if (isLocationPin(pin)) {
        return pin.position;
    } else {
        return Math2.add(pin.cachedPosition, pin.offset);
    }
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
): Promise<[pin: Pin, didChange: boolean]> {
    const snappedPosition = await snapToCenter(newPosition);

    if (oldPin && vector2Equals(snappedPosition, getPinLocation(oldPin))) {
        return [oldPin, false];
    }

    const boundingBoxes = usePlayerStorage.getState().characterBoundingBoxes;
    const targetToken = boundingBoxes.find(([, boundingBox]) =>
        boundingBoxContains(snappedPosition, boundingBox),
    );
    if (targetToken) {
        const [targetId, { center }] = targetToken;
        return [
            {
                id: targetId,
                cachedPosition: center,
                offset: Math2.subtract(snappedPosition, center),
            } satisfies TokenPin,
            true,
        ];
    } else {
        return [
            {
                position: snappedPosition,
            } satisfies LocationPin,
            true,
        ];
    }
}
