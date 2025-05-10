# Peekaboo

Owlbear Rodeo extension for checking token visibility. Check which tokens and squares are visible from others, using walls from extensions like Dynamic Fog / Smoke & Spectre.

## Features

-   Adds a new tool to check the visiblity of tokens and grid squares
-   Walls created in other extensions to block vision will block sight lines using the tool
-   Customize the display names and colors for different levels of visibility
-   When switching back to the tool, if the previous visibility check started or ended on a token that's still present, it will update to the token's new position
-   Create partial cover (including characters) that reduce but don't block visibility

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

### Partial Cover

For the GM, the tool also has a mode for creating partial cover. With this mode active, you can click on lines, polygons, and shapes in the map to turn them into partial cover (or click again to unmark them). You can also click on the map to draw a partial cover polygon yourself.

#### Editing Partial Cover

When you right-click on a partial cover object (or select multiple and right-click), a context menu will appear with a slider labeled with a percentage (e.g., "60% permeable").

-   If you select multiple partial cover objects with different permissiveness values, the slider will show the average value and indicate "Mixed".
-   The slider will appear red if the selected objects have mixed values.
-   Drag or click the slider to set the same permissiveness value for all selected items.
-   The permissiveness value controls how much the cover reduces visibility (0% = solid wall, 100% = fully permeable).
-   You can also remove the partial cover status from selected items using the Remove button in the menu.

Lines that pass through partial cover are multiplied by the cover's permeability for the purpose of counting the number of unobstructed vision lines that reach a target. For example, if 4 vision lines to a target pass through a 50% permeable partial cover, the target will have the same cover as if 2 lines were fully unobstructed and 2 were obstructed.

If a line passes through multiple partial cover objects with different permeabilities, only the least permeable instance of partial cover will apply.

### Removing measurements

Clicking the broom icon in the tool's action bar will remove all active measurements.

### Settings

Clicking the cog icon in the tool's action bar will open its settings.

Settings:

-   **Snap Origins**: Whether the origin point of measurements snaps to the grid.
-   **Measure visibility to**: Choose whether to measure visibility to all corners of the target cell, or just the center. This setting is per-user.
-   **Enable Context Menu** (GM only): Turns on a context menu for lines, shapes, and polygons that lets you turn them into partial cover. This menu is only visible to the GM.
-   **Characters are partial cover** (GM only): Sets a room-global setting which causes all tokens to be treated as partial cover. Useful for modeling how half cover works in games like D&D.
-   **Labels and colors** (GM only). Sets room-global settings for how visibility will display.

## Support

If you need support for this extension you can message me in the [Owlbear Rodeo Discord](https://discord.com/invite/u5RYMkV98s) @Nick or open an issue on [GitHub](https://github.com/desain/owlbear-peekaboo/issues).

## Development

After checkout, run `pnpm install`.

## How it Works

This project is a Typescript app.

Icons from https://game-icons.net.

## Building

This project uses [pnpm](https://pnpm.io/) as a package manager.

To install all the dependencies run:

`pnpm install`

To run in a development mode run:

`pnpm dev`

To make a production build run:

`pnpm build`

## To do

-   two sets of lines, white until the stop point, red/yellow after
-   Paths as cover - context menu turns them into line strings, like [dynamic fog](https://github.com/owlbear-rodeo/dynamic-fog/blob/main/src/background/util/PathHelpers.ts)
-   Cleanup shouldn't destroy active measurements. only destroys others public measurements if called by gm. resets tool start and end
-   take color input from utils once utils has it
-   setting for restore previous visibility check when switching to tool: never/always/only on tokens
-   Rename permissiveness to permeability in code

## License

GNU GPLv3
