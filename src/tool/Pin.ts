import OBR, { Math2, Vector2 } from "@owlbear-rodeo/sdk";
import { isObject, isVector2 } from "owlbear-utils";

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
