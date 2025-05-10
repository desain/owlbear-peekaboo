import type { Curve, Item, KeyFilter, Line, Shape } from "@owlbear-rodeo/sdk";
import { isCurve, isLine, isShape } from "@owlbear-rodeo/sdk";
import type { HasParameterizedMetadata } from "owlbear-utils";
import { METADATA_KEY_IS_CONTROL, METADATA_KEY_SOLIDITY } from "./constants";

// General cover

const SMOKE_AND_SPECTRE_IS_VISION_LINE = "com.battle-system.smoke/isVisionLine";

export type CoverCandidate = (Curve | Shape | Line) &
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
        (isCurve(item) || isShape(item) || isLine(item)) &&
        (!(METADATA_KEY_SOLIDITY in item.metadata) ||
            typeof item.metadata[METADATA_KEY_SOLIDITY] === "number") &&
        (!(METADATA_KEY_IS_CONTROL in item.metadata) ||
            item.metadata[METADATA_KEY_IS_CONTROL] === false) &&
        (!(SMOKE_AND_SPECTRE_IS_VISION_LINE in item.metadata) ||
            item.metadata[SMOKE_AND_SPECTRE_IS_VISION_LINE] === false)
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
        isCoverCandidate(item) &&
        METADATA_KEY_SOLIDITY in item.metadata &&
        typeof item.metadata[METADATA_KEY_SOLIDITY] === "number"
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

// POLYGONS

export type CoverPolygonCandidate = Curve & {
    style: {
        tension: 0;
    };
} & CoverCandidate;
const KEY_FILTER_COVER_POLYGON_CANDIDATE: KeyFilter[] = [
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

export type CoverPolygon = CoverPolygonCandidate & Cover;
export function isCoverPolygon(curve: Item): curve is CoverPolygon {
    return isCurve(curve) && curve.style.tension === 0 && isCover(curve);
}

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

// FILTERS

export const KEY_FILTERS_COVER_CANDIDATES: KeyFilter[][] = [
    KEY_FILTER_COVER_LINE_CANDIDATE,
    KEY_FILTER_COVER_POLYGON_CANDIDATE,
    KEY_FILTER_COVER_SHAPE_CANDIDATE,
];
