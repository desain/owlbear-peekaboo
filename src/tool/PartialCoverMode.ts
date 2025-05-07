import type {
    Curve,
    Image,
    ImageContent,
    ImageGrid,
    Vector2,
} from "@owlbear-rodeo/sdk";
import OBR, {
    buildImage,
    isCurve,
    isLine,
    isShape,
    Math2,
    type Item,
    type ToolContext,
    type ToolEvent,
    type ToolMode,
} from "@owlbear-rodeo/sdk";
import { deferCallAll, getId, type Role } from "owlbear-utils";
import woodenFenceAdd from "../../assets/wooden-fence-add.svg";
import woodenFenceQuestion from "../../assets/wooden-fence-question.svg";
import woodenFenceRemove from "../../assets/wooden-fence-remove.svg";
import woodenFence from "../../assets/wooden-fence.svg";
import {
    CONTROL_METADATA,
    ID_TOOL,
    ID_TOOL_MODE_PARTIAL_COVER,
    ID_TOOL_MODE_PEN,
    METADATA_KEY_PERMISSIVENESS,
    METADATA_KEY_TOOL_PEN_ENABLED,
} from "../constants";
import type { CoverCandidate } from "../coverTypes";
import {
    isCover,
    isCoverCandidate,
    KEY_FILTERS_COVER_CANDIDATES,
} from "../coverTypes";
import { usePlayerStorage } from "../state/usePlayerStorage";
import type { Token } from "../Token";
import { isToken } from "../Token";
import {
    getCurveWorldPoints,
    getLineWorldPoints,
    getShapeWorldPoints,
    isNonCircleShape,
} from "../utils";

const ROLES: Role[] = ["GM"];

type HoverState = "add" | "remove";

/**
 * @returns Hover state of the given cover item when hovered over.
 */
function getHoverState(item: CoverCandidate): HoverState {
    return item.metadata[METADATA_KEY_PERMISSIVENESS] !== undefined
        ? "remove"
        : "add";
}

function getIconSource(item: CoverCandidate, hoverState?: HoverState): string {
    if (hoverState === "add") {
        return window.location.origin + woodenFenceAdd;
    } else if (hoverState === "remove") {
        return window.location.origin + woodenFenceRemove;
    }
    return (
        window.location.origin +
        (isCover(item) ? woodenFence : woodenFenceQuestion)
    );
}

function getIconPosition(item: CoverCandidate): Vector2 {
    if (isCurve(item)) {
        return Math2.centroid(getCurveWorldPoints(item));
    } else if (isLine(item)) {
        return Math2.centroid(getLineWorldPoints(item));
    } else if (isShape(item)) {
        if (isNonCircleShape(item) && item.shapeType !== "HEXAGON") {
            return Math2.centroid(getShapeWorldPoints(item));
        } else {
            return item.position;
        }
    } else {
        console.error(
            "Unknown cover type, defaulting to icon at item position",
        );
        return (item as Item).position;
    }
}

function createIcon(item: CoverCandidate): Image {
    const size = 150;

    const imageContent: ImageContent = {
        height: size,
        width: size,
        mime: "image/svg+xml",
        url: getIconSource(item),
    };
    const imageGrid: ImageGrid = {
        dpi: size,
        offset: { x: size / 2, y: size / 2 },
    };
    return buildImage(imageContent, imageGrid)
        .name("Peekaboo Partial Cover Icon")
        .position(getIconPosition(item))
        .scale({ x: 0.6, y: 0.6 })
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .metadata(CONTROL_METADATA)
        .attachedTo(item.id)
        .disableAttachmentBehavior([
            "COPY",
            "LOCKED",
            "ROTATION",
            "SCALE",
            "VISIBLE",
        ])
        .build();
}

function createIconForToken(token: Token): Image {
    const size = 150;
    const imageContent: ImageContent = {
        height: size,
        width: size,
        mime: "image/svg+xml",
        url: window.location.origin + woodenFence,
    };
    const imageGrid: ImageGrid = {
        dpi: size,
        offset: { x: size / 2, y: size / 2 },
    };
    return buildImage(imageContent, imageGrid)
        .name("Peekaboo Partial Cover Icon")
        .position(token.position)
        .scale({ x: 0.6, y: 0.6 })
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .metadata(CONTROL_METADATA)
        .attachedTo(token.id)
        .disableAttachmentBehavior([
            "COPY",
            "LOCKED",
            "ROTATION",
            "SCALE",
            "VISIBLE",
        ])
        .build();
}

/**
 * Mode which allows the user to designate some lines/shapes/polygons as partial cover.
 */
export class PartialCoverMode implements ToolMode {
    readonly id = ID_TOOL_MODE_PARTIAL_COVER;
    readonly shortcut = "C";
    readonly icons = [
        {
            icon: woodenFence,
            label: "Create Partial Cover",
            filter: {
                activeTools: [ID_TOOL],
                roles: ROLES,
            },
        },
    ];

    readonly cursors = [
        ...KEY_FILTERS_COVER_CANDIDATES.map((targetFilter) => ({
            cursor: "pointer",
            filter: {
                target: targetFilter,
            },
        })),
        {
            cursor: "crosshair",
        },
    ];

    readonly #handleMapClick: (position: Vector2) => void;
    /**
     * Line/Polygon/Shape/Token ID -> Icon
     */
    readonly #iconMap = new Map<string, [iconId: string, isToken: boolean]>();
    /**
     * Unsubscribe from handlers installed while this mode is active.
     */
    #unsubscribe?: VoidFunction;
    /**
     * Info about the cover item we're hovering over, or undefined if we're not hovering.
     */
    #hoverCoverId?: string;

    constructor(handleMapClick: (position: Vector2) => void) {
        this.#handleMapClick = handleMapClick;
    }

    readonly onActivate = () => {
        const handleNewItems = (items: Item[]) =>
            this.#updateIcons(
                items,
                usePlayerStorage.getState().characterPermissiveness,
            );
        // Subscribe to item and config updates
        const unsubscribeItems = OBR.scene.items.onChange(handleNewItems);
        const unsubscribePermissiveness = usePlayerStorage.subscribe(
            (state) => state.characterPermissiveness,
            (characterPermissiveness) =>
                OBR.scene.items
                    .getItems()
                    .then((items) =>
                        this.#updateIcons(items, characterPermissiveness),
                    ),
        );
        this.#unsubscribe = deferCallAll(
            unsubscribeItems,
            unsubscribePermissiveness,
        );

        // Initial population
        void OBR.scene.items.getItems().then(handleNewItems);
    };

    /**
     * Update all icons.
     * @param items All items in the scene.
     */
    readonly #updateIcons = async (
        items: Item[],
        characterPermissiveness: number,
    ) => {
        const includeTokens = characterPermissiveness !== 1;

        // API call batching
        const toAdd: Image[] = [];
        const toDelete: string[] = [];
        const toUpdate: [iconId: string, imageSource: string][] = [];

        const candidates = items.filter(isCoverCandidate);
        const tokens = items.filter(isToken);

        // Remove icons for cover/tokens that should longer exist
        const currentIds = new Set([
            ...candidates.map(getId),
            ...tokens.map(getId),
        ]);
        for (const [id, [iconId, isToken]] of this.#iconMap.entries()) {
            if (!currentIds.has(id) || (isToken && !includeTokens)) {
                toDelete.push(iconId);
                this.#iconMap.delete(id);
            }
        }

        // Add icons for new cover candidates
        for (const candidate of candidates) {
            const [iconId] = this.#iconMap.get(candidate.id) ?? [];
            if (iconId) {
                const hoverState =
                    this.#hoverCoverId === candidate.id
                        ? getHoverState(candidate)
                        : undefined;
                toUpdate.push([iconId, getIconSource(candidate, hoverState)]);
            } else {
                const icon = createIcon(candidate);
                this.#iconMap.set(candidate.id, [icon.id, false]);
                toAdd.push(icon);
            }
        }

        // Add icons for new tokens
        if (includeTokens) {
            for (const token of tokens) {
                if (!this.#iconMap.has(token.id)) {
                    const icon = createIconForToken(token);
                    this.#iconMap.set(token.id, [icon.id, true]);
                    toAdd.push(icon);
                }
            }
        }

        await Promise.all([
            toAdd.length > 0 ? OBR.scene.local.addItems(toAdd) : null,
            toDelete.length > 0 ? OBR.scene.local.deleteItems(toDelete) : null,
            toUpdate.length > 0
                ? OBR.scene.local.updateItems<Image>(
                      toUpdate.map(([iconId]) => iconId),
                      (icons) =>
                          icons.forEach((icon, i) => {
                              icon.image.url = toUpdate[i][1];
                          }),
                  )
                : null,
        ]);
    };

    readonly onToolMove = (_context: ToolContext, event: ToolEvent) => {
        const target = event.target;

        // early exit if we're moving over the same cover, or over no cover
        if (target?.id === this.#hoverCoverId) {
            return;
        }

        // by here we know that we're changing state, so cleanup prev

        if (this.#hoverCoverId) {
            const oldHoveredId = this.#hoverCoverId;
            this.#hoverCoverId = undefined;
            const [iconId] = this.#iconMap.get(oldHoveredId) ?? [];
            if (iconId) {
                void (async () => {
                    const [cover] = await OBR.scene.items.getItems<Curve>([
                        oldHoveredId,
                    ]);
                    if (!isCoverCandidate(cover)) {
                        return;
                    }
                    const newUrl = getIconSource(cover);
                    await OBR.scene.local.updateItems<Image>(
                        [iconId],
                        ([icon]) => {
                            if (icon) {
                                icon.image.url = newUrl;
                            }
                        },
                    );
                })();
            } else {
                console.warn("Moving away from non-tracked item", oldHoveredId);
            }
        }

        // if we're moving on to a next target, update its icon

        if (target && isCoverCandidate(target)) {
            const [iconId] = this.#iconMap.get(target.id) ?? [];
            if (iconId) {
                const newUrl = getIconSource(target, getHoverState(target));
                void OBR.scene.local.updateItems<Image>([iconId], ([icon]) => {
                    if (icon) {
                        icon.image.url = newUrl;
                    }
                });
                this.#hoverCoverId = target.id;
            } else {
                console.warn("Moving to non-tracked item", target.id);
            }
        }
    };

    readonly onToolClick = (_context: ToolContext, event: ToolEvent) => {
        void this; // stop complaint about class method without 'this'.
        const target = event.target;

        if (target && isCoverCandidate(target)) {
            if (target.metadata[METADATA_KEY_PERMISSIVENESS]) {
                void OBR.scene.items.updateItems([target], ([target]) => {
                    delete target.metadata[METADATA_KEY_PERMISSIVENESS];
                });
            } else {
                void OBR.scene.items.updateItems([target], ([target]) => {
                    target.metadata[METADATA_KEY_PERMISSIVENESS] = 0.5;
                });
            }
        } else {
            // start drawing cover
            this.#handleMapClick(event.pointerPosition);
            void OBR.tool
                .setMetadata(ID_TOOL, { [METADATA_KEY_TOOL_PEN_ENABLED]: true })
                .then(() => OBR.tool.activateMode(ID_TOOL, ID_TOOL_MODE_PEN));
        }
        return false;
    };

    // disable double click to select
    readonly onToolDoubleClick = () => {
        void this;
        return false;
    };

    readonly onDeactivate = () => {
        // Remove all icons
        const iconIds = [...this.#iconMap.values()].map(([iconId]) => iconId);
        if (iconIds.length > 0) {
            void OBR.scene.local.deleteItems(iconIds);
        }
        this.#iconMap.clear();
        // Unsubscribe from updates
        if (this.#unsubscribe) {
            this.#unsubscribe();
            this.#unsubscribe = undefined;
        }
    };

    // preventDrag?: ToolModeFilter | undefined;
    // onToolDown?: ((context: ToolContext, event: ToolEvent) => void) | undefined;
    // onToolUp?: ((context: ToolContext, event: ToolEvent) => void) | undefined;
    // onToolDragStart?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
    // onToolDragMove?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
    // onToolDragEnd?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
    // onToolDragCancel?:
    //     | ((context: ToolContext, event: ToolEvent) => void)
    //     | undefined;
    // onKeyDown?: ((context: ToolContext, event: KeyEvent) => void) | undefined;
    // onKeyUp?: ((context: ToolContext, event: KeyEvent) => void) | undefined;
}
