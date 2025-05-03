# Peekaboo

Owlbear Rodeo extension for checking token visibility.

## Features

-   Adds a new tool to check the visiblity of tokens and grid squares
-   Customize the display names and colors for different levels of visibility
-   When switching back to the tool, if the previous visibility check started or ended on a token that's still present, it will update to the token's new position

## How to use

TODO

## Support

If you need support for this extension you can message me in the [Owlbear Rodeo Discord](https://discord.com/invite/u5RYMkV98s) @Nick or open an issue on [GitHub](https://github.com/desain/owlbear-template/issues).

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

-   Snap start when creating it
-   two sets of lines, white until the stop point, red after
-   Add some way to incorporate partial obstacles like tables, so that any visibility line that passes through them isn't counted as full visibility.
    -   Use https://game-icons.net/1x1/lorc/wooden-fence.html
    -   Block every other vision line?
-   Turf separate imports? https://turfjs.org/docs/api/featureCollection, https://turfjs.org/docs/api/lineIntersect
-   Combine walls? https://turfjs.org/docs/api/combine

## License

GNU GPLv3
