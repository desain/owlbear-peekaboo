import CssBaseline from "@mui/material/CssBaseline";
import OBR from "@owlbear-rodeo/sdk";
import { deferCallAll, PluginGate, PluginThemeProvider } from "owlbear-utils";
import React from "react";
import ReactDOM from "react-dom/client";
import "../../assets/style.css";
import { version } from "../../package.json";
import { MESSAGE_CHANNEL } from "../constants";
import { startWatchingContextMenuEnabled } from "../contextmenu/contextmenu";
import { startSyncing } from "../state/startSyncing";
import { startWatchingToolEnabled } from "../tool/tool";
import { Action } from "./Action";

let uninstall: VoidFunction = () => {};

// if (import.meta.hot) {
//     import.meta.hot.accept();
//     import.meta.hot.dispose(() => {
//         console.log("Disposing");
//         uninstall();
//         root?.unmount();
//         root = null;
//         return;
//     });
// }

function installBroadcastListener() {
    return OBR.broadcast.onMessage(MESSAGE_CHANNEL, ({ data }) => {
        console.log("TODO do something with", data);
    });
}

async function installExtension(): Promise<VoidFunction> {
    console.log(`TODO extension name version ${version}`);

    const [storeInitialized, stopSyncing] = startSyncing();
    await storeInitialized;
    const stopWatchingTool = await startWatchingToolEnabled();
    const stopWatchingContextMenu = await startWatchingContextMenuEnabled();
    const uninstallBroadcastListener = installBroadcastListener();

    return deferCallAll(
        () => console.log("Uninstalling TODO extension name"),
        stopSyncing,
        stopWatchingTool,
        stopWatchingContextMenu,
        uninstallBroadcastListener,
    );
}

document.addEventListener("DOMContentLoaded", () => {
    const root = ReactDOM.createRoot(document.getElementById("reactApp")!);
    root.render(
        <React.StrictMode>
            <PluginGate>
                <PluginThemeProvider>
                    <CssBaseline />
                    <Action />
                </PluginThemeProvider>
            </PluginGate>
        </React.StrictMode>,
    );
});

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
