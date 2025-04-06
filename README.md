# [Life & Supercontinents](https://szupie.github.io/supercontinents)
An interactive timelapse of Earth’s supercontinents and evolutionary history

[<img src="https://szupie.github.io/portfolio/life-and-supercontinents/assets/devices.png"/>](https://szupie.github.io/supercontinents)


## Development

### External assets

#### Maps
The `master` branch does not include the required raster maps, created by Christopher Scotese. The `production` branch includes the map files and a local copy of the country borders TopoJSON data.

Alternatively, you can grab the maps from the original source:
1. [Download the maps from EarthByte](https://www.earthbyte.org/paleomap-paleoatlas-for-gplates/)
2. Rename the map filenames to correspond to the list in `map-dates.json`
3. Create high- and low-res versions and place them in the `/assets/map-textures/hi-res/` and `/assets/map-textures/lo-res/` folders

#### JS libraries
The `production` branch also includes local copies of the external js libraries so the code can run entirely offline. To recreate the bundled vendor code file, install the npm dependencies and run `npm run rollup`. For convenience, `npm run server` will start a basic HTTP server on port 8080 with cache disabled.


### File structure
#### Data for raster maps (750 mya to present)
- `/assets/data/map-dates.json`: filenames for the texture maps and what year they correspond to
- `/assets/data/craton-label-positions.json`: coordinates for craton labels for each map
#### Data for vector maps (older than 760 mya)
- `/assets/data/craton-shapes.json`: craton shapes in TopoJSON format
- `/assets/data/craton-hints.json`: data about how modern country borders should be displayed over the cratons (list of countries to include, circular boundary to clip countries at, and any Euler rotations necessary to countries)
- `/assets/data/craton-rotations.json`: Euler rotation values for each craton and where to center the globe by default at each snapshot in time
#### Data for both
- `/assets/data/supercontinent-positions.json`: labels for supercontinents (when they should appear, and their positions at each snapshot in time)



## Credits
Maps:
- Raster maps (750 mya to present): [Scotese (2016)](https://www.earthbyte.org/paleomap-paleoatlas-for-gplates/)
- Rodinia: recreated based on Euler rotations by [Evans, D.A.D. (2021)](https://doi.org/10.1016/B978-0-12-818533-9.00006-0)
- Nuna: recreated based on Euler rotations by [Elming, S.-Å., Salminen, J., &amp; Pesonen, L.J. (2021)](https://doi.org/10.1016/b978-0-12-818533-9.00001-1)
- Current day country borders: [World Atlas TopoJSON](https://github.com/topojson/world-atlas/)

Fonts used:
- [Computer Modern](https://checkmyworking.com/cm-web-fonts/) (OFL) by Donald Knuth
- [Philibert](http://osp.kitchen/foundry/philibert/) (OFL) by Open Source Publishing

JS libraries:
- [D3](https://github.com/d3/d3)
- [svg-round-corners](https://github.com/BrunoFenzl/svg-round-corners)
- WebGL globe texture mapping based on [Mars on a WebGL globe](https://bl.ocks.org/Fil/358e889380bfc9d8e4871cc9dc338cf9)
