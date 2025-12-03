---
title: Peekaboo
description: Check which tokens and squares are visible from others, using walls from extensions like Dynamic Fog / Smoke & Spectre.
author: desain
image: https://github.com/user-attachments/assets/e3f520fd-e1aa-4904-90a3-e97f8f6d3c45
icon: https://owlbear-peekaboo.pages.dev/logo.svg
learn-more: https://github.com/desain/owlbear-peekaboo
tags:
    - tool
manifest: https://owlbear-peekaboo.pages.dev/manifest.json
---

## Features

-   👀 Adds a new tool to check the visiblity of tokens and grid squares
-   🧱 Walls created in other extensions to block vision will block sight lines using the tool
-   🎨 Customize the display names and colors for different levels of visibility
-   🔄 When switching back to the tool, if the previous visibility check started or ended on a token that's still present, it will update to the token's new position
-   🧙 Create partial cover (including characters) that reduce but don't block visibility

## How to use

### Measuring Visibility

This extension creates a new tool called 'Check Visibility'.

With that tool selected, the default mode lets you check which places are visible from other places. Click on a token or square and drag across the map. Vision lines will update from the source to the corners of the target square.

-   White lines are unobstructed
-   Yellow lines are partially obstructed (see partial cover, below)
-   Red lines are fully obstructed

When switching away from the tool and then back to it, the tool will recall your last measurement.

If you start or end your measurement on a token's space, the tool will move the start or end of your measurement with the token.

You can switch between private and public measuring modes - the private mode is only visible to you, and the public mode can be seen by everyone.

#### Precise mode

When the tool is in 'precise' mode (change this in settings), it will outline the part of the target cell that is visible. Your color and label settings will apply to the percentage of the target cell that is visible.

### Partial Cover

For the GM, the tool also has a mode for creating partial cover. With this mode active, you can click on lines, polygons, and shapes in the map to turn them into partial cover (or click again to unmark them).

#### Drawing Partial Cover

With the partial cover mode active, you can also click on the map to draw a partial cover polygon yourself. When you finish drawing the polygon, it will be locked, so you'll need to select it by double-clicking with the hand tool to edit it (or bring up its context menu by control-right-clicking on it).

#### Editing Partial Cover

When you right-click on a partial cover object (or select multiple and right-click), a context menu will appear with a slider that lets you set how solid that piece of cover is (e.g., "60% cover").

-   If you select multiple partial cover objects with different solidity values, the slider will show the average value and indicate "Mixed".
-   The slider will appear red if the selected objects have mixed values.
-   Drag or click the slider to set the same solidity value for all selected items.
-   The solidity value controls how much the cover reduces visibility (0% = no cover, 100% = solid wall).
-   You can also remove the partial cover status from selected items using the Remove button in the menu.

Lines that pass through partial cover are multiplied by `1 - the cover's solidity` for the purpose of counting the number of unobstructed vision lines that reach a target. For example, if 4 vision lines to a target pass through a 50% solid partial cover, the target will have the same cover as if 2 lines were fully unobstructed and 2 were obstructed.

If a line passes through multiple partial cover objects with different solidities, only the most solid instance of partial cover will apply.

### Removing measurements

Clicking the broom icon in the tool's action bar will remove all your active measurements.

### Settings

Clicking the cog icon in the tool's action bar will open its settings.

Settings:

-   **Snap Origins**: Whether the origin point of measurements snaps to the grid.
-   **Measure visibility**: Choose whether to measure visibility to all corners of the target cell, just the center, or precisely. This setting is per-user.
-   **Enable Context Menu** (GM only): Turns on a context menu for lines, shapes, and polygons that lets you turn them into partial cover. This menu is only visible to the GM.
-   **Characters are partial cover** (GM only): Sets a room-global setting which causes all tokens to be treated as partial cover. Useful for modeling how half cover works in games like D&D.
-   **Labels and colors** (GM only). Sets room-global settings for how visibility will display.

## Support

If you need support for this extension you can message me in the [Owlbear Rodeo Discord](https://discord.com/invite/u5RYMkV98s) @Nick or open an issue on [GitHub](https://github.com/desain/owlbear-peekaboo/issues).