import type { Curve, Image, ImageContent, ImageGrid } from "@owlbear-rodeo/sdk";
import OBR, {
    buildImage,
    Math2,
    type Item,
    type KeyEvent,
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
    ID_TOOL_MODE_PARTIAL_OBSTRUCTIONS,
    METADATA_KEY_CURVE_PERMISSIVENESS,
} from "../constants";
import {
    isObstructionPolygonCandidate,
    isSharpObstructionPolygon,
    type ObstructionPolygonCandidate,
} from "../SharpObstructionPolygon";
import { usePlayerStorage } from "../state/usePlayerStorage";
import type { Token } from "../Token";
import { isToken } from "../Token";
import { getCurveWorldPoints } from "../utils";

const ROLES: Role[] = ["GM"];

type HoverState = "add" | "remove";

function getPolygonHoverState(
    polygon: ObstructionPolygonCandidate,
): HoverState {
    return polygon.metadata[METADATA_KEY_CURVE_PERMISSIVENESS] !== undefined
        ? "remove"
        : "add";
}

function getPolygonIconSource(
    polygon: ObstructionPolygonCandidate,
    hoverState?: HoverState,
): string {
    if (hoverState === "add") {
        return window.location.origin + woodenFenceAdd;
    } else if (hoverState === "remove") {
        return window.location.origin + woodenFenceRemove;
    }
    return (
        window.location.origin +
        (isSharpObstructionPolygon(polygon) ? woodenFence : woodenFenceQuestion)
    );
}

function createIconForPolygon(polygon: ObstructionPolygonCandidate): Image {
    const size = 150;

    const imageContent: ImageContent = {
        height: size,
        width: size,
        mime: "image/svg+xml",
        url: getPolygonIconSource(polygon),
    };
    const imageGrid: ImageGrid = {
        dpi: size,
        offset: { x: size / 2, y: size / 2 },
    };
    return buildImage(imageContent, imageGrid)
        .name("Peekaboo Partial Cover Icon")
        .position(Math2.centroid(getCurveWorldPoints(polygon)))
        .scale({ x: 0.6, y: 0.6 })
        .disableHit(true)
        .locked(true)
        .layer("CONTROL")
        .metadata(CONTROL_METADATA)
        .attachedTo(polygon.id)
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
 * Mode which allows the user to designate some polygons as partial obstructions.
 */
export class PartialObstructionMode implements ToolMode {
    readonly id = ID_TOOL_MODE_PARTIAL_OBSTRUCTIONS;
    readonly shortcut = "O";
    readonly icons = [
        {
            icon: woodenFence,
            label: "Create Partial Obstructions",
            filter: {
                activeTools: [ID_TOOL],
                roles: ROLES,
            },
        },
    ];

    readonly cursors = [
        {
            cursor: "pointer",
            filter: {
                target: [
                    {
                        key: "type",
                        value: "CURVE",
                    },
                    {
                        key: ["style", "tension"],
                        value: 0,
                    },
                ],
            },
        },
        {
            cursor: "crosshair",
        },
    ];

    // preventDrag?: ToolModeFilter | undefined;

    /**
     * Polygon/Token ID -> Icon ID
     */
    readonly #iconMap = new Map<string, [iconId: string, isToken: boolean]>();
    /**
     * Unsubscribe from handlers installed while this mode is active.
     */
    #unsubscribe?: VoidFunction;
    /**
     * Info about the polygon we're hovering over, or undefined if we're not hovering.
     */
    #hoveredPolygonId?: string;

    readonly onToolClick = (_context: ToolContext, event: ToolEvent) => {
        void this; // stop complaint about class method without 'this'.
        const target = event.target;
        if (!target) {
            return;
        }

        if (isObstructionPolygonCandidate(target)) {
            if (target.metadata[METADATA_KEY_CURVE_PERMISSIVENESS]) {
                void OBR.scene.items.updateItems([target], ([target]) => {
                    delete target.metadata[METADATA_KEY_CURVE_PERMISSIVENESS];
                });
            } else {
                void OBR.scene.items.updateItems([target], ([target]) => {
                    target.metadata[METADATA_KEY_CURVE_PERMISSIVENESS] = 0.5;
                });
            }
        }
    };
    readonly onToolDoubleClick = (_context: ToolContext, event: ToolEvent) => {
        this.onToolClick(_context, event);
    };

    readonly onToolMove = (_context: ToolContext, event: ToolEvent) => {
        const target = event.target;

        // early exit if we're moving over the same polygon, or over no polygon
        if (target?.id === this.#hoveredPolygonId) {
            return;
        }

        // by here we know that we're changing state, so cleanup prev

        if (this.#hoveredPolygonId) {
            const oldHoveredId = this.#hoveredPolygonId;
            this.#hoveredPolygonId = undefined;
            const [iconId] = this.#iconMap.get(oldHoveredId) ?? [];
            if (iconId) {
                void (async () => {
                    const [polygon] = await OBR.scene.items.getItems<Curve>([
                        oldHoveredId,
                    ]);
                    if (!isObstructionPolygonCandidate(polygon)) {
                        return;
                    }
                    const newUrl = getPolygonIconSource(polygon);
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

        if (target && isObstructionPolygonCandidate(target)) {
            const [iconId] = this.#iconMap.get(target.id) ?? [];
            if (iconId) {
                const newUrl = getPolygonIconSource(
                    target,
                    getPolygonHoverState(target),
                );
                void OBR.scene.local.updateItems<Image>([iconId], ([icon]) => {
                    if (icon) {
                        icon.image.url = newUrl;
                    }
                });
                this.#hoveredPolygonId = target.id;
            } else {
                console.warn("Moving to non-tracked item", target.id);
            }
        }
    };

    onToolDown?: ((context: ToolContext, event: ToolEvent) => void) | undefined;
    onToolUp?: ((context: ToolContext, event: ToolEvent) => void) | undefined;
    onToolDragStart?:
        | ((context: ToolContext, event: ToolEvent) => void)
        | undefined;
    onToolDragMove?:
        | ((context: ToolContext, event: ToolEvent) => void)
        | undefined;
    onToolDragEnd?:
        | ((context: ToolContext, event: ToolEvent) => void)
        | undefined;
    onToolDragCancel?:
        | ((context: ToolContext, event: ToolEvent) => void)
        | undefined;
    onKeyDown?: ((context: ToolContext, event: KeyEvent) => void) | undefined;
    onKeyUp?: ((context: ToolContext, event: KeyEvent) => void) | undefined;

    /**
     * Update all icons.
     *         // TODO fix icon if we're hovering over what we just clicked
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

        const polygons = items.filter(isObstructionPolygonCandidate);
        const tokens = items.filter(isToken);

        // Remove icons for polygons/tokens that should longer exist
        const currentIds = new Set([
            ...polygons.map(getId),
            ...tokens.map(getId),
        ]);
        for (const [id, [iconId, isToken]] of this.#iconMap.entries()) {
            if (!currentIds.has(id) || (isToken && !includeTokens)) {
                toDelete.push(iconId);
                this.#iconMap.delete(id);
            }
        }

        // Add icons for new polygons
        for (const polygon of polygons) {
            const [iconId] = this.#iconMap.get(polygon.id) ?? [];
            if (iconId) {
                const hoverState =
                    this.#hoveredPolygonId === polygon.id
                        ? getPolygonHoverState(polygon)
                        : undefined;
                toUpdate.push([
                    iconId,
                    getPolygonIconSource(polygon, hoverState),
                ]);
            } else {
                const icon = createIconForPolygon(polygon);
                this.#iconMap.set(polygon.id, [icon.id, false]);
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
}
