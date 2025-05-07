import OBR from "@owlbear-rodeo/sdk";
import { complain } from "owlbear-utils";
import { CHANNEL_MESSAGES } from "../constants";

export function installBroadcastListener() {
    return OBR.broadcast.onMessage(CHANNEL_MESSAGES, () => {
        complain(`[Peekaboo] unknown message`);
    });
}
