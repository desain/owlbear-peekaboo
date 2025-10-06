import type {
    Curve,
    Item,
    KeyFilter,
    Line,
    Path,
    Shape,
} from "@owlbear-rodeo/sdk";
import { isCurve, isLine, isPath, isShape } from "@owlbear-rodeo/sdk";
import {
    containsImplies,
    isFalse,
    isNumber,
    type HasParameterizedMetadata,
} from "owlbear-utils";
import { METADATA_KEY_IS_CONTROL, METADATA_KEY_SOLIDITY } from "./constants";

// General cover

const SMOKE_AND_SPECTRE_IS_VISION_LINE = "com.battle-system.smoke/isVisionLine";

export type CoverCandidate = (Curve | Shape | Line | Path) &
    HasParameterizedMetadata<typeof METADATA_KEY_SOLIDITY, number | undefined> &
    HasParameterizedMetadata<
        typeof METADATA_KEY_IS_CONTROL,
        false | undefined
    > &
    HasParameterizedMetadata<
        typeof SMOKE_AND_SPECTRE_IS_VISION_LINE, // Don't allow Smoke and Spectre obstructions to also be partial cover
        false | undefined
    >;

export function isCoverCandidate(item: Item): item is CoverCandidate {
    return (
        (isCurve(item) || isShape(item) || isLine(item) || isPath(item)) &&
        containsImplies(item.metadata, METADATA_KEY_SOLIDITY, isNumber) &&
        containsImplies(item.metadata, METADATA_KEY_IS_CONTROL, isFalse) &&
        containsImplies(
            item.metadata,
            SMOKE_AND_SPECTRE_IS_VISION_LINE,
            isFalse,
        )
    );
}
const KEY_FILTER_COVER_CANDIDATE: KeyFilter[] = [
    {
        key: ["metadata", METADATA_KEY_IS_CONTROL],
        operator: "!=",
        value: true,
    },
    {
        key: ["metadata", SMOKE_AND_SPECTRE_IS_VISION_LINE],
        operator: "!=",
        value: true,
    },
];

export type Cover = CoverCandidate &
    HasParameterizedMetadata<typeof METADATA_KEY_SOLIDITY, number>;

export function isCover(item: Item): item is Cover {
    return (
        METADATA_KEY_SOLIDITY in item.metadata &&
        typeof item.metadata[METADATA_KEY_SOLIDITY] === "number" &&
        isCoverCandidate(item)
    );
}
export const KEY_FILTER_NON_COVER: KeyFilter[] = [
    {
        key: ["metadata", METADATA_KEY_SOLIDITY],
        value: undefined,
    },
];
export const KEY_FILTER_COVER: KeyFilter[] = [
    {
        key: ["metadata", METADATA_KEY_SOLIDITY],
        operator: "!=",
        value: undefined,
    },
];

const KEY_FILTER_COVER_CURVE_CANDIDATE: KeyFilter[] = [
    ...KEY_FILTER_COVER_CANDIDATE,
    {
        key: "type",
        value: "CURVE",
    },
    {
        key: ["style", "tension"],
        value: 0,
    },
];

// LINES AND SHAPES

const KEY_FILTER_COVER_LINE_CANDIDATE: KeyFilter[] = [
    ...KEY_FILTER_COVER_CANDIDATE,
    {
        key: "type",
        value: "LINE",
    },
];

const KEY_FILTER_COVER_SHAPE_CANDIDATE: KeyFilter[] = [
    ...KEY_FILTER_COVER_CANDIDATE,
    {
        key: "type",
        value: "SHAPE",
    },
];

const KEY_FILTER_COVER_PATH_CANDIDATE: KeyFilter[] = [
    ...KEY_FILTER_COVER_CANDIDATE,
    {
        key: "type",
        value: "PATH",
    },
];

// FILTERS

export const KEY_FILTERS_COVER_CANDIDATES: KeyFilter[][] = [
    KEY_FILTER_COVER_LINE_CANDIDATE,
    KEY_FILTER_COVER_CURVE_CANDIDATE,
    KEY_FILTER_COVER_SHAPE_CANDIDATE,
    KEY_FILTER_COVER_PATH_CANDIDATE,
];
