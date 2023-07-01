import proj4 from 'proj4';
import * as turf from '@turf/turf'
import {getTileBBox} from '@mapbox/whoots-js';

export const WMLODs = [
    {
      "level": 0,
      "resolution": 156543.03392800014,
      "scale": 591657527.591555
    },
    {
      "level": 1,
      "resolution": 78271.51696399994,
      "scale": 295828763.795777
    },
    {
      "level": 2,
      "resolution": 39135.75848200009,
      "scale": 147914381.897889
    },
    {
      "level": 3,
      "resolution": 19567.87924099992,
      "scale": 73957190.948944
    },
    {
      "level": 4,
      "resolution": 9783.93962049996,
      "scale": 36978595.474472
    },
    {
      "level": 5,
      "resolution": 4891.96981024998,
      "scale": 18489297.737236
    },
    {
      "level": 6,
      "resolution": 2445.98490512499,
      "scale": 9244648.868618
    },
    {
      "level": 7,
      "resolution": 1222.992452562495,
      "scale": 4622324.434309
    },
    {
      "level": 8,
      "resolution": 611.4962262813797,
      "scale": 2311162.217155
    },
    {
      "level": 9,
      "resolution": 305.74811314055756,
      "scale": 1155581.108577
    },
    {
      "level": 10,
      "resolution": 152.87405657041106,
      "scale": 577790.554289
    },
    {
      "level": 11,
      "resolution": 76.43702828507324,
      "scale": 288895.277144
    },
    {
      "level": 12,
      "resolution": 38.21851414253662,
      "scale": 144447.638572
    },
    {
      "level": 13,
      "resolution": 19.10925707126831,
      "scale": 72223.819286
    },
    {
      "level": 14,
      "resolution": 9.554628535634155,
      "scale": 36111.909643
    },
    {
      "level": 15,
      "resolution": 4.77731426794937,
      "scale": 18055.954822
    },
    {
      "level": 16,
      "resolution": 2.388657133974685,
      "scale": 9027.977411
    },
    {
      "level": 17,
      "resolution": 1.1943285668550503,
      "scale": 4513.988705
    },
    {
      "level": 18,
      "resolution": 0.5971642835598172,
      "scale": 2256.994353
    },
    {
      "level": 19,
      "resolution": 0.29858214164761665,
      "scale": 1128.497176
    },
    {
      "level": 20,
      "resolution": 0.14929107082380833,
      "scale": 564.248588
    },
    {
      "level": 21,
      "resolution": 0.07464553541190416,
      "scale": 282.124294
    },
    {
      "level": 22,
      "resolution": 0.03732276770595208,
      "scale": 141.062147
    },
    {
      "level": 23,
      "resolution": 0.01866138385297604,
      "scale": 70.5310735
    }
  ]

export function getTileBBoxFromXYZ(x, y, z){
    const bbox = getTileBBox(x, y, z).split(',').map(parseFloat);
    return bbox;
}

export function getWGSBBFromXYZ(x, y, z){
    const bbox = getTileBBoxFromXYZ(x, y, z);
    const bboxWGSSW = proj4('EPSG:3857', 'EPSG:4326', [bbox[0], bbox[1]]);
    const bboxWGSNE = proj4('EPSG:3857', 'EPSG:4326', [bbox[2], bbox[3]]);
    const bbox_wgs = bboxWGSSW.concat(bboxWGSNE);
    return bbox_wgs;
}

export function WGSBboxFromTileBbox(bbox, crs){
    const bboxWGSSW = proj4(crs, 'EPSG:4326', [bbox[0], bbox[1]]);
    const bboxWGSNE = proj4(crs, 'EPSG:4326', [bbox[2], bbox[3]]);
    const bbox_wgs = bboxWGSSW.concat(bboxWGSNE);
    return bbox_wgs;
}



/**
 * 
 * @param {*} serviceURL ArcGIS MapServer URL that has TileInfo in a CRS which is not WebMercator
 * @ example https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2MapHeb/MapServer
 */
export async function GetGridMetadata(serviceURL){
    const url = serviceURL + '?f=pjson';
    const response = await fetch(url);
    const json = await response.json();
    return json;
}

/**
 * Gets LOD with the closest resolution to the given zoom level (zoom level is a level in WMLODs)
 * @param {*} zoomLevel 
 * @param {*} gridMetadata 
 * @returns  
 */
export function GetClosestLOD(zoomLevel, gridMetadata){
    const lods = gridMetadata.tileInfo.lods;
    // find WM lod with the "level" that is the zoom
    const WMLOD = WMLODs.find(lod => lod.level === zoomLevel);

    // find the LOD with the closest resolution to the WMLOD
    const closestLOD = lods.reduce((prev, curr) => {
        return (Math.abs(curr.resolution - WMLOD.resolution) < Math.abs(prev.resolution - WMLOD.resolution) ? curr : prev);
    });

    return closestLOD;
}

export function GetGridTilingSchemeXY(lon, lat, LOD, gridMetadata ){
    const [x, y ] = proj4('EPSG:4326', `EPSG:${gridMetadata.spatialReference.wkid}`, [lon, lat]);
    const tileWidth = gridMetadata.tileInfo.cols;
    const tileHeight = gridMetadata.tileInfo.rows;
    const tileOrigin = gridMetadata.tileInfo.origin;
    
    const tileX = Math.floor((x - tileOrigin.x) / (tileWidth * LOD.resolution) );
    const tileY = Math.floor((tileOrigin.y - y) / (tileHeight * LOD.resolution));
    return [tileX, tileY];
}

export function GetTileXYFromWGS84(lon, lat, gridMetadata){
    const tileWidth = gridMetadata.tileInfo.cols;
    const tileHeight = gridMetadata.tileInfo.rows;
    // use the grids full extent to get the tile origin
    const fullExtent = gridMetadata.fullExtent;
    const tileOrigin = {
        x: fullExtent.xmin,
        y: fullExtent.ymax
    };
    
    const tileX = Math.floor((lon - tileOrigin.x) / tileWidth);
    const tileY = Math.floor((tileOrigin.y - lat) / tileHeight);
    return [tileX, tileY];
}

function getGridTileBBOX(tileX, tileY, LOD, gridMetadata){
    const tileWidth = gridMetadata.tileInfo.cols;
    const tileHeight = gridMetadata.tileInfo.rows;
    const tileOrigin = gridMetadata.tileInfo.origin;
    const xmin = tileOrigin.x + tileX * tileWidth * LOD.resolution;
    const ymax = tileOrigin.y - tileY * tileHeight * LOD.resolution;
    const xmax = xmin + tileWidth * LOD.resolution;
    const ymin = ymax - tileHeight * LOD.resolution;
    return [xmin,ymin,xmax,ymax];
}

function TileBBOXToWGS84(bbox,gridMetadata){
    const bboxWGSSW = proj4(`EPSG:${gridMetadata.spatialReference.wkid}`, 'EPSG:4326', [bbox[0], bbox[1]]);
    const bboxWGSNE = proj4(`EPSG:${gridMetadata.spatialReference.wkid}`, 'EPSG:4326', [bbox[2], bbox[3]]);
    const bbox_wgs = bboxWGSSW.concat(bboxWGSNE);
    return bbox_wgs;
}

function TileBBoxToMapLibreImageBBox(bbox,gridMetadata){
    const wgsBbox = TileBBOXToWGS84(bbox,gridMetadata);
    const imageCoords = [
        [wgsBbox[0], wgsBbox[3]],
        [wgsBbox[2], wgsBbox[3]],
        [wgsBbox[2], wgsBbox[1]],
        [wgsBbox[0], wgsBbox[1]]
    ]

    return imageCoords
}

// get list of x,y tiles in a given WGS84 bbox by given zoom level in web mercator
export function GetWMTilesInBoundingBox(bbox, zoomLevel){

    const boundsSW = proj4('EPSG:4326', 'EPSG:3857', bbox.getSouthWest().toArray());
    const boundsNE = proj4('EPSG:4326', 'EPSG:3857', bbox.getNorthEast().toArray());
    const LOD = WMLODs.find(lod => lod.level === zoomLevel);
    const xmin = boundsSW[0];
    const ymin = boundsSW[1];
    const xmax = boundsNE[0];
    const ymax = boundsNE[1];

    const tileWidth = 256;
    const tileHeight = 256;
    const tileOrigin = {
        x: -20037508.342787,
        y: 20037508.342787
    };
    const tileXMin = Math.floor((xmin - tileOrigin.x) / (tileWidth * LOD.resolution));
    const tileYMin = Math.floor((tileOrigin.y - ymax) / (tileHeight * LOD.resolution));
    const tileXMax = Math.floor((xmax - tileOrigin.x) / (tileWidth * LOD.resolution));
    const tileYMax = Math.floor((tileOrigin.y - ymin) / (tileHeight * LOD.resolution));
    const tiles = [];
    for (let x = tileXMin; x <= tileXMax; x++) {
        for (let y = tileYMin; y <= tileYMax; y++) {
            tiles.push([x, y]);
        }
    }
    return tiles;
}


export function addClosestTile(map, lon, lat, serviceURL, gridMetadata){
    
    const zoomLevel = Math.round(map.getZoom());
    const LOD = GetClosestLOD(zoomLevel, gridMetadata);
    const [tileX, tileY] = GetGridTilingSchemeXY(lon, lat, LOD, gridMetadata);
    const tileURL = `${serviceURL}/tile/${LOD.level}/${tileY}/${tileX}`;
    
    const tileBBox = getGridTileBBOX(tileX, tileY, LOD, gridMetadata);

    const source = map.getSource('tile');
    
    if (source) {
        
        
        source.updateImage({ url: tileURL, coordinates: TileBBoxToMapLibreImageBBox(tileBBox,gridMetadata) });
    } else {
        map.addSource('tile', {
            'type': 'image',
            'url': tileURL,
            'coordinates': TileBBoxToMapLibreImageBBox(tileBBox,gridMetadata)
        });
    }

    if(!map.getLayer('tile')){
        map.addLayer({
            'id': 'tile',
            'type': 'raster',
            'source': 'tile',
            'paint': {
                'raster-opacity': 0.85
            }
        });
    }
    
}

export function addTile(map,zoomLevel,lon,lat,gridMetadata,serviceURL,sourceName){
    const LOD = GetClosestLOD(zoomLevel, gridMetadata);
    const [tileX, tileY] = GetGridTilingSchemeXY(lon, lat, LOD, gridMetadata);
    const tileURL = `${serviceURL}/tile/${LOD.level}/${tileY}/${tileX}`;
    const tileBBox = getGridTileBBOX(tileX, tileY, LOD, gridMetadata);

    const source = map.getSource(sourceName);

    if (source) {
        source.updateImage({ url: tileURL, coordinates: TileBBoxToMapLibreImageBBox(tileBBox,gridMetadata) });
    } else {
        map.addSource(sourceName, {
            'type': 'image',
            'url': tileURL,
            'coordinates': TileBBoxToMapLibreImageBBox(tileBBox,gridMetadata)
        });
    }

    if(!map.getLayer(sourceName)){
        map.addLayer({
            'id': sourceName,
            'type': 'raster',
            'source': sourceName,
            'paint': {
                //'raster-opacity': 0.85
            }
        });
    }
}

