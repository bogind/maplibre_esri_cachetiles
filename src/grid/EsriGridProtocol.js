import {GetGridMetadata, GetClosestLOD, GetGridTilingSchemeXY, GetTileXYFromWGS84,WGSBboxFromTileBbox} from './GridExtract.js';
import maplibregl from 'maplibre-gl';
/**
 * Function to use in maplibregl.addProtocol
 * Should take a tile request and 
 */

maplibregl.addProtocol('esri-grid', function(params, callback){
    const gridMetadata = params.metadata;
    const bounds = WGSBboxFromTileBbox(gridMetadata.fullExtent);
    const crsName = params.crsName;
    const crsDef = params.crsDef;
    const segments = params.url.split('/');
    const [z, x, y] = segments.slice(-3).map(segment => parseInt(segment));
    console.log(params)

    const source = {
        type: 'raster',
        tiles: [`esri-grid://${params.url.split('://')[1]}/{z}/{x}/{y}`],
        tileSize: gridMetadata.tileInfo.cols,
        bounds: bounds,
    }

    return {source}
});
