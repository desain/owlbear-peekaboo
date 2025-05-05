import OBR from "@owlbear-rodeo/sdk";
import { complain } from "owlbear-utils";
import { CHANNEL_MESSAGES } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";

interface SetPermissivenessMessage {
    characterPermissiveness: number;
}
function isSetPermissivenessMessage(
    message: unknown,
): message is SetPermissivenessMessage {
    return (
        typeof message === "object" &&
        message !== null &&
        "characterPermissiveness" in message &&
        typeof message.characterPermissiveness === "number"
    );
}

export function broadcastSetCharacterPermissiveness(
    characterPermissiveness: number,
) {
    return OBR.broadcast.sendMessage(
        CHANNEL_MESSAGES,
        { characterPermissiveness } satisfies SetPermissivenessMessage,
        { destination: "LOCAL" },
    );
}

export function installBroadcastListener() {
    return OBR.broadcast.onMessage(CHANNEL_MESSAGES, ({ data }) => {
        if (isSetPermissivenessMessage(data)) {
            usePlayerStorage
                .getState()
                .setCharacterPermissiveness(data.characterPermissiveness);
        } else {
            complain(`[Peekaboo] unknown message`);
            console.warn(data);
        }
    });
}
