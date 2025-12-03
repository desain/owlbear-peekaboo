import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
    Box,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormHelperText,
    FormLabel,
    InputLabel,
    Link,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Switch,
    TextField,
    Typography,
} from "@mui/material";
import { produce } from "immer";
import { useRehydrate } from "owlbear-utils";
import { useEffect, useState } from "react";
import { version } from "../../package.json";
import {
    COLOR_BACKUP,
    DEFAULT_SOLIDITY,
    SOLIDITY_NO_COVER,
} from "../constants";
import { setRoomMetadata } from "../state/roomMetadata";
import {
    isMeasureTo,
    isSnapTo,
    usePlayerStorage,
} from "../state/usePlayerStorage";

export function Settings() {
    useRehydrate(usePlayerStorage);

    const snapTo = usePlayerStorage((store) => store.snapTo);
    const setSnapTo = usePlayerStorage((store) => store.setSnapTo);
    const numGridCorners = usePlayerStorage((store) =>
        store.getGridCornerCount(),
    );
    const roomMetadata = usePlayerStorage((store) => store.roomMetadata);
    const contextMenuEnabled = usePlayerStorage(
        (store) => store.contextMenuEnabled,
    );
    const setContextMenuEnabled = usePlayerStorage(
        (store) => store.setContextMenuEnabled,
    );
    const role = usePlayerStorage((store) => store.role);
    const measureTo = usePlayerStorage((store) => store.measureTo);
    const setMeasureTo = usePlayerStorage((store) => store.setMeasureTo);
    const hideOnDragStop = usePlayerStorage((store) => store.hideOnDragStop);
    const setHideOnDragStop = usePlayerStorage(
        (store) => store.setHideOnDragStop,
    );

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
            <Typography
                variant="h6"
                sx={{ mb: 2, display: "flex", alignItems: "center" }}
            >
                Visibility Tool Settings
                <Link
                    href="https://extensions.owlbear.rodeo/peekaboo"
                    title="Peekaboo extension guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        marginLeft: "8px",
                        display: "flex",
                        alignItems: "center",
                        color: "inherit",
                    }}
                >
                    <HelpOutlineIcon fontSize="small" />
                </Link>
            </Typography>
            <FormControl sx={{ mb: 2 }} fullWidth>
                <InputLabel id="snap-to-label">Snap Origins</InputLabel>
                <Select
                    labelId="snap-to-label"
                    value={snapTo}
                    label="Snap Origins"
                    onChange={(e) =>
                        isSnapTo(e.target.value)
                            ? setSnapTo(e.target.value)
                            : null
                    }
                >
                    <MenuItem value="disabled">Disabled</MenuItem>
                    <MenuItem value="center">Cell Center</MenuItem>
                    <MenuItem value="corners">Cell Corners</MenuItem>
                </Select>
                <FormHelperText>
                    Snap the origin of visibility checks to the grid.
                </FormHelperText>
            </FormControl>
            <FormGroup sx={{ mb: 2 }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={!!hideOnDragStop}
                            onChange={(e) =>
                                setHideOnDragStop(e.target.checked)
                            }
                        />
                    }
                    label="Hide results when I stop dragging"
                />
                <FormHelperText>
                    Whether the visibility tool should hide its results when you
                    stop dragging with it. If unset, results will persist until
                    you switch tools or drag again.
                </FormHelperText>
            </FormGroup>
            <FormGroup sx={{ mb: 2 }}>
                <FormControl component="fieldset">
                    <FormLabel component="legend">
                        Measure visibility:
                    </FormLabel>
                    <RadioGroup
                        row
                        value={measureTo}
                        onChange={(e) =>
                            isMeasureTo(e.target.value)
                                ? setMeasureTo(e.target.value)
                                : null
                        }
                        name="measure-to"
                    >
                        <FormControlLabel
                            value="corners"
                            control={<Radio />}
                            label="To cell corners"
                        />
                        <FormControlLabel
                            value="center"
                            control={<Radio />}
                            label="To cell center"
                        />
                        <FormControlLabel
                            value="precise"
                            control={<Radio />}
                            label="Precisely"
                        />
                    </RadioGroup>
                </FormControl>
                <FormHelperText>
                    Choose how to measure visibility - to a specific point or
                    points, or by calculating the exact percentage of the target
                    cell that is visible
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
                                        localRoomMetadata.characterSolidity ===
                                        DEFAULT_SOLIDITY
                                    }
                                    onChange={(e) =>
                                        setLocalRoomMetadata(
                                            produce(
                                                localRoomMetadata,
                                                (roomMetadata) => {
                                                    roomMetadata.characterSolidity =
                                                        e.target.checked
                                                            ? DEFAULT_SOLIDITY
                                                            : SOLIDITY_NO_COVER;
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
                            Labels and colors for visibility:
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
                                    label={
                                        n === 0
                                            ? "Fully blocked"
                                            : n === numGridCorners
                                            ? "Fully visible"
                                            : measureTo === "precise"
                                            ? `${Math.round(
                                                  (n * 100) / numGridCorners,
                                              )}% visible`
                                            : n === 1
                                            ? "1 visible corner"
                                            : `${n} visible corners`
                                    }
                                    value={
                                        localRoomMetadata.cornerConfigs[n]
                                            ?.label ?? ""
                                    }
                                    onChange={(e) =>
                                        setLocalRoomMetadata(
                                            produce(
                                                localRoomMetadata,
                                                (roomMetadata) => {
                                                    const cornerConfig =
                                                        roomMetadata
                                                            .cornerConfigs[n];
                                                    if (cornerConfig) {
                                                        cornerConfig.label =
                                                            e.target.value;
                                                    }
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
                                            ?.color ?? COLOR_BACKUP
                                    }
                                    onChange={(e) =>
                                        setLocalRoomMetadata(
                                            produce(
                                                localRoomMetadata,
                                                (roomMetadata) => {
                                                    const cornerConfig =
                                                        roomMetadata
                                                            .cornerConfigs[n];
                                                    if (cornerConfig) {
                                                        cornerConfig.color =
                                                            e.target.value;
                                                    }
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
                                        borderRadius: "50%", // Make the color input round
                                    }}
                                    title={`Color for ${n} visible corner${
                                        n !== 1 ? "s" : ""
                                    }`}
                                />
                            </Box>
                        ))}
                        <FormHelperText>
                            These labels and colors will be shown based on how
                            much of a target cell is visible (e.g., "half cover"
                            if 2/4 corners are visible, "3/4 cover" if 25% of a
                            cell is visible).
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
