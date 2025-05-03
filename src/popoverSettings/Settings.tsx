import {
    Box,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { version } from "../../package.json";
import { usePlayerStorage } from "../state/usePlayerStorage";

export function Settings() {
    const snapOrigin = usePlayerStorage((store) => store.snapOrigin);
    const setSnapOrigin = usePlayerStorage((store) => store.setSnapOrigin);
    const numGridCorners = usePlayerStorage((store) => store.getGridCorners());

    // Add storage for corner labels
    const cornerLabels = usePlayerStorage((store) => store.cornerLabels);
    const setCornerLabel = usePlayerStorage((store) => store.setCornerLabel);

    // Add storage for corner colors
    const cornerColors = usePlayerStorage((store) => store.cornerColors);
    const setCornerColor = usePlayerStorage((store) => store.setCornerColor);

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
            <FormGroup>
                <FormHelperText sx={{ mb: 2 }}>
                    Labels and colors for visible corners (0–{numGridCorners}
                    ):
                </FormHelperText>
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
                            value={cornerColors[n] ?? "#cccccc"}
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
