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

Lines that pass through partial cover count as half a line for determining the number of unobstructed vision lines that reach a target. For example, if 4 vision lines to a target pass through a partial cover, the target will have the same cover as if 2 lines were unobstructed and 2 were obstructed.

### Removing measurements

Clicking the broom icon in the tool's action bar will remove all active measurements.

### Settings

Clicking the cog icon in the tool's action bar will open its settings.

Settings:

-   **Snap Origins**: Whether the origin point of measurements snaps to the grid.
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

-   two sets of lines, white until the stop point, red after
-   Turf separate imports? https://turfjs.org/docs/api/featureCollection, https://turfjs.org/docs/api/lineIntersect
-   Combine walls? https://turfjs.org/docs/api/combine
-   Figure out how to set different types of partial cover (3/4, etc)
-   Paths as cover - context menu turns them into line strings
-   Debounce room metadata update
-   Cleanup shouldn't destroy active measurements

## License

GNU GPLv3
