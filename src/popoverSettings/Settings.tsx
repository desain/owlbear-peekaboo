import {
    Box,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { produce } from "immer";
import { useRehydrate } from "owlbear-utils";
import { useEffect, useState } from "react";
import { version } from "../../package.json";
import { COLOR_BACKUP } from "../constants";
import { setRoomMetadata } from "../state/roomMetadata";
import { usePlayerStorage } from "../state/usePlayerStorage";

export function Settings() {
    useRehydrate(usePlayerStorage);

    const snapOrigin = usePlayerStorage((store) => store.snapOrigin);
    const setSnapOrigin = usePlayerStorage((store) => store.setSnapOrigin);
    const numGridCorners = usePlayerStorage((store) => store.getGridCorners());

    const roomMetadata = usePlayerStorage((store) => store.roomMetadata);

    const contextMenuEnabled = usePlayerStorage(
        (store) => store.contextMenuEnabled,
    );
    const setContextMenuEnabled = usePlayerStorage(
        (store) => store.setContextMenuEnabled,
    );

    const role = usePlayerStorage((store) => store.role);

    // debouncing
    const [localRoomMetadata, setLocalRoomMetadata] = useState(roomMetadata);
    // Keep local state in sync if room metadata changes externally
    useEffect(() => {
        setLocalRoomMetadata(roomMetadata);
    }, [roomMetadata]);
    useEffect(() => {
        const applyChange = setTimeout(async () => {
            if (localRoomMetadata !== roomMetadata) {
                await setRoomMetadata(localRoomMetadata);
            }
        }, 1000);
        return () => clearTimeout(applyChange);
    }, [localRoomMetadata, roomMetadata]);

    return (
        <Box sx={{ p: 2, minWidth: 300 }}>
            <Typography variant="h6">Visibility Tool Settings</Typography>
            <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={snapOrigin}
                            onChange={(e) => setSnapOrigin(e.target.checked)}
                        />
                    }
                    label="Snap Origins"
                />
                <FormHelperText>
                    Snap the origin of visibility checks to the grid.
                </FormHelperText>
            </FormGroup>
            {role === "GM" && (
                <>
                    <FormGroup sx={{ mb: 2 }}>
                        <Typography sx={{ mb: 2 }}>
                            Room Settings (GM Only)
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={
                                        localRoomMetadata.characterPermissiveness ===
                                        0.5
                                    }
                                    onChange={(e) =>
                                        setLocalRoomMetadata(
                                            produce(
                                                localRoomMetadata,
                                                (roomMetadata) => {
                                                    roomMetadata.characterPermissiveness =
                                                        e.target.checked
                                                            ? 0.5
                                                            : 1;
                                                },
                                            ),
                                        )
                                    }
                                />
                            }
                            label="Characters are partial cover"
                        />
                        <FormHelperText>
                            If enabled, characters will count as partial cover
                            for visibility.
                        </FormHelperText>
                    </FormGroup>
                    <FormGroup sx={{ mb: 2 }}>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={contextMenuEnabled}
                                    onChange={(e) =>
                                        setContextMenuEnabled(e.target.checked)
                                    }
                                />
                            }
                            label="Enable context menu"
                        />
                        <FormHelperText>
                            If enabled, right-clicking a line or shape will show
                            a menu to convert it into partial cover.
                        </FormHelperText>
                    </FormGroup>
                    <FormGroup>
                        <Typography sx={{ mb: 2 }}>
                            Labels and colors for visible corners (0–
                            {numGridCorners}
                            ):
                        </Typography>
                        {[...Array(numGridCorners + 1).keys()].map((n) => (
                            <Box
                                key={n}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    mb: 1,
                                }}
                            >
                                <TextField
                                    label={`${n} visible corner${
                                        n !== 1 ? "s" : ""
                                    }`}
                                    value={
                                        localRoomMetadata.cornerConfigs[n]
                                            .label ?? ""
                                    }
                                    onChange={(e) =>
                                        setLocalRoomMetadata(
                                            produce(
                                                localRoomMetadata,
                                                (roomMetadata) => {
                                                    roomMetadata.cornerConfigs[
                                                        n
                                                    ].label = e.target.value;
                                                },
                                            ),
                                        )
                                    }
                                    size="small"
                                    fullWidth
                                    sx={{ mr: 1 }}
                                />
                                <input
                                    type="color"
                                    value={
                                        localRoomMetadata.cornerConfigs[n]
                                            .color ?? COLOR_BACKUP
                                    }
                                    onChange={(e) =>
                                        setLocalRoomMetadata(
                                            produce(
                                                localRoomMetadata,
                                                (roomMetadata) => {
                                                    roomMetadata.cornerConfigs[
                                                        n
                                                    ].color = e.target.value;
                                                },
                                            ),
                                        )
                                    }
                                    style={{
                                        width: 36,
                                        height: 36,
                                        border: "none",
                                        background: "none",
                                        padding: 0,
                                        cursor: "pointer",
                                    }}
                                    title={`Color for ${n} visible corner${
                                        n !== 1 ? "s" : ""
                                    }`}
                                />
                            </Box>
                        ))}
                        <FormHelperText>
                            These labels and colors will be shown based on how
                            many corners of a target square are visible (e.g.,
                            "half cover", "3/4 cover").
                        </FormHelperText>
                    </FormGroup>
                </>
            )}
            <Typography
                color="textSecondary"
                variant="subtitle1"
                sx={{ mt: 2 }}
            >
                Peekaboo version {version}
            </Typography>
        </Box>
    );
}
