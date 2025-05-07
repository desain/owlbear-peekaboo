import OBR from "@owlbear-rodeo/sdk";
import { isObject } from "owlbear-utils";
import { METADATA_KEY_ROOM_METADATA } from "../constants";

interface CornerCountConfig {
    /**
     * What label to show based on how many corners are visible.
     */
    readonly label: string;
    /**
     * What color to show based on how many corners are visible.
     */
    readonly color: string;
}
function isCornerCountConfig(config: unknown): config is CornerCountConfig {
    return (
        isObject(config) &&
        "label" in config &&
        typeof config.label === "string" &&
        "color" in config &&
        typeof config.color === "string"
    );
}
type CornerCountConfigs = [
    c0: CornerCountConfig,
    c1: CornerCountConfig,
    c2: CornerCountConfig,
    c3: CornerCountConfig,
    c4: CornerCountConfig,
    c5: CornerCountConfig,
    c6: CornerCountConfig,
];
function isCornerCountConfigs(configs: unknown): configs is CornerCountConfigs {
    return (
        Array.isArray(configs) &&
        configs.length === 7 &&
        configs.every(isCornerCountConfig)
    );
}

export interface RoomMetadata {
    readonly cornerConfigs: CornerCountConfigs;
    /**
     * How much of a vision line characters let through.
     */
    readonly characterPermissiveness: number;
}
export function isRoomMetadata(metadata: unknown): metadata is RoomMetadata {
    return (
        isObject(metadata) &&
        "characterPermissiveness" in metadata &&
        typeof metadata.characterPermissiveness === "number" &&
        "cornerConfigs" in metadata &&
        isCornerCountConfigs(metadata.cornerConfigs)
    );
}

export function setRoomMetadata(roomMetadata: RoomMetadata) {
    return OBR.room.setMetadata({
        [METADATA_KEY_ROOM_METADATA]: roomMetadata,
    });
}
