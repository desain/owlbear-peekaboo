import type { Vector2 } from "@owlbear-rodeo/sdk";
import { vi } from "vitest";

// Stolen from https://github.com/itsMapleLeaf/aspects-obr/blob/ffaaf866eedeae033fa08c0f115efcb5f3f91d6e/vitest.setup.ts

vi.mock("@owlbear-rodeo/sdk", () => ({
    Math2: {
        distance: (a: Vector2, b: Vector2) =>
            Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2),
    },
    default: {
        // onReady: vi.fn().mockResolvedValue(undefined),
        // room: {
        //     getMetadata: vi.fn().mockResolvedValue({}),
        //     onMetadataChanged: vi.fn().mockReturnValue(() => {}),
        //     setMetadata: vi.fn().mockResolvedValue(undefined),
        // },
        // player: {
        //     getMetadata: vi.fn().mockResolvedValue({}),
        //     onMetadataChanged: vi.fn().mockReturnValue(() => {}),
        //     setMetadata: vi.fn().mockResolvedValue(undefined),
        //     getId: vi.fn().mockReturnValue("player-id"),
        //     getRole: vi.fn().mockReturnValue("PLAYER"),
        //     getName: vi.fn().mockReturnValue("Test Player"),
        // },
        // party: {
        //     getPlayers: vi.fn().mockResolvedValue([]),
        //     onPlayersChanged: vi.fn().mockReturnValue(() => {}),
        // },
        // assets: {
        //     downloadImages: vi.fn().mockResolvedValue([]),
        // },
    },
}));
