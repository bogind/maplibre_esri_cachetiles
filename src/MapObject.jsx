import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import base_osm_style from './resources/base_style';
import './MapObject.css';
import govmap_MapCacheNational from './resources/govmap_MapCacheNational.json';

import proj4 from 'proj4';
import * as turf from '@turf/turf'


import {getWGSBBFromXYZ, GetGridMetadata, ParseGridMetadata, GetWMTilesInBoundingBox, addTile} from './grid/GridExtract';

//proj4.defs("EPSG:2039","+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=23.772,17.49,17.859,0.3132,1.85274,-1.67299,-5.4262 +units=m +no_defs +type=crs");
// EPSG:6991 definition
// proj4.defs("EPSG:2039","+proj=tmerc +lat_0=31.7343936111111 +lon_0=35.2045169444444 +k=1.0000067 +x_0=219529.584
// +y_0=626907.39 +ellps=GRS80 +units=m +no_defs +type=crs");
// esri wkt tranformation definition wkid 108021
// proj4.defs("EPSG:2039","GEOGTRAN[\"WGS_1984_To_Israel_CoordFrame\",GEOGCS[\"GCS_WGS_1984\",DATUM[\"D_WGS_1984\",SPHEROID[\"WGS_1984\",6378137.0,298.257223563]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],GEOGCS[\"GCS_Israel\",DATUM[\"D_Israel\",SPHEROID[\"GRS_1980\",6378137.0,298.257222101]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],METHOD[\"Coordinate_Frame\"],PARAMETER[\"X_Axis_Translation\",-24.0024],PARAMETER[\"Y_Axis_Translation\",-17.1032],PARAMETER[\"Z_Axis_Translation\",-17.8444],PARAMETER[\"X_Axis_Rotation\",-0.33009],PARAMETER[\"Y_Axis_Rotation\",-1.85269],PARAMETER[\"Z_Axis_Rotation\",1.66969],PARAMETER[\"Scale_Difference\",5.4248],OPERATIONACCURACY[1.0]]")
// From Harel Dan
proj4.defs("EPSG:2039", "+proj=tmerc +lat_0=31.73439361111111 +lon_0=35.20451694444445 +k=1.0000067 +x_0=219529.584 +y_0=626907.39 +ellps=GRS80 +towgs84=-48,55,52,0,0,0,0 +units=m +no_defs")




function UpdateGridTiles(map, tileSourceName, gridMetadata, TileTemplateURL){
    const newZoom = Math.round(map.getZoom());
    const newBounds = map.getBounds();
    // get list of tile x,y,z in bounds for new zoom in web mercator tiling scheme
    const newTiles = GetWMTilesInBoundingBox(newBounds, newZoom);
    MapClearGridSources(map,tileSourceName)
    newTiles.forEach(tileXY => {
        let bbox = getWGSBBFromXYZ(tileXY[0],tileXY[1],newZoom)
        let bbox_turf = turf.bboxPolygon(bbox);
        let bbox_centroid = turf.centroid(bbox_turf);
        let lon = bbox_centroid.geometry.coordinates[0];
        let lat = bbox_centroid.geometry.coordinates[1];
        let tileID = `${tileSourceName}_${newZoom}_${tileXY[0]}_${tileXY[1]}`

        addTile(map,newZoom,lon,lat,gridMetadata,TileTemplateURL,tileID)
    })
}

function MapClearGridSources(map,tileSourceName){
    const style = map.getStyle()
    //const sources = style.sources;
    const layers = style.layers
    layers.forEach(layer => {
        if(layer.source.includes(tileSourceName)){
            map.removeLayer(layer.id)
            map.removeSource(layer.source)
        }
    })
}



window.maplibregl = maplibregl;
window.proj4 = proj4;
window.turf = turf;



export default function MapObject(props){

    const mapContainer = useRef(null);
    const map = useRef(null);
    const [grid, setGrid] = useState(null); 
    const [lng, setLng] = useState(34.71679);
    const [lat, setLat] = useState(32.10118);
    const [zoom, setZoom] = useState(10);
    const tileSourceName = 'tile';
    //const serviceURL = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2MapHeb/MapServer";
    const serviceURL = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2Ortho2022/MapServer"
    const TileTemplateURL = `${serviceURL}/tile/{z}/{y}/{x}`;
    //const TileTemplateURL = govmap_MapCacheNational.TemplateTileURL

    let testPointsGeoJSON = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "name": "testTileCenter"
                },
                "geometry": {
                  "type": "Point",
                  "coordinates": [
                    34.75250244140625,
                    32.05697247580547
                  ]
                }
              },
              {
                "type": "Feature",
                "properties": {
                    "name": "GridOrigin"
                },
                "geometry": {
                  "type": "Point",
                  "coordinates": [
                    34.67256106714605,
                    32.1522102591286
                  ]
                }
              }
            ]
    }


    useEffect(() => {
        if (map.current) return; // initialize map only once
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: base_osm_style,
            center: [lng, lat],
            zoom: zoom
        });
        console.log(map.current)

        const initGrid = async () => {
            const data = await GetGridMetadata(serviceURL);
            setGrid(data);
         }
         initGrid();

        //setGrid(ParseGridMetadata(govmap_MapCacheNational))
        
        map.current.showTileBoundaries = true;

        




       
    });

    useEffect(() => {
        if (grid === null) return; // wait for map to initialize
        console.log(grid)
        
        if(map.current !== null){

            if(grid.headers){
                map.current.transformRequest((url, resourceType) => {
                    if(url.includes(url.split('/')[2])){
                        return {
                            url: url,
                            headers: grid.headers
                        }
                    }
                })
            }

            map.current.on('load', () => {

                UpdateGridTiles(map.current, tileSourceName, grid, TileTemplateURL)

            })
            map.current.on('click', (e) => {
                //addClosestTile(map.current, e.lngLat.lng, e.lngLat.lat, serviceURL, grid);
            });

            map.current.on('moveend', (e) => {
              
                UpdateGridTiles(map.current, tileSourceName, grid, TileTemplateURL)
                
            });

        }

    }, [grid]);


    return (
            <div 
            ref={mapContainer} 
            className="map-container" />
    );

}
