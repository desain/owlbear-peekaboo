import DeleteIcon from "@mui/icons-material/Delete";
import { Box, Button, Slider, Stack } from "@mui/material";
import OBR, { type Item } from "@owlbear-rodeo/sdk";
import React, { useEffect, useState } from "react";
import BrickWallIcon from "../../assets/brick-wall.svg";
import BrokenWallIcon from "../../assets/broken-wall.svg";
import {
    METADATA_KEY_SOLIDITY,
    SOLIDITY_FULL_COVER,
    SOLIDITY_NO_COVER,
} from "../constants";
import { isCover, type CoverCandidate } from "../coverTypes";
import { updatePartialCoverStyle } from "../utils";

const SoliditySlider: React.FC<{
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
                src={BrokenWallIcon}
                alt="No Cover"
                sx={{ width: 24, height: 24, opacity: 0.7 }}
            />
            <Slider
                min={SOLIDITY_NO_COVER}
                max={SOLIDITY_FULL_COVER}
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
                aria-label="Solidity"
                valueLabelDisplay="auto"
                valueLabelFormat={(v) =>
                    mixed
                        ? `Mixed, average ${Math.round(v * 100)}% cover`
                        : `${Math.round(v * 100)}% cover`
                }
            />
            <img
                src={BrickWallIcon}
                alt="Full Cover"
                style={{ width: 24, height: 24, opacity: 0.7 }}
            />
        </Stack>
    );
};

function useSelectedItems<ItemType extends Item>(
    isItemType: (item: Item) => item is ItemType,
): ItemType[] {
    const [selection, setSelection] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<ItemType[]>([]);

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
                .then((items) => setSelectedItems(items.filter(isItemType)));
        }
        return OBR.scene.items.onChange((items) =>
            setSelectedItems(
                items
                    .filter(isItemType)
                    .filter((item) => selection.includes(item.id)),
            ),
        );
    }, [isItemType, selection]);

    return selectedItems;
}

export const ContextMenu: React.FC = () => {
    const selectedItems = useSelectedItems(isCover);

    if (selectedItems.length === 0) {
        return null;
    }

    // Compute solidity values for all selected items
    const solidityValues = selectedItems.map(
        (item) => item.metadata[METADATA_KEY_SOLIDITY],
    );
    const isMixed = !solidityValues.every((v) => v === solidityValues[0]);
    const averageSolidity =
        solidityValues.reduce((a, b) => a + b, 0) / solidityValues.length;

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
                                METADATA_KEY_SOLIDITY
                            ];
                        });
                    });
                }}
                sx={{ mt: 1 }}
            >
                Remove
            </Button>
            <SoliditySlider
                value={averageSolidity}
                mixed={isMixed}
                onChangeCommitted={(solidity) => {
                    void OBR.scene.items.updateItems(selectedItems, (items) => {
                        items.forEach((item) => {
                            item.metadata[METADATA_KEY_SOLIDITY] = solidity;
                            updatePartialCoverStyle(item);
                        });
                    });
                }}
            />
        </Stack>
    );
};
