import OBR from "@owlbear-rodeo/sdk";
import { deferCallAll } from "owlbear-utils";
import { version } from "../../package.json";
import { startSyncing } from "../state/startSyncing";
import { startWatchingToolEnabled } from "../tool/tool";

let uninstall: VoidFunction = () => {};

// function installBroadcastListener() {
//     return OBR.broadcast.onMessage(MESSAGE_CHANNEL, ({ data }) => {
//     });
// }

async function installExtension(): Promise<VoidFunction> {
    console.log(`Peekaboo version ${version}`);

    const [storeInitialized, stopSyncing] = startSyncing();
    await storeInitialized;
    const stopWatchingTool = await startWatchingToolEnabled();
    // const stopWatchingContextMenu = await startWatchingContextMenuEnabled();
    // const uninstallBroadcastListener = installBroadcastListener();

    return deferCallAll(
        () => console.log("Uninstalling Peekaboo"),
        stopSyncing,
        stopWatchingTool,
        // stopWatchingContextMenu,
        // uninstallBroadcastListener,
    );
}

OBR.onReady(async () => {
    // console.log("onReady");

    if (await OBR.scene.isReady()) {
        // console.log("isReady");
        uninstall = await installExtension();
    }

    OBR.scene.onReadyChange(async (ready) => {
        // console.log("onReadyChange", ready);
        if (ready) {
            uninstall = await installExtension();
        } else {
            uninstall();
            uninstall = () => {};
        }
    });
});
