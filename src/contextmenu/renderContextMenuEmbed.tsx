import { CssBaseline } from "@mui/material";
import OBR from "@owlbear-rodeo/sdk";
import { PluginGate, PluginThemeProvider } from "owlbear-utils";
import React from "react";
import ReactDOM from "react-dom/client";
import "../../assets/style.css";
import { startSyncing } from "../state/startSyncing";
import { ContextMenu } from "./ContextMenuEmbed";

OBR.onReady(() => {
    void startSyncing();
});

document.addEventListener("DOMContentLoaded", () => {
    const root = ReactDOM.createRoot(document.getElementById("reactApp")!);
    root.render(
        <React.StrictMode>
            <PluginGate>
                <PluginThemeProvider>
                    <CssBaseline />
                    <ContextMenu />
                </PluginThemeProvider>
            </PluginGate>
        </React.StrictMode>,
    );
});
