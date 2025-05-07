import OBR from "@owlbear-rodeo/sdk";
import {
    METADATA_KEY_ROOM_CHARACTER_PERMISSIVENESS,
    METADATA_KEY_ROOM_CORNER_CONFIG,
} from "../constants";
import type { CornerCountConfigs } from "./usePlayerStorage";

export function setCharacterPermissiveness(characterPermissiveness: number) {
    return OBR.room.setMetadata({
        [METADATA_KEY_ROOM_CHARACTER_PERMISSIVENESS]: characterPermissiveness,
    });
}

export function setCornerCountConfigs(cornerCountConfigs: CornerCountConfigs) {
    return OBR.room.setMetadata({
        [METADATA_KEY_ROOM_CORNER_CONFIG]: cornerCountConfigs,
    });
}
