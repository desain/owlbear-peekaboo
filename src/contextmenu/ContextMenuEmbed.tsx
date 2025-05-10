import DeleteIcon from "@mui/icons-material/Delete";
import { Box, Button, Slider, Stack } from "@mui/material";
import OBR, { isLine } from "@owlbear-rodeo/sdk";
import React, { useEffect, useState } from "react";
import BrickWallIcon from "../../assets/brick-wall.svg";
import BrokenWallIcon from "../../assets/broken-wall.svg";
import { METADATA_KEY_PERMISSIVENESS } from "../constants";
import { isCover, type Cover, type CoverCandidate } from "../coverTypes";
import {
    getPartialCoverColorAndLineStyle,
    getPartialCoverCurveShapeStyle,
} from "../utils";

const PermissivenessSlider: React.FC<{
    value: number;
    mixed: boolean;
    onChangeCommitted: (value: number) => void;
}> = ({ value, mixed, onChangeCommitted }) => {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
        setDisplayValue(value);
    }, [value]);

    return (
        <Stack
            direction="row"
            gap={2}
            alignItems="center"
            justifyContent="center"
            sx={{ width: "100%" }}
        >
            <Box
                component="img"
                src={BrickWallIcon}
                alt="Solid wall"
                sx={{ width: 28, height: 28, opacity: 0.7 }}
            />
            <Slider
                min={0}
                max={1}
                step={0.05}
                value={displayValue}
                onChange={(_e, v) => {
                    setDisplayValue(v);
                }}
                onChangeCommitted={(_e, v) => {
                    onChangeCommitted(v);
                }}
                sx={{
                    flexGrow: 1,
                    ...(mixed && { color: "error.main" }),
                }}
                aria-label="Permissiveness"
                valueLabelDisplay="auto"
                valueLabelFormat={(v) =>
                    mixed
                        ? `Mixed, average ${Math.round(v * 100)}% permeable`
                        : `${Math.round(v * 100)}% permeable`
                }
            />
            <img
                src={BrokenWallIcon}
                alt="Broken wall"
                style={{ width: 28, height: 28, opacity: 0.7 }}
            />
        </Stack>
    );
};

export const ContextMenu: React.FC = () => {
    const [selection, setSelection] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<Cover[]>([]);

    useEffect(() => {
        void OBR.player.getSelection().then((selection) => {
            if (selection) {
                setSelection(selection);
            }
        });
        return OBR.player.onChange((player) => {
            if (player.selection) {
                setSelection(player.selection);
            }
        });
    });

    useEffect(() => {
        if (selection.length > 0) {
            void OBR.scene.items
                .getItems(selection)
                .then((items) => setSelectedItems(items.filter(isCover)));
        }
        return OBR.scene.items.onChange((items) =>
            setSelectedItems(
                items
                    .filter(isCover)
                    .filter((item) => selection.includes(item.id)),
            ),
        );
    }, [selection]);

    if (selectedItems.length === 0) {
        return null;
    }

    // Compute permissiveness values for all selected items
    const permissivenessValues = selectedItems.map(
        (item) => item.metadata[METADATA_KEY_PERMISSIVENESS],
    );
    const isMixed = !permissivenessValues.every(
        (v) => v === permissivenessValues[0],
    );
    const averagePermissiveness =
        permissivenessValues.reduce((a, b) => a + b, 0) /
        permissivenessValues.length;

    return (
        <Stack
            direction={"column"}
            gap={1}
            sx={{ px: 1 }}
            alignItems={"center"}
        >
            <Button
                startIcon={<DeleteIcon />}
                onClick={() => {
                    void OBR.scene.items.updateItems(selectedItems, (items) => {
                        items.forEach((item) => {
                            // SAFETY: All Cover is also CoverCandidate
                            delete (item as CoverCandidate).metadata[
                                METADATA_KEY_PERMISSIVENESS
                            ];
                        });
                    });
                }}
                sx={{ mt: 1 }}
            >
                Remove
            </Button>
            <PermissivenessSlider
                value={averagePermissiveness}
                mixed={isMixed}
                onChangeCommitted={(permissiveness) => {
                    void OBR.scene.items.updateItems(selectedItems, (items) => {
                        items.forEach((item) => {
                            item.metadata[METADATA_KEY_PERMISSIVENESS] =
                                permissiveness;
                            if (isLine(item)) {
                                item.style = {
                                    ...item.style,
                                    ...getPartialCoverColorAndLineStyle(
                                        permissiveness,
                                    ),
                                };
                            } else {
                                item.style = {
                                    ...item.style,
                                    ...getPartialCoverCurveShapeStyle(
                                        permissiveness,
                                    ),
                                };
                            }
                        });
                    });
                }}
            />
        </Stack>
    );
};
