import {
    Box,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { useRehydrate } from "owlbear-utils";
import { version } from "../../package.json";
import { broadcastSetCharacterPermissiveness } from "../broadcast/broadcast";
import { COLOR_BACKUP } from "../constants";
import { usePlayerStorage } from "../state/usePlayerStorage";

export function Settings() {
    useRehydrate(usePlayerStorage);

    const snapOrigin = usePlayerStorage((store) => store.snapOrigin);
    const setSnapOrigin = usePlayerStorage((store) => store.setSnapOrigin);
    const numGridCorners = usePlayerStorage((store) => store.getGridCorners());

    const cornerLabels = usePlayerStorage((store) => store.cornerLabels);
    const setCornerLabel = usePlayerStorage((store) => store.setCornerLabel);

    const cornerColors = usePlayerStorage((store) => store.cornerColors);
    const setCornerColor = usePlayerStorage((store) => store.setCornerColor);

    const characterPermissiveness = usePlayerStorage(
        (store) => store.characterPermissiveness,
    );

    const contextMenuEnabled = usePlayerStorage(
        (store) => store.contextMenuEnabled,
    );
    const setContextMenuEnabled = usePlayerStorage(
        (store) => store.setContextMenuEnabled,
    );

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
            <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={characterPermissiveness === 0.5}
                            onChange={(e) =>
                                broadcastSetCharacterPermissiveness(
                                    e.target.checked ? 0.5 : 1,
                                )
                            }
                        />
                    }
                    label="Characters are partial obstructions"
                />
                <FormHelperText>
                    If enabled, characters will count as partial obstructions
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
                    If enabled, right-clicking a polygon or line will show a
                    menu to convert it into a partial obstruction.
                </FormHelperText>
            </FormGroup>
            <FormGroup>
                <Typography sx={{ mb: 2 }}>
                    Labels and colors for visible corners (0–{numGridCorners}
                    ):
                </Typography>
                {[...Array(numGridCorners + 1).keys()].map((n) => (
                    <Box
                        key={n}
                        sx={{ display: "flex", alignItems: "center", mb: 1 }}
                    >
                        <TextField
                            label={`${n} visible corner${n !== 1 ? "s" : ""}`}
                            value={cornerLabels[n] ?? ""}
                            onChange={(e) => setCornerLabel(n, e.target.value)}
                            size="small"
                            fullWidth
                            sx={{ mr: 1 }}
                        />
                        <input
                            type="color"
                            value={cornerColors[n] ?? COLOR_BACKUP}
                            onChange={(e) => setCornerColor(n, e.target.value)}
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
                    These labels and colors will be shown based on how many
                    corners of a target square are visible (e.g., "half cover",
                    "3/4 cover").
                </FormHelperText>
            </FormGroup>
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
