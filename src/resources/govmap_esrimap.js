/// <reference path="../../../../scripts/typings/dojo/dojo.d.ts" />
/// <reference path="../../../../scripts/typings/esri/arcgis-js-api.d.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="../../../../scripts/typings/dojo/dojox.encoding.d.ts" />
/// <reference path="../../../../scripts/typings/dojo/dojo.d.ts" />
/// <reference path="../../../../scripts/typings/ngdialog/ngdialog.d.ts" />
/// <reference path="../../../../scripts/typings/govmap/govmap.d.ts" />
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require",
 "exports", 
 '../../../Modules/common', 
 '../Services/RelativeExtentService', 
 'esri/map',
  'esri/config',
   "esri/geometry/ScreenPoint", 
   "esri/graphic", 
   "esri/layers/TileInfo", 
   "esri/SpatialReference", 
   "dojo/string", 
   "dojox/encoding/digests/MD5", 
   'esri/toolbars/navigation', 
   "esri/symbols/PictureMarkerSymbol",
    "esri/symbols/SimpleFillSymbol", 
    "esri/layers/ArcGISDynamicMapServiceLayer", 
    "esri/layers/LayerDrawingOptions", "esri/layers/TableDataSource", 
    "esri/layers/LayerDataSource", "esri/layers/DynamicLayerInfo", "esri/layers/ImageParameters", "esri/layers/MapImageLayer", "esri/urlUtils"], function (require, exports, common, RelativeExtentService, Map, esriConfig, ScreenPoint, Graphic, TileInfo, SpatialReference, dojoString, dojoMD5, Navigation, PictureMarkerSymbol, SimpleFillSymbol, ArcGISDynamicMapServiceLayer, LayerDrawingOptions, TableDataSource, LayerDataSource, DynamicLayerInfo, ImageParameters, MapImageLayer, urlUtils) {
    var esriMap = (function (_super) {
        __extends(esriMap, _super);
        function esriMap(divId, options, govmapConfig, mapObjects, commonService, baseMap, fullExtent, _require) {
            _super.call(this, divId, options);
            this.loadedMapResourcesPromise = {};
            this.addedOpenSourceLayers = {}; // stores all  added openSource layers data
            this.mapMovedGPSOn = false;
            this.graphicLayersEventsHandle = {};
            this.$q = commonService.mapService.$q;
            this.govmapConfig = govmapConfig;
            this.mapBackgrounds = mapObjects.mapBackgrounds;
            this.relativeExtentService = new RelativeExtentService.RelativeExtentService();
            this.mapResources = mapObjects.mapResources;
            this.nextCustomBgId = 100;
            this.commonService = commonService;
            this.mapDiv = angular.element("#" + divId);
            this.activeBackgrounds = {};
            this.fullExtent = fullExtent;
            this._require = _require;
            this.mapLoadedResources = {};
            this.embedded = false; // todo - should be updated after embedded map will be implemented
            this.dynamicLayerRenderers = {}; //initializing dictionary
            this.gpsMarker = {
                point: null,
                circle: null
            };
            this.geomClickDefer = this.$q.defer();
            this.identifyOnClick = true;
            this.editing = false;
            urlUtils.addProxyRule({
                urlPrefix: govmapConfig.proxyRule,
                proxyUrl: this.commonService.mapService.getUrlWithSchema(govmapConfig.proxyUrl)
            });
           
            esriConfig.defaults.io.urlPrefix = govmapConfig.proxyRule;
            esriConfig.defaults.io.proxyUrl = this.commonService.mapService.getUrlWithSchema(govmapConfig.proxyUrl);
            esriConfig.defaults.io.alwaysUseProxy = true;
            esriConfig.defaults.io.corsDetection = false;
            esriConfig.defaults.io.useCors = true;
            //{
            //    alwaysUseProxy: true,
            //    corsDetection: false
            //};
            var ptrThis = this;
            //init map deferres
            this.mapDeferres = {};
            for (var mDef in common.Common.mapDeferes) {
                var key = parseInt(mDef);
                if (isNaN(key))
                    continue;
                this.mapDeferres[key] = this.$q.defer();
            }
            this.addEvent(common.Common.event.EXTENT_CHANGE, function () {
                try {
                    ptrThis.mapDeferres[common.Common.mapDeferes.EXTENT_CHANGE].promise.then(function () {
                        ptrThis.mapDeferres[common.Common.mapDeferes.EXTENT_CHANGE] = ptrThis.$q.defer();
                    });
                    ptrThis.mapDeferres[common.Common.mapDeferes.EXTENT_CHANGE].resolve();
                }
                catch (e) {
                    console.log(e);
                }
            });
            var map = this;
            this.addEvent(common.Common.event.MAP_LOAD, function () {
                try {
                    map.mapGraphics = new common.Common.Graphics(map); //initializing graphic layers
                }
                catch (e) {
                    console.log(e);
                }
            });
        }
        Object.defineProperty(esriMap.prototype, "mapMarker", {
            get: function () {
                return this._mapMarker;
            },
            set: function (marker) {
                if (marker != undefined)
                    this._mapMarker = marker;
                else
                    this._mapMarker = null;
            },
            enumerable: true,
            configurable: true
        });
        esriMap.prototype.addMapImageLayer = function (imageMaps, id, minScale, maxScale) {
            var pThis = this;
            var mil = new MapImageLayer({
                'id': id,
                'minScale': minScale,
                'maxScale': maxScale,
                'opacity': 0.5
            });
            //   mil["initialExtent"] = imageMaps[0].extent;
            //  mil["fullExtent"]= imageMaps[0].extent;
            mil.suspend();
            var lay = this.addLayer(mil);
            for (var i = 0; i < imageMaps.length; i++) {
                if (i != (imageMaps.length - 1))
                    imageMaps[i].hide();
                mil.addImage(imageMaps[i]);
            }
            return lay;
        };
        esriMap.prototype.addEmptyMapImageLayer = function (id, minScale, maxScale) {
            var mil = new MapImageLayer({
                'id': id,
                'minScale': minScale,
                'maxScale': maxScale,
                'opacity': 0.5
            });
            this.addLayer(mil);
            return mil;
        };
        esriMap.prototype.disableIdentify = function () {
            this.identifyOnClick = false;
        };
        esriMap.prototype.enableIdentify = function () {
            this.identifyOnClick = true;
        };
        esriMap.prototype.addCustomBackground = function (background) {
            if (background.bgName in this.mapBackgrounds.backgrounds)
                return;
            var bgId = background.backgroundID != null ? background.backgroundID : this.nextCustomBgId;
            var name = background.bgName ? background.bgName : background.mapId;
            var caption = background.bgCaption ? background.bgCaption : background.mapName;
            var url = background.url ? background.url : background.tilesURL;
            this.mapBackgrounds.lods[bgId] = background.lods;
            this.mapBackgrounds.backgrounds[name] = {
                bVisibleInMenu: true,
                backgroundID: bgId,
                //backgroundList: [],
                bgOrder: background.bgOrder ? background.bgOrder : Object.keys(this.mapBackgrounds.backgrounds).length + 1,
                cssButton: background.cssButton ? background.cssButton : "orthoBgPhotoChange",
                cssImage: background.cssImage ? background.cssImage : "MapType04",
                imageUrl: background.imageUrl ? background.imageUrl : "",
                dpi: background.dpi,
                //enGroupButtonTitle: null
                //enGroupName: null
                //enMapName: "Aerial Photographies Combined"
                extent: background.extent,
                //groupButtonTitle: null
                //groupId: 999
                //groupName: null
                imageFormat: background.imageFormat,
                //internalMapId: "Combined"
                //lstBackgrounds: null
                mapId: name,
                name: caption,
                origin: background.origin,
                //parentId: -1
                scaleId: bgId,
                tileHeight: background.tileHeight,
                tileWidth: background.tileWidth,
                tilesURL: url,
                isCustom: true
            };
            this.mapBackgrounds.urlMapping[bgId] = name;
            this.setMapBackground(name, true);
            if (bgId == this.nextCustomBgId) {
                this.nextCustomBgId = this.nextCustomBgId + 1;
            }
            this.commonService.mapService.$rootScope.$broadcast('customBackgroundAdded', this.mapBackgrounds.backgrounds[name]);
            var defer = this.$q.defer();
            defer.resolve(this.mapBackgrounds.backgrounds[name]);
            return defer.promise;
        };
        esriMap.prototype.setCenter = function (p1, p2, p3) {
            var mapPoint;
            mapPoint = ((p1 && p1 instanceof common.Common.Point) ? p1 :
                (p1 && ('x' in p1 && 'y' in p1)) ? new common.Common.Point(p1.x, p1.y) : null);
            var level = (p2 || p2 === 0) ? p2 : (p1 && p1.level);
            var marker = p3 || (p1 && p1.marker);
            if (this.commonService.mapService.isUndefinedOrNull(mapPoint) &&
                this.commonService.mapService.isUndefinedOrNull(level)) {
                var defer = this.$q.defer();
                defer.reject;
                return defer.promise;
            }
            if (!this.commonService.mapService.isUndefinedOrNull(mapPoint)) {
                if (marker) {
                    this.setMapMarker(mapPoint.x, mapPoint.y);
                }
                if (!this.commonService.mapService.isUndefinedOrNull(level)) {
                    return this.centerAndZoom(mapPoint, level);
                }
                else {
                    return this.centerAt(mapPoint);
                }
            }
            else if (!this.commonService.mapService.isUndefinedOrNull(level) && this.isLevelInRange(level))
                return this.setLevel(level);
        };
        esriMap.prototype.zoomIn = function (mapPoint) {
            this.setCenter(mapPoint, this.getLevel() + 1);
        };
        esriMap.prototype.zoomOut = function (mapPoint) {
            this.setCenter(mapPoint, this.getLevel() - 1);
        };
        esriMap.prototype.isLevelInRange = function (level) {
            return this.getZoomLevelResolution(level) != -1;
        };
        esriMap.prototype.getCenter = function () {
            return new common.Common.Point({
                "x": parseFloat(((this.extent.xmin + this.extent.xmax) / 2).toFixed(2)),
                "y": parseFloat(((this.extent.ymin + this.extent.ymax) / 2).toFixed(2))
            });
        };
        esriMap.prototype.calculateExtentByCenter = function (p, resolution) {
            var mWidth = (resolution * (this.mapDiv.width() / 2));
            var mHeight = (resolution * (this.mapDiv.height() / 2));
            return new common.Common.Extent({
                xmin: p.x - mWidth,
                ymin: p.y - mHeight,
                xmax: p.x + mWidth,
                ymax: p.y + mHeight,
                spatialReference: { wkid: 2039 }
            });
        };
        esriMap.prototype.calculateExtentByCenterAndSize = function (p, resolution, width, height) {
            var mWidth = (resolution * (width / 2));
            var mHeight = (resolution * (height / 2));
            return new common.Common.Extent({
                xmin: p.x - mWidth,
                ymin: p.y - mHeight,
                xmax: p.x + mWidth,
                ymax: p.y + mHeight,
                spatialReference: { wkid: 2039 }
            });
        };
        esriMap.prototype.zoomToRelativeExtent = function (geometryExtent, sizeToReduce, direction) {
            if (direction === void 0) { direction = common.Common.direction.RIGHT; }
            //Size to reduce in pixel, reduces element size from map extent
            var obj = this.calculateCenterByRelativeExtent(geometryExtent, sizeToReduce, direction);
            if (!obj) {
                var defer = this.$q.defer();
                defer.resolve();
                return defer.promise;
            }
            return this.centerAndZoom(obj.center, obj.level);
        };
        esriMap.prototype.calculateCenterByRelativeExtent = function (geometryExtent, sizeToReduce, direction) {
            if (direction === void 0) { direction = common.Common.direction.RIGHT; }
            var size = {
                width: this.mapDiv.width(),
                height: this.mapDiv.height(),
                sizeToReduce: sizeToReduce
            };
            if (geometryExtent.xmax == geometryExtent.xmin &&
                geometryExtent.ymax == geometryExtent.ymin) {
                var extentPointFactor = 50;
                geometryExtent.xmin = geometryExtent.xmin - extentPointFactor;
                geometryExtent.ymin = geometryExtent.ymin - extentPointFactor;
                geometryExtent.xmax = geometryExtent.xmax + extentPointFactor;
                geometryExtent.ymax = geometryExtent.ymax + extentPointFactor;
            }
            var lods = this.getBackgroundLODs();
            var relativeExtentService = this.relativeExtentService.getInstance(direction);
            relativeExtentService.reCalcMapSize(size);
            var newMapCenter = geometryExtent.getCenter();
            for (var i = lods.length - 1; i >= 0; i--) {
                var cExtent = this.calculateExtentByCenterAndSize(newMapCenter, lods[i].resolution, size.width, size.height);
                if (cExtent.contains(geometryExtent)) {
                    var shifting = lods[i].resolution * sizeToReduce / 2;
                    return {
                        center: relativeExtentService.shitCenterPoint({ center: cExtent.getCenter(), shiftSize: shifting }),
                        level: i
                    };
                }
            }
        };
        esriMap.prototype.getZoomLevelResolution = function (level) {
            var lods = this.__tileInfo.lods;
            return (level in lods) ? lods[level].resolution : -1;
        };
        esriMap.prototype.getBackgroundLODs = function () {
            for (var aBackground in this.activeBackgrounds) {
                var background = this.mapBackgrounds.backgrounds[aBackground];
                return this.mapBackgrounds.lods[background.scaleId];
            }
        };
        esriMap.prototype.getTileUrl = function (level, row, column, layer, baseurl) {
            if (layer.visibleAtMapScale)
                return dojoString.substitute(layer.urlTemplate, ["L" + dojoString.pad(level.toString(), 2, '0'),
                    "R" + dojoString.pad(row.toString(16), 8, '0'),
                    "C" + dojoString.pad(column.toString(16), 8, '0')]);
            return baseurl + "/Images/transparent.png";
        };
        esriMap.prototype.getOpenSourceTileUrl = function (level, row, column, layer, baseurl, parameters) {
            if (parameters == undefined || parameters === null)
                return baseurl + "/Images/transparent.png";
            var query = "";
            if (!(parameters.range == undefined || parameters.range === null)
                && !(parameters.colorSet == undefined || parameters.colorSet === null)) {
                query += parameters.colorSet + "&br=" + parameters.range;
            }
            else if (!(parameters.md5Id == undefined || parameters.md5Id === null)) {
                query += "clr=" + encodeURIComponent(parameters.md5Id);
                if (query.length > 0)
                    query = "&" + query;
            }
            if (!(parameters.WhereTemplate == undefined || parameters.WhereTemplate === null)) {
                query += "&fv=";
                query += parameters.WhereTemplate;
            }
            if (!(parameters.IsGeom == undefined || parameters.IsGeom === null)) {
                query += "&rt=";
                query += parameters.IsGeom;
            }
            if (layer.visibleAtMapScale)
                return dojo.string.substitute(layer.urlTemplate, [layer.getSubDomain(), parameters.layerName, column, row, level, query]);
            return baseurl + "/Images/transparent.png";
        };
        esriMap.prototype.createRenderer = function (parameters) {
            parameters.md5Id = dojoMD5(JSON.stringify(parameters), 1);
            return this.commonService.mapService.createRenderer(parameters);
        };
        esriMap.prototype.getLegend = function (parameters) {
            return this.commonService.mapService.getLegend(parameters);
        };
        esriMap.prototype.addOpenSourceLayer = function (params) {
            var _this = this;
            if (this.commonService.mapService.isUndefinedOrNull(this.openSourceLayers)) {
                return this.commonService.mapService.getOpenSourceLayers().then(function (response) {
                    //debugger
                    _this.openSourceLayers = response;
                    return _this.addOSLayer(params);
                });
            }
            else {
                return this.addOSLayer(params);
            }
        };
        esriMap.prototype.addOSLayer = function (params) {
            var defer = this.$q.defer();
            var layerItem = this.openSourceLayers[params.layerName];
            var layerId = params.md5Id ? params.layerName + "_" + params.md5Id : params.layerId;
            if (this.commonService.mapService.isUndefinedOrNull(layerItem) || this.commonService.mapService.isUndefinedOrNull(layerId)) {
                defer.reject("open source layer name or id is not valid.");
                return defer.promise;
            }
            if (!this.commonService.mapService.isUndefinedOrNull(this.addedOpenSourceLayers) &&
                !this.commonService.mapService.isUndefinedOrNull(this.addedOpenSourceLayers[layerId])) {
                defer.reject("open source layer already added.");
                return defer.promise;
            }
            var lods = this.mapBackgrounds.lods[layerItem.SCALE_ID];
            var tileInfo = new TileInfo({
                "rows": 256,
                "cols": 256,
                "dpi": 96,
                "format": "png24",
                "origin": new common.Common.Point({ "x": -5403700, "y": 7116700, "spatialReference": { "wkid": 2039 } }),
                "spatialReference": new SpatialReference({ "wkid": 2039 }),
                "lods": lods
            });
            var extentObj = { "xmin": -928236.934539916, "ymin": -542763.057923503, "xmax": 1052663.95973824, "ymax": 1452187.09539356, "spatialReference": { "wkid": 2039 } };
            var fullExtent = new common.Common.Extent(extentObj);
            var map = this;
            var options = new common.Common.GovmapWebTiledLayerOptions({
                "id": layerId,
                "tileInfo": tileInfo,
                "initialExtent": fullExtent,
                "fullExtent": fullExtent,
                "visible": true,
                "getUrlFunction": function (level, row, col, layer) { return map.getOpenSourceTileUrl(level, row, col, layer, "localhost/govmap", params); },
                "opacity": layerItem.OPACITY,
                "layerName": params.layerName,
                "rendererId": ("md5Id" in params) ? params.md5Id : undefined,
                "urlTemplate": this.commonService.mapService.getUrlWithSchema(this.govmapConfig.tilerBaseUrl + "/" + this.govmapConfig.tilerHandlerUrl),
                "subDomains": []
            });
            var layer = new common.Common.GovmapWebTiledLayer(options);
            this.addLayer(layer);
            this.addedOpenSourceLayers[layerId] = layer;
            defer.resolve(layer);
            return defer.promise;
        };
        //Find the key in backgrouds table for background request came from url
        esriMap.prototype.getBackgroundIdByUrlId = function (urlId) {
            return (urlId in this.mapBackgrounds.urlMapping) ? this.mapBackgrounds.urlMapping[urlId] : this.mapBackgrounds.urlMapping[(this.commonService.mapService.$rootScope.isDefaultLanguage) ? this.govmapConfig.defaultBackgroundHe : this.govmapConfig.defaultBackgroundEn];
        };
        esriMap.prototype.getBackgroundUrlId = function (bgId) {
            for (var key in this.mapBackgrounds.urlMapping) {
                var value = this.mapBackgrounds.urlMapping[key];
                if (value == bgId)
                    return parseInt(key);
            }
            return 0;
        };
        esriMap.prototype.setMapBackground = function (background, visible) {
            if (this.activeBackgroundId == background)
                return;
            var activeBgScale;
            if (this.activeBackgroundId) {
                var activeBgScaleId = this.getActiveBackground().scaleId;
                var activeBgLods = this.mapBackgrounds.lods[activeBgScaleId];
var z = this.getZoom();
if(activeBgLods[z]){
                activeBgScale = activeBgLods[z].scale;
}
else{
var l = activeBgLods.find(item => item.level ==z);
activeBgScale = l.scale;
}
            }
            var backgroundParams = this.mapBackgrounds.backgrounds[background];
            if (!backgroundParams)
                return;
            var lstBackgrounds = backgroundParams.backgroundList || [background];
            var fullExtent;
            lstBackgrounds = angular.copy(lstBackgrounds).reverse();
            var bValidBackground = false;
            for (var i = 0; i < lstBackgrounds.length; i++) {
                if (lstBackgrounds[i] in this.mapBackgrounds.backgrounds) {
                    bValidBackground = true;
                    break;
                }
            }
            //if background id exists in background list
            if (bValidBackground)
                this.removeActiveBackgrounds();
            else
                return;
            this.activeBackgroundId = background;
            for (var i = 0; i < lstBackgrounds.length; i++) {
                var cBg = this.mapBackgrounds.backgrounds[lstBackgrounds[i]];
                var lods = this.mapBackgrounds.lods[cBg.scaleId];
                var origin = { "x": -5403700, "y": 7116700, "spatialReference": { "wkid": 2039 } };
                var tileInfo = new TileInfo({
                    "rows": cBg.tileWidth,
                    "cols": cBg.tileHeight,
                    "dpi": cBg.dpi,
                    "format": cBg.imageFormat,
                    "origin": new common.Common.Point(origin),
                    "spatialReference": new SpatialReference({ "wkid": 2039 }),
                    "lods": lods
                });
                if (background.toLowerCase() == "none") {
                    this.setMapBackgroundInternalParams(tileInfo);
                    return;
                }
                if (cBg.extent) {
                    var extent = (typeof (cBg.extent) === "string") ? JSON.parse(cBg.extent) : cBg.extent;
                    fullExtent = new common.Common.Extent(extent);
                }
                else
                    fullExtent = this.initialExtent;
                var options = new common.Common.GovmapWebTiledLayerOptions({
                    "id": cBg.mapId,
                    "tileInfo": tileInfo,
                    "initialExtent": this.initialExtent,
                    "fullExtent": fullExtent,
                    "visible": visible,
                    "getUrlFunction": this.getTileUrl,
                    "urlTemplate": this.commonService.mapService.getUrlWithSchema(cBg.tilesURL + "/${0}/${1}/${2}." + cBg.imageFormat.substr(0, 3))
                });
                try {
                    var layer = new common.Common.GovmapWebTiledLayer(options);
                    //setting current active background                
                    this.activeBackgrounds[cBg.mapId] = {};
                    this.activeBackgrounds[cBg.mapId].layer = layer;
                    this.activeBackgrounds[cBg.mapId].urlId = cBg.urlId;
                    this.activeBackgrounds[cBg.mapId].origin = cBg.origin;
                    this.activeBackgrounds[cBg.mapId].originalTileInfo = tileInfo;
                    this.activeBackgrounds[cBg.mapId].cssButton = cBg.cssButton;
                    this.addLayer(layer);
                    this.reorderLayer(layer, 0);
                    this.setMapTileInfo(layer);
                    if (activeBgScale > lods[0].scale) {
                        this.setZoom(lods[0].level);
                    }
                    else if (activeBgScale < lods[lods.length - 1].scale) {
                        this.setZoom(lods[lods.length - 1].level);
                    }
                    if (!this.isPointInExtent(this.getCenter(), fullExtent)) {
                        var point = JSON.parse(cBg.origin);
                        this.setCenter(new common.Common.Point(point.x, point.y));
                    }
                }
                catch (e) {
                }
            }
        };
        esriMap.prototype.isPointInExtent = function (point, extent) {
            return (point.x >= extent.xmin && point.x <= extent.xmax && point.y <= extent.ymax && point.y >= extent.ymin);
        };
        esriMap.prototype.layerScaleLODIndex = function (lods, scale, minScale) {
            var lodIndex = -1;
            for (var i = 0; i < lods.length; i++) {
                if (lods[i].scale == scale) {
                    return -1;
                }
            }
            if (this.__LOD.scale < minScale)
                lodIndex = lods.length - 1;
            else
                lodIndex = 0;
            return lodIndex;
        };
        esriMap.prototype.pointInExtent = function (point, extent) {
            if (point.x >= extent.xmin && point.x <= extent.xmax && point.y <= extent.ymax && point.y >= extent.ymin)
                return true;
            return false;
        };
        esriMap.prototype.setMapBackgroundInternalParams = function (tileInfo) {
            //Overriding private memebers of map to enable different zoom levels on base map
            //if (bOverrideTileInfo) {
            this.__tileInfo = tileInfo;
            //JS 3.4
            this._params.tileInfo = tileInfo;
            this._params.maxZoom = tileInfo.lods.length - 1;
            this._params.minZoom = 0;
            this._params.lods = tileInfo.lods;
            var isLODChanged = false;
            for (var lodIndex in tileInfo.lods) {
                if (tileInfo.lods[lodIndex].scale == this.__LOD.scale) {
                    this.__LOD = this.__tileInfo.lods[lodIndex];
                    isLODChanged = true;
                    break;
                }
            }
            if (!isLODChanged) {
                if (this.__LOD.scale < tileInfo.lods[tileInfo.lods.length - 1].scale)
                    this.__LOD = this.__tileInfo.lods[tileInfo.lods.length - 1];
                if (this.__LOD.scale > tileInfo.lods[0].scale)
                    this.__LOD = this.__tileInfo.lods[0];
            }
        };
        esriMap.prototype.setMapTileInfo_old = function (layer, neworigin) {
            if (neworigin === void 0) { neworigin = this.activeBackgrounds[layer.id].origin; }
            var lodIndex = this.layerScaleLODIndex(layer.tileInfo.lods, this.getScale(), layer.minScale);
            var bZoomToLevel = false;
            if (lodIndex != -1)
                bZoomToLevel = true;
            this.setMapBackgroundInternalParams(layer.tileInfo);
            var x = null;
            var y = null;
            if (this.activeBackgrounds[layer.id].origin != null) {
                var origin = JSON.parse(this.activeBackgrounds[layer.id].origin);
                //checking if map center is in the new background extent, if not we will zoom to the currect center
                if (!this.pointInExtent(this.getCenter(), layer.fullExtent)) {
                    x = origin.x;
                    y = origin.y;
                }
            }
            if (x && y) {
                if (lodIndex != -1)
                    this.centerAndZoom(new common.Common.Point({ "x": x, "y": y }), lodIndex);
                else
                    this.centerAt(new common.Common.Point({ "x": x, "y": y }));
            }
        };
        esriMap.prototype.setMapTileInfo = function (layer, origin) {
            if (origin === void 0) { origin = this.activeBackgrounds[layer.id].origin; }
            var lodIndex = this.layerScaleLODIndex(layer.tileInfo.lods, this.getScale(), layer.minScale);
            var bZoomToLevel = false;
            if (lodIndex != -1)
                bZoomToLevel = true;
            this.setMapBackgroundInternalParams(layer.tileInfo);
            var x = null;
            var y = null;
            if (origin != null) {
                var origin = JSON.parse(origin);
                //checking if map center is in the new background extent, if not we will zoom to the currect center
                if (!this.pointInExtent(this.getCenter(), layer.fullExtent)) {
                    x = origin.x;
                    y = origin.y;
                }
            }
            //else
            //{
            //    var p = this.getCenter();
            //    x = p.x;
            //    y = p.y;
            //}
            if (x && y) {
                if (bZoomToLevel) {
                    this.centerAndZoom(new common.Common.Point({ "x": x, "y": y }), lodIndex);
                }
                else {
                    this.centerAt(new common.Common.Point({ "x": x, "y": y }));
                }
            }
        };
        esriMap.prototype.getMapBackgrounds = function () {
            return this.mapBackgrounds;
        };
        esriMap.prototype.updateActiveBackgroundByUrlId = function (backgroundUrlId) {
            this.activeBackgroundId = this.getBackgroundIdByUrlId(backgroundUrlId);
        };
        esriMap.prototype.removeLayerFromMap = function (layer) {
            if (layer === void 0) { layer = null; }
            if (layer != null) {
                this.removeLayer(layer);
            }
        };
        esriMap.prototype.removeActiveBackgrounds = function () {
            for (var bg in this.activeBackgrounds) {
                this.removeLayer(this.activeBackgrounds[bg].layer);
            }
            this.activeBackgrounds = {};
        };
        esriMap.prototype.getActiveBackgroundId = function () {
            return {
                bgId: this.activeBackgroundId,
                cssButton: this.mapBackgrounds.backgrounds[this.activeBackgroundId].cssButton
            };
        };
        esriMap.prototype.getBackgroundCssById = function (id) {
            return this.mapBackgrounds.backgrounds[id].cssButton;
        };
        esriMap.prototype.getBackgroundCssByUrlId = function (urlId) {
            return this.getBackgroundCssById(this.getBackgroundIdByUrlId(urlId));
        };
        esriMap.prototype.getActiveBackgroundMapName = function () {
            return {
                urlId: this.mapBackgrounds.backgrounds[this.activeBackgroundId].urlId,
                mapName: this.mapBackgrounds.backgrounds[this.activeBackgroundId].mapName
            };
        };
        esriMap.prototype.getActiveBackground = function () {
            return this.mapBackgrounds.backgrounds[this.activeBackgroundId];
        };
        esriMap.prototype.getActiveBackgroundCount = function () {
            var i = 0;
            for (var bg in this.activeBackgrounds) {
                i++;
            }
            return i;
        };
        esriMap.prototype.getVisibleBackgrounds = function () {
            var bgs = new Array();
            for (var bg in this.activeBackgrounds) {
                bgs.push(bg);
            }
            return bgs;
        };
        esriMap.prototype.updateMapResources = function (resources) {
            if (angular.isUndefined(resources))
                return;
            for (var resource in resources) {
                if (resource in this.mapResources)
                    continue;
                this.mapResources[resource] = resources[resource];
            }
        };
        esriMap.prototype.initializeDrawingToolbar = function (drawingToolbar) {
            if (!this.navigationTool)
                this.navigationTool = new Navigation(this);
            this.drawTool = new drawingToolbar(this, this.navigationTool);
        };
        esriMap.prototype.addEvent = function (event, callback) {
            if (!this.eventHandler)
                this.eventHandler = new common.Common.GovmapMapEventHandler(this);
            return this.eventHandler.addEvent(event, callback);
        };
        esriMap.prototype.removeEvent = function (event, handler) {
            if (!this.eventHandler)
                this.eventHandler = new common.Common.GovmapMapEventHandler(this);
            this.eventHandler.removeEvent(event, handler);
        };
        esriMap.prototype.disableAllEvents = function () {
            if (!this.eventHandler)
                this.eventHandler = new common.Common.GovmapMapEventHandler(this);
            this.eventHandler.disableAllEvents();
        };
        esriMap.prototype.enableAllEvents = function () {
            if (!this.eventHandler)
                this.eventHandler = new common.Common.GovmapMapEventHandler(this);
            this.eventHandler.enableAllEvents();
        };
        esriMap.prototype.drawPoint = function (cursor, symbol, showTooltip) {
            var _this = this;
            if (showTooltip === void 0) { showTooltip = true; }
            var thisDefer = this.$q.defer();
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                if (!_this.drawTool)
                    _this.initializeDrawingToolbar(modules.DrawingToolbar);
                if (cursor)
                    _this.setCursorType(cursor);
                if (symbol)
                    _this.drawTool.enableVertexSymbol(symbol);
                _this.drawTool.drawPoint(showTooltip).then(function (result) {
                    thisDefer.resolve(result);
                }, null, function (result) { thisDefer.notify(result); });
            });
            return thisDefer.promise;
        };
        esriMap.prototype.drawPolyline = function (cursor, lineSymbol, showVertexs, showTooltip) {
            var _this = this;
            if (showTooltip === void 0) { showTooltip = true; }
            var thisDefer = this.$q.defer();
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                if (!_this.drawTool)
                    _this.initializeDrawingToolbar(modules.DrawingToolbar);
                if (cursor)
                    _this.setCursorType(cursor);
                if (lineSymbol)
                    _this.drawTool.setDrawSymbology(null, lineSymbol);
                if (showVertexs)
                    _this.drawTool.enableVertexSymbol();
                _this.drawTool.drawPolyline(showTooltip).then(function (result) {
                    thisDefer.resolve(result);
                }, null, function (result) { thisDefer.notify(result); });
            });
            return thisDefer.promise;
        };
        esriMap.prototype.drawPolygon = function (cursor, fillSymbol, outlineSymbol, showVertexs, showTooltip) {
            var _this = this;
            if (showTooltip === void 0) { showTooltip = true; }
            var thisDefer = this.$q.defer();
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                if (!_this.drawTool)
                    _this.initializeDrawingToolbar(modules.DrawingToolbar);
                if (cursor)
                    _this.setCursorType(cursor);
                if (outlineSymbol)
                    _this.drawTool.setDrawSymbology(null, outlineSymbol);
                if (fillSymbol)
                    _this.drawTool.setDrawSymbology(fillSymbol, null);
                if (showVertexs)
                    _this.drawTool.enableVertexSymbol();
                _this.drawTool.drawPolygon(showTooltip).then(function (result) {
                    thisDefer.resolve(result);
                }, null, thisDefer.notify);
            });
            return thisDefer.promise;
        };
        esriMap.prototype.drawFreehandPolygon = function (cursor, fillSymbol, outlineSymbol, showVertexs, showTooltip) {
            var _this = this;
            if (showTooltip === void 0) { showTooltip = true; }
            var thisDefer = this.$q.defer();
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                if (!_this.drawTool)
                    _this.initializeDrawingToolbar(modules.DrawingToolbar);
                if (cursor)
                    _this.setCursorType(cursor);
                if (outlineSymbol)
                    _this.drawTool.setDrawSymbology(null, outlineSymbol);
                if (fillSymbol)
                    _this.drawTool.setDrawSymbology(fillSymbol, null);
                if (showVertexs)
                    _this.drawTool.enableVertexSymbol();
                _this.drawTool.drawFreehandPolygon(showTooltip).then(function (result) {
                    thisDefer.resolve(result);
                }, null, thisDefer.notify);
            });
            return thisDefer.promise;
        };
        esriMap.prototype.drawCircle = function (cursor, fillSymbol, outlineSymbol, showTooltip) {
            var _this = this;
            if (showTooltip === void 0) { showTooltip = true; }
            var thisDefer = this.$q.defer();
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                if (!_this.drawTool)
                    _this.initializeDrawingToolbar(modules.DrawingToolbar);
                if (cursor)
                    _this.setCursorType(cursor);
                if (outlineSymbol)
                    _this.drawTool.setDrawSymbology(null, outlineSymbol);
                if (fillSymbol)
                    _this.drawTool.setDrawSymbology(fillSymbol, null);
                _this.drawTool.drawCircle(showTooltip).then(function (result) {
                    thisDefer.resolve(result);
                }, null, thisDefer.notify);
            });
            return thisDefer.promise;
        };
        esriMap.prototype.drawRectangle = function (cursor, fillSymbol, outlineSymbol, showTooltip) {
            var _this = this;
            var thisDefer = this.$q.defer();
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                if (!_this.drawTool)
                    _this.initializeDrawingToolbar(modules.DrawingToolbar);
                if (cursor)
                    _this.setCursorType(cursor);
                if (outlineSymbol)
                    _this.drawTool.setDrawSymbology(null, outlineSymbol);
                if (fillSymbol)
                    _this.drawTool.setDrawSymbology(fillSymbol, null);
                _this.drawTool.drawRectangle().then(function (result) {
                    thisDefer.resolve(result);
                }, null, thisDefer.notify);
            });
            return thisDefer.promise;
        };
        esriMap.prototype.editGeometry = function (geometry) {
            var _this = this;
            var thisDefer = this.$q.defer();
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                if (!_this.drawTool)
                    _this.initializeDrawingToolbar(modules.DrawingToolbar);
                _this.drawTool.editGeometry(geometry).then(function (result) {
                    thisDefer.resolve(result);
                }, null, function (result) { thisDefer.notify(result); });
            });
            return thisDefer.promise;
        };
        esriMap.prototype.isEditing = function () {
            return this.editing;
        };
        esriMap.prototype.setEditing = function (state) {
            this.editing = state;
        };
        esriMap.prototype.stopDraw = function (clearGraphics) {
            if (!this.drawTool)
                return;
            this.setCursorType(common.Common.cursorType.DEFAULT);
            this.drawTool.stopDraw(clearGraphics);
            this.drawTool.cancelDrawing();
        };
        esriMap.prototype.setCursorType = function (cursor, otherCursor) {
            switch (cursor) {
                case common.Common.cursorType.DEFAULT:
                    this.cursor = "pointer";
                    break;
                case common.Common.cursorType.SELECT_FEATURES:
                    this.cursor = "url('" + esriMap.relativePath + "/resources/cursors/select_features.cur') 4 8 , pointer";
                    break;
                case common.Common.cursorType.CIRCLE:
                    this.cursor = "url('" + esriMap.relativePath + "/resources/cursors/circle.cur') 4 8 , pointer";
                    break;
                case common.Common.cursorType.MEASURE:
                    this.cursor = "url('" + esriMap.relativePath + "/resources/cursors/measure.cur') 2 5 , pointer";
                    break;
                case common.Common.cursorType.POLYGON:
                    this.cursor = "url('" + esriMap.relativePath + "/resources/cursors/polygon.cur') 4 8 , pointer";
                    break;
                case common.Common.cursorType.RECTANGLE:
                    this.cursor = "url('" + esriMap.relativePath + "/resources/cursors/rectangle.cur') 4 8 , pointer";
                    break;
                case common.Common.cursorType.TARGET:
                    this.cursor = "url('" + esriMap.relativePath + "/resources/cursors/target.cur') 15 15 , pointer";
                    break;
                case common.Common.cursorType.TARGET:
                    this.cursor = otherCursor;
                    break;
                case common.Common.cursorType.ZOOM_IN:
                    this.cursor = "url('" + esriMap.relativePath + "/resources/cursors/zoomin.cur') 15 15 , pointer";
                    break;
                default:
                    this.cursor = "pointer";
                    break;
            }
            this.setMapCursor(this.cursor);
        };
        esriMap.prototype.suspendLayers = function () {
            for (var i = 0; i < this.layerIds.length; i++) {
                if (!(this.layerIds[i] in this.mapResources.services) ||
                    this.mapResources.services[this.layerIds[i]].resourceType == common.Common.resourceType.BACKGROUND_LAYER)
                    continue;
                var layer = this.getLayer(this.layerIds[i]);
                if (!layer.suspended)
                    layer.suspend();
            }
        };
        esriMap.prototype.resumeLayer = function (layerId) {
            var layer = this.getLayer(layerId);
            if (layer.suspended)
                layer.resume();
        };
        esriMap.prototype.suspendLayer = function (layerId) {
            var layer = this.getLayer(layerId);
            if (!layer.suspended)
                layer.suspend();
        };
        esriMap.prototype.resumeLayers = function () {
            for (var i = 0; i < this.layerIds.length; i++) {
                if (!(this.layerIds[i] in this.mapResources.services) ||
                    this.mapResources.services[this.layerIds[i]].resourceType == common.Common.resourceType.BACKGROUND_LAYER)
                    continue;
                var layer = this.getLayer(this.layerIds[i]);
                if (layer.suspended)
                    layer.resume();
            }
        };
        esriMap.prototype.getInScaleLayers = function (layers) {
            var pThis = this;
            //selecting only visible layers from each group layers
            var visibleLayers = layers.filter(function (x) { return pThis.isLayerVisibleInScale(x.LayerName, pThis.getScale()); }).map(function (obj) {
                return obj;
            });
            return visibleLayers;
        };
        esriMap.prototype.isNumeric = function (num) {
            return !isNaN(num);
        };
        esriMap.prototype.isLayerVisibleInScale = function (layerName, mapScale) {
            if (this.isNumeric(layerName)) {
                return true;
            }
            layerName = layerName.toUpperCase();
            if (!(layerName in this.mapResources.layerMapping))
                return true;
            var layer = this.mapResources.layerMapping[layerName];
            return (layer.maxScale == 0 || mapScale >= layer.maxScale) && (layer.minScale == 0 || mapScale <= layer.minScale);
        };
        esriMap.prototype.setResourceOpacity = function (resourceName, opacity) {
            var defer = this.$q.defer();
            this.getMapResource(resourceName).then(function (resource) {
                resource.setOpacity(opacity);
                defer.resolve();
            }).catch(function (e) {
                defer.reject(e);
            });
            return defer.promise;
        };
        esriMap.prototype.getLayerResource = function (layerName) {
            layerName = layerName.toUpperCase();
            if (layerName in this.mapResources.layerMapping) {
                var layer = this.mapResources.layerMapping[layerName];
                return layer.resource;
            }
            return null;
        };
        esriMap.prototype.setLayerOpacity = function (layerName, opacity) {
            var defer = this.$q.defer();
            var resource;
            var layerId;
            layerName = layerName.toUpperCase();
            if (layerName in this.mapResources.layerMapping) {
                var layer = this.mapResources.layerMapping[layerName];
                resource = layer.resource;
                layerId = layer.layerId;
            }
            else if (this.mapLoadedResources[this.govmapConfig.userLayer.userLayersResource] &&
                this.mapLoadedResources[this.govmapConfig.userLayer.userLayersResource].resource.layerDefinitions[parseInt(layerName)]) {
                resource = this.govmapConfig.userLayer.userLayersResource;
                layerId = parseInt(layerName);
            }
            else {
                defer.resolve();
                return defer.promise;
            }
            if (!(resource in this.mapLoadedResources)) {
                defer.resolve();
                return defer.promise;
            }
            var mService = this.mapLoadedResources[resource].resource;
            var drawingOptions = mService.layerDrawingOptions || [];
            var layerDrawingOption = drawingOptions[layerId] || new LayerDrawingOptions();
            layerDrawingOption.transparency = opacity;
            drawingOptions[layerId] = layerDrawingOption;
            mService.setLayerDrawingOptions(drawingOptions, true);
            defer.resolve();
            return defer.promise;
        };
        esriMap.prototype.showLabels = function (layerName, showLabels) {
            var defer = this.$q.defer();
            var resource;
            var layerId;
            layerName = layerName.toUpperCase();
            if (layerName in this.mapResources.layerMapping) {
                var layer = this.mapResources.layerMapping[layerName];
                resource = layer.resource;
                layerId = layer.layerId;
            }
            else if (this.mapLoadedResources[this.govmapConfig.userLayer.userLayersResource] &&
                this.mapLoadedResources[this.govmapConfig.userLayer.userLayersResource].resource.layerDefinitions[parseInt(layerName)]) {
                resource = this.govmapConfig.userLayer.userLayersResource;
                layerId = parseInt(layerName);
            }
            else {
                defer.resolve();
                return defer.promise;
            }
            if (!(resource in this.mapLoadedResources)) {
                defer.resolve();
                return defer.promise;
            }
            var mService = this.mapLoadedResources[resource].resource;
            var drawingOptions = mService.layerDrawingOptions || [];
            var layerDrawingOption = drawingOptions[layerId] || new LayerDrawingOptions();
            layerDrawingOption.showLabels = showLabels;
            drawingOptions[layerId] = layerDrawingOption;
            mService.setLayerDrawingOptions(drawingOptions, true);
            defer.resolve();
            return defer.promise;
        };
        esriMap.prototype.zoomToVisibleScale = function (layer) {
            var mapScale = this.getScale();
            var mapCenter = null;
            if (this.isLayerVisibleInScale(layer, mapScale))
                return;
            if (mapScale >= 500000 && mapScale <= 3000000) {
                mapCenter = new common.Common.Point({
                    x: this.govmapConfig.mapVisibleLevelCenter.x,
                    y: this.govmapConfig.mapVisibleLevelCenter.y
                });
            }
            var visibleLODs = new Array();
            var LODs = this.__tileInfo.lods;
            for (var i = 0; i < LODs.length; i++) {
                if (this.isLayerVisibleInScale(layer, LODs[i].scale))
                    visibleLODs[i] = LODs[i];
            }
            if (visibleLODs.length == 0)
                return;
            var closestLevel = "-1";
            for (var level in visibleLODs) {
                if (closestLevel == "-1") {
                    closestLevel = level;
                }
                else {
                    if (Math.abs(visibleLODs[level] - mapScale) < Math.abs(visibleLODs[closestLevel] - mapScale)) {
                        closestLevel = level;
                    }
                }
            }
            //console.log("zoomToVisibleScale  " + parseInt(closestLevel));
            return this.centerAndZoom(mapCenter, parseInt(closestLevel));
        };
        esriMap.prototype.zoomToExtent = function (p1, p2, p3, p4) {
            var extentPointFactor = 50;
            var oExtent;
            if (typeof (p1) == "object") {
                oExtent = p1;
            }
            else {
                oExtent = new common.Common.Extent(p1, p2, p3, p4);
            }
            if (p1 == p3 && p2 == p4) {
                oExtent.xmin = oExtent.xmin - extentPointFactor;
                oExtent.ymin = oExtent.ymin - extentPointFactor;
                oExtent.xmax = oExtent.xmax + extentPointFactor;
                oExtent.ymax = oExtent.ymax + extentPointFactor;
            }
            this.setExtent(oExtent, true);
            return this.mapDeferres[common.Common.mapDeferes.EXTENT_CHANGE].promise;
        };
        esriMap.prototype.getMapResource = function (resource) {
            //this.getLayer(this.layerIds[0]).setVisibility(false);
            if (!(resource in this.mapResources.services)) {
                //resource not found, rejecting request
                var p = this.$q.defer();
                p.reject();
                return p.promise;
            }
            if (resource in this.mapLoadedResources)
                return this.mapLoadedResources[resource].deferred.promise;
            var resourceInfo = this.mapResources.services[resource];
            var imageParams = new ImageParameters();
            imageParams.format = resourceInfo.pngFormat;
            var mService = new ArcGISDynamicMapServiceLayer(resourceInfo.restUrl, {
                id: resource,
                imageParameters: imageParams,
                opacity: resourceInfo.opacity,
                visible: true
            });
            mService.suspend(); //suspend layer from drawing
            this.mapLoadedResources[resource] = {
                deferred: this.$q.defer(),
                resource: mService
            };
            this.addLayer(mService);
            //if (this.mapResources.services[resource].resourceType == common.Common.resourceType.SELECTION_LAYER) {
            //    var counter = 0;
            //    $.each(this.mapLoadedResources, function (key, value) {
            //        counter++;
            //    });
            //    this.reorderLayer(mService, counter);
            //}
            this.reorderLayer(mService, this.getResourceExpectedIndex(resource));
            var pThis = this;
            mService.on("load", function () {
                //console.log("serviceOnLoad");
                //overriding service object, esri js API has bug while re-ordering layerinfos if the defaultVisiblity in the service is false            
                var dyn = mService.createDynamicLayerInfosFromLayerInfos();
                for (var i = 0; i < dyn.length; i++) {
                    dyn[i].defaultVisibility = true;
                }
                mService.setDynamicLayerInfos(dyn, true);
                mService.setVisibleLayers([-1], true);
                //if (this.embedded && resourceInfo.resourceType == govmap.enums.resourceType.SITE_LAYER)
                //if (govmap.enums.resourceType.SITE_LAYER
                //////////////////////////////////////////////////////
                //setting transparent layers opacity
                if (resourceInfo.resourceType == common.Common.resourceType.SITE_LAYER || resourceInfo.resourceType == common.Common.resourceType.EXTERNAL_LAYER) {
                    pThis.initializeTransparentLayers(resource);
                }
                pThis.mapLoadedResources[resource].deferred.resolve(mService);
            });
            mService.on("error", function (e) {
                pThis.eventHandler.notifyEvent(common.Common.event.LAYER_ERROR, {
                    "error": e,
                    "resource": resource
                });
            });
            return this.mapLoadedResources[resource].deferred.promise;
            //todo
            //dojo.connect(foregroundMap, "onError", function (err) { layerError(err, serviceId); });
            //todo - check if this code relevant
            //var layerOrder = getResourceExpectedIndex(serviceId);
            //if (layerOrder != -1)
            //    map.reorderLayer(foregroundMap, layerOrder);
        };
        esriMap.prototype.getResourceExpectedIndex = function (resource) {
            var bgCount = Object.keys(this.activeBackgrounds).length > 0 ? Object.keys(this.activeBackgrounds).length : 1;
            var resources = Object.keys(this.mapLoadedResources);
            var applicationCount = 0;
            for (var i = 0; i < resources.length; i++) {
                if (this.mapResources.services[resources[i]].resourceType === common.Common.resourceType.APPLICATION_LAYER) {
                    applicationCount++;
                }
            }
            switch (this.mapResources.services[resource].resourceType) {
                case common.Common.resourceType.SITE_LAYER:
                case common.Common.resourceType.EXTERNAL_LAYER:
                    return bgCount;
                case common.Common.resourceType.SELECTION_LAYER:
                    return (bgCount + resources.length) - 1;
                case common.Common.resourceType.APPLICATION_LAYER:
                    if (this.mapLoadedResources.hasOwnProperty(this.govmapConfig.selectionLayer.resource)) {
                        return (bgCount + resources.length) - 2;
                    }
                    else {
                        return (bgCount + resources.length) - 1;
                    }
                case common.Common.resourceType.USER_LAYER:
                    if (this.mapLoadedResources.hasOwnProperty(this.govmapConfig.selectionLayer.resource)) {
                        return (bgCount + resources.length) - applicationCount - 2;
                    }
                    else {
                        return (bgCount + resources.length) - applicationCount - 1;
                    }
                default:
                    return -1;
            }
        };
        esriMap.prototype.removeMapLayer = function (resource) {
            if (!(resource in this.mapLoadedResources))
                return;
            this.removeLayer(this.mapLoadedResources[resource].resource);
        };
        esriMap.prototype.removeOpenSourceLayer = function (layerID) {
            if (!this.commonService.mapService.isUndefinedOrNull(this.addedOpenSourceLayers) &&
                !this.commonService.mapService.isUndefinedOrNull(this.addedOpenSourceLayers[layerID])) {
                this.removeLayer(this.addedOpenSourceLayers[layerID]);
                delete this.addedOpenSourceLayers[layerID];
            }
        };
        esriMap.prototype.initializeTransparentLayers = function (resource) {
            if (!(resource in this.mapLoadedResources))
                return;
            var mService = this.mapLoadedResources[resource].resource;
            var transparentIds = this.mapResources.services[resource].transparentLayers; //taking transparent layer ids from services info object
            if (this.commonService.mapService.isUndefinedOrNull(transparentIds))
                return;
            var drawingOptions = [];
            for (var i = 0; i < transparentIds.length; i++) {
                drawingOptions[transparentIds[i]] = new LayerDrawingOptions({
                    transparency: 50
                });
            }
            mService.setLayerDrawingOptions(drawingOptions, true);
        };
        esriMap.prototype.setILayersFilter = function (layers) {
            var defer = this.$q.defer();
            if (!layers || layers.length == 0) {
                defer.reject("no layers to filter");
                return defer.promise;
            }
            var resources = {};
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                switch (layer.resourceType) {
                    case common.Common.resourceType.USER_LAYER:
                    case common.Common.resourceType.SELECTION_LAYER:
                    case common.Common.resourceType.BACKGROUND_LAYER:
                        break;
                    default:
                        var layerName = layer.layerName.toUpperCase();
                        if (!(layer.layerName in this.mapResources.layerMapping))
                            continue;
                        var layerInfo = this.mapResources.layerMapping[layerName];
                        if (!(layerInfo.resource in this.mapLoadedResources))
                            continue;
                        if (!(layerInfo.resource in resources))
                            resources[layerInfo.resource] = new Array();
                        resources[layerInfo.resource].push({
                            layerId: layerInfo.layerId,
                            definitionExpression: layer.definitionExpression
                        });
                        break;
                }
            }
            for (var resource in resources) {
                var resourceDefinitions = resources[resource];
                this.getMapResource(resource).then(function (mService) {
                    var layerDefinitions = mService.layerDefinitions || [];
                    for (var i = 0; i < resourceDefinitions.length; i++) {
                        layerDefinitions[resourceDefinitions[i].layerId] = resourceDefinitions[i].definitionExpression;
                    }
                    mService.setLayerDefinitions(layerDefinitions, true);
                });
            }
            defer.resolve();
            return defer.promise;
        };
        esriMap.prototype.setLayersFilter = function (layers) {
            var defer = this.$q.defer();
            if (!layers || layers.length == 0) {
                defer.reject("no layers to filter");
                return defer.promise;
            }
            var iLayersFilter = Array();
            for (var i = 0; i < layers.length; i++) {
                iLayersFilter.push({ resourceType: layers[i].resourceType, layerName: layers[i].layerName, definitionExpression: layers[i].definitionExpression });
            }
            return this.setILayersFilter(iLayersFilter);
        };
        esriMap.prototype.setVisibleLayers = function (layers) {
            var _this = this;
            var layerDetails = new Array();
            var offLayerDetails = new Array();
            var defer = this.$q.defer();
            var creatorDefQ = '';
            var requestedLayerRenderers = new Array();
            for (var i = 0; i < layers.length; i++) {
                var lyr = layers[i];
                lyr.layerName = lyr.layerName.toUpperCase();
                if (!lyr.visible) {
                    if ((lyr.layerType === common.Common.layerType.SITE || lyr.layerType === common.Common.layerType.EXTERNAL || lyr.layerType === common.Common.layerType.APPLICATION) &&
                        lyr.layerName in this.mapResources.layerMapping) {
                        offLayerDetails.push({
                            layerName: lyr.layerName,
                            resourceType: lyr.resourceType
                        });
                        continue;
                    }
                    if (this.isDynamicLayer(lyr)) {
                        offLayerDetails.push({
                            layerName: lyr.layerName,
                            resourceType: common.Common.resourceType.USER_LAYER,
                            geometryType: lyr.layerKind
                        });
                        continue;
                    }
                    offLayerDetails.push({
                        layerName: lyr.layerName,
                        resourceType: lyr.resourceType,
                        geometryType: lyr.layerKind
                    });
                    continue;
                }
                if ((lyr.layerType === common.Common.layerType.SITE || lyr.layerType === common.Common.layerType.EXTERNAL || lyr.layerType === common.Common.layerType.APPLICATION) &&
                    lyr.layerName in this.mapResources.layerMapping) {
                    layerDetails.push({
                        layerName: lyr.layerName,
                        resourceType: lyr.resourceType
                    });
                    continue;
                }
                if (this.isDynamicLayer(lyr)) {
                    requestedLayerRenderers.push({
                        LayerName: lyr.layerName,
                        LayerType: lyr.layerType
                    });
                    layerDetails.push({
                        layerName: lyr.layerName,
                        resourceType: common.Common.resourceType.USER_LAYER,
                        definitionExpression: lyr.definitionExpression,
                        geometryType: lyr.layerKind
                    });
                }
            }
            if (requestedLayerRenderers.length > 0) {
                return this.getDynamicLayerRenderer(requestedLayerRenderers).then(function (renderers) {
                    for (var i = layerDetails.length - 1; i >= 0; i--) {
                        var ld = layerDetails[i];
                        if (ld.resourceType != common.Common.resourceType.USER_LAYER)
                            continue;
                        if (!(ld.layerName in renderers.UserRenderer))
                            layerDetails.splice(i, 1);
                        ld.renderer = renderers.UserRenderer[ld.layerName];
                    }
                    return _this.$q.all([
                        _this.setLayerVisibility(offLayerDetails, false),
                        _this.setLayerVisibility(layerDetails, true)
                    ]);
                });
            }
            else
                return this.$q.all([
                    this.setLayerVisibility(offLayerDetails, false),
                    this.setLayerVisibility(layerDetails, true)
                ]);
        };
        esriMap.prototype.isDynamicLayer = function (layer) {
            return ((layer.layerType === common.Common.layerType.USER ||
                layer.layerType === common.Common.layerType.SHARED ||
                layer.layerType === common.Common.layerType.PUBLISHED ||
                layer.layerType === common.Common.layerType.MUNICIPAL) && !isNaN(parseInt(layer.layerName)));
        };
        esriMap.prototype.setLayerVisibility = function (layers, visible) {
            var _this = this;
            if (layers.length == 0) {
                var defer = this.$q.defer();
                defer.resolve();
                return defer.promise;
            }
            if (this.commonService.mapService.isUndefinedOrNull(visible))
                visible = true;
            var resources = {};
            var defers = new Array();
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                switch (layer.resourceType) {
                    case common.Common.resourceType.SITE_LAYER:
                    case common.Common.resourceType.EXTERNAL_LAYER:
                    case common.Common.resourceType.APPLICATION_LAYER:
                        var layerName = layer.layerName.toUpperCase();
                        if (!(layer.layerName in this.mapResources.layerMapping))
                            continue;
                        var layerInfo = this.mapResources.layerMapping[layerName];
                        if (!(layerInfo.resource in this.mapLoadedResources) && !visible)
                            continue;
                        if (!(layerInfo.resource in resources))
                            resources[layerInfo.resource] = new Array();
                        resources[layerInfo.resource].push(layerInfo.layerId);
                        break;
                    case common.Common.resourceType.USER_LAYER:
                        var layerId = parseInt(layer.layerName);
                        if (visible) {
                            if (this.commonService.mapService.isUndefinedOrNull(layer.geometryType))
                                continue;
                            if (layer.renderer.RendererList == null || layer.renderer.RendererList.length == 0) {
                                return null;
                            }
                            var defaultRenderer = null;
                            angular.forEach(layer.renderer.RendererList, function (val, key) {
                                if (val.IsDefault) {
                                    defaultRenderer = val.RendererValue;
                                }
                            });
                            if (!defaultRenderer) {
                                continue;
                            }
                            var renderer = this.commonService.layerRendererService.getEsriRenderer(defaultRenderer);
                            if (renderer == null) {
                                console.log('unsupported renderer type for layer: ' + layer.layerName);
                                continue;
                            }
                            defers.push(this.addDynamicWorkspaceLayer({
                                layerId: layerId,
                                renderer: renderer,
                                resource: this.govmapConfig.userLayer.userLayersResource,
                                workspaceId: this.govmapConfig.userLayer.workspaceId,
                                sourceName: this.getUserLayerTableName(layer.geometryType),
                                definitionExpression: layer.definitionExpression
                            }));
                        }
                        //if (!(this.govmapConfig.userLayer.userLayersResource in resources) && !visible)
                        //    continue;
                        if (!(this.govmapConfig.userLayer.userLayersResource in resources))
                            resources[this.govmapConfig.userLayer.userLayersResource] = new Array();
                        resources[this.govmapConfig.userLayer.userLayersResource].push(layerId);
                        break;
                    default:
                        continue;
                }
            }
            //case when no user layer should be added to map and operation is sync
            if (defers.length == 0) {
                return this.updateResourcesLayerVisiblity(resources, visible);
            }
            else {
                // if layers included user layers that need to be added to the map as dynamic map
                // so the operation should be async and wait for all dynamic layers to be added
                return this.$q.all(defers).then(function () {
                    return _this.updateResourcesLayerVisiblity(resources, visible);
                });
            }
        };
        esriMap.prototype.addDynamicWorkspaceLayer = function (gDynamicLayerInfo) {
            var _this = this;
            var defer = this.$q.defer();
            if (!(gDynamicLayerInfo.resource in this.mapResources.services)) {
                console.log('addDynamicWorkspaceLayer: resource not exists: ' + gDynamicLayerInfo.resource);
                defer.reject();
                return defer.promise;
            }
            var serviceInfo = this.mapResources.services[gDynamicLayerInfo.resource];
            this.getMapResource(gDynamicLayerInfo.resource).then(function (mService) {
                if (_this.hasDynamicLayer(mService, gDynamicLayerInfo.layerId)) {
                    defer.resolve();
                    return defer.promise;
                }
                var workspace = String.isNullOrEmpty(gDynamicLayerInfo.sourceName) ? gDynamicLayerInfo.workspaceId : gDynamicLayerInfo.sourceName.substr(0, gDynamicLayerInfo.sourceName.indexOf("."));
                var gDataSource = new TableDataSource({
                    workspaceId: workspace,
                    dataSourceName: gDynamicLayerInfo.sourceName
                });
                var layerSource = new LayerDataSource({
                    dataSource: gDataSource
                });
                var dynamicLayerInfo = new DynamicLayerInfo({
                    id: gDynamicLayerInfo.layerId,
                    //minScale: (serviceInfo.resourceType == common.Common.resourceType.SELECTION_LAYER) ? 100001 : 3000001, //100,000 for selection layer, visible at all scales for other layers
                    //removed because of client bug 6169
                    minScale: 3000001,
                    maxScale: 0,
                    defaultVisibility: true,
                    source: layerSource
                });
                //setting layer renderer            
                var drawingOptions = mService.layerDrawingOptions || [];
                drawingOptions[gDynamicLayerInfo.layerId] = new LayerDrawingOptions();
                drawingOptions[gDynamicLayerInfo.layerId].renderer = gDynamicLayerInfo.renderer;
                mService.setLayerDrawingOptions(drawingOptions, true);
                //setting layer definition expression
                if (!_this.commonService.mapService.isEmptyString(gDynamicLayerInfo.definitionExpression)) {
                    var layerDefinitions = mService.layerDefinitions || [];
                    layerDefinitions[gDynamicLayerInfo.layerId] = gDynamicLayerInfo.definitionExpression;
                    mService.setLayerDefinitions(layerDefinitions, true);
                }
                //setting layer dynamic info to service in order to enable its drawing
                _this.updateResourceDynamicLayerInfos(gDynamicLayerInfo.resource, gDynamicLayerInfo.layerId, dynamicLayerInfo);
                defer.resolve();
            });
            return defer.promise;
        };
        esriMap.prototype.layerIdToUserServiceLayerId = function (layerId) {
            //adding constant number to layer id, in order to preserve existing mxd layer ids
            return layerId + this.govmapConfig.userLayer.userLayerIdShift;
        };
        esriMap.prototype.userServiceLayerIdToLayerId = function (layerId) {
            //decreasing constant number from layer id, in order to get the real layer id such in DB
            return layerId - this.govmapConfig.userLayer.userLayerIdShifting;
        };
        esriMap.prototype.getUserLayerTableName = function (geometryType) {
            // getting user layers sde table name for dynamic drawing
            switch (geometryType) {
                case common.Common.geometryType.POINT:
                    return this.govmapConfig.userLayer.pointsTable;
                case common.Common.geometryType.POLYLINE:
                    return this.govmapConfig.userLayer.linesTable;
                case common.Common.geometryType.POLYGON:
                    return this.govmapConfig.userLayer.polygonsTable;
            }
        };
        esriMap.prototype.hasDynamicLayer = function (service, layerId) {
            var dynamicLayerInfos = service.dynamicLayerInfos || [];
            //checking if map service dynamic layer info was initialized to enable dynamic drawing.
            for (var i = 0; i < dynamicLayerInfos.length; i++) {
                if (dynamicLayerInfos[i].id == layerId)
                    return true;
            }
            return false;
        };
        esriMap.prototype.updateResourceDynamicLayerInfos = function (p1, p2, p3) {
            //updating map layer info for single or array of layer info in order to change map drawing
            this.getMapResource(p1).then(function (mService) {
                var dynamicLayerInfos = mService.dynamicLayerInfos || [];
                if (angular.isNumber(p2)) {
                    dynamicLayerInfos.push(p3);
                }
                else {
                    dynamicLayerInfos.concat(p3);
                }
                var cVisibleLayers = mService.visibleLayers;
                mService.setDynamicLayerInfos(dynamicLayerInfos, true);
                mService.setVisibleLayers(cVisibleLayers, true);
            });
        };
        esriMap.prototype.updateResourcesLayerVisiblity = function (resourceLayers, visible) {
            var _this = this;
            var q = new Array();
            for (var resource in resourceLayers) {
                var defer = this.$q.defer();
                q.push(defer.promise);
                (function (resource, defer) {
                    _this.getMapResource(resource).then(function (mService) {
                        var layerIds = resourceLayers[resource];
                        var uniqueIds;
                        if (visible) {
                            // removing existing visible layers
                            for (var i = layerIds.length - 1; i >= 0; i--) {
                                var id = layerIds[i];
                                if (mService.visibleLayers.indexOf(id) != -1)
                                    layerIds.splice(i, 1);
                            }
                            if (layerIds.length == 0) {
                                defer.resolve();
                                return;
                            }
                            uniqueIds = _this.commonService.mapService.getUniqueArray(layerIds.concat(mService.visibleLayers)); // combining map visible layer ids with new requested layer ids
                        }
                        else {
                            uniqueIds = _this.commonService.mapService.removeElementFromArray(mService.visibleLayers, layerIds); // removing requested layer ids from map visible layers 
                        }
                        //removing -1 value when no layer is visible
                        var indexNoLayers = uniqueIds.indexOf(-1);
                        if (uniqueIds.length > 1 && indexNoLayers != -1)
                            uniqueIds.splice(indexNoLayers, 1);
                        if (uniqueIds.length == 0)
                            uniqueIds.push(-1);
                        mService.setVisibleLayers(JSON.parse(JSON.stringify(uniqueIds)), true); // updating map service visible layers
                        defer.resolve();
                    });
                })(resource, defer);
            }
            return this.$q.all(q);
        };
        esriMap.prototype.clearDynamicLayerRenderers = function () {
            this.dynamicLayerRenderers = {};
        };
        esriMap.prototype.updateDynamicLayerRenderers = function (layer) {
            var _this = this;
            if (layer) {
                this.dynamicLayerRenderers[layer.layerName] = layer.layerRenderer;
                this.getMapResource(this.govmapConfig.userLayer.userLayersResource).then(function (mService) {
                    var drawingOptions = mService.layerDrawingOptions || [];
                    drawingOptions[layer.layerID] = new LayerDrawingOptions();
                    drawingOptions[layer.layerID].renderer = _this.commonService.layerRendererService.getEsriRenderer(JSON.parse(layer.layerRenderer).RendererList[0].RendererValue);
                    mService.setLayerDrawingOptions(drawingOptions, true);
                    mService.refresh();
                });
            }
        };
        esriMap.prototype.getDynamicLayerRenderer = function (layers, extent, filter) {
            var defer = this.$q.defer();
            var renderers = {};
            var missingRenderers = new Array();
            var scale = this.getScale();
            if (layers == null || layers.length == 0) {
                defer.resolve(renderers);
                return defer.promise;
            }
            for (var i = 0; i < layers.length; i++) {
                var lyrName = layers[i].LayerName;
                if (lyrName in this.dynamicLayerRenderers &&
                    angular.isUndefined(extent) && angular.isUndefined(filter)) {
                    var resourceType = this.dynamicLayerRenderers[lyrName].ResourceType != 4 ? "SiteRenderer" : "UserRenderer";
                    if (angular.isUndefined(renderers[resourceType])) {
                        renderers[resourceType] = {};
                    }
                    renderers[resourceType][layers[i].LayerName] = this.dynamicLayerRenderers[lyrName];
                }
                else {
                    if (this.isLayerVisibleInScale(layers[i].LayerName, scale)) {
                        missingRenderers.push(layers[i]); // renderer to bring from server
                    }
                }
            }
            if (missingRenderers.length == 0) {
                defer.resolve(renderers);
                return defer.promise;
            }
            var pThis = this;
            this.commonService.mapService.getDynamicLayerRenderer(missingRenderers, extent, filter).then(function (newRenderers) {
                for (var key in newRenderers) {
                    if (key == "requestParams") {
                        break;
                    }
                    else {
                        //renderers[key] = {};
                        if (renderers[key] == undefined) {
                            renderers[key] = {};
                        }
                        for (var layerId in newRenderers[key]) {
                            var lRenderer = newRenderers[key][layerId];
                            if (angular.isUndefined(extent) && angular.isUndefined(filter))
                                pThis.dynamicLayerRenderers[layerId] = lRenderer; // updating local renderers cache
                            renderers[key][layerId] = lRenderer;
                        }
                    }
                }
                //  todo else post error - waiting for yoni error message implementation
                defer.resolve(renderers);
                // defer.resolve(newRenderers);
            });
            return defer.promise;
        };
        esriMap.prototype.toMapPoint = function (x, y) {
            return this.toMap(new ScreenPoint(x, y));
        };
        esriMap.prototype.setMapMarker = function (p1, p2) {
            this.clearMapMarker();
            if (typeof p1 == 'object')
                this.mapMarker = p1;
            else
                this.mapMarker = new common.Common.Point(p1, p2);
            var pSymbol = new PictureMarkerSymbol(this.govmapConfig.selectionLayer.marker);
            this.mapGraphics.addGraphic(new Graphic(this.mapMarker, pSymbol), common.Common.graphicLayer.DEFAULT);
        };
        esriMap.prototype.addCircleGeometries = function (data, graphicLayer) {
            var _this = this;
            var defer = this.geomClickDefer;
            if (data.clearExisting) {
                this.mapGraphics.clearGraphics(graphicLayer);
            }
            var gids = new Array();
            var pSymbol = null;
            var useDefaultSymbol = false;
            if (!data.circleGeometries || data.circleGeometries.length == 0) {
                defer.resolve(gids);
                return defer.promise;
            }
            var length = data.circleGeometries.length;
            if (data.symbols == null || data.symbols.length != length) {
                pSymbol = this.mapGraphics.getSymbol(data.defaultSymbol, common.Common.geometryType.POLYGON);
                useDefaultSymbol = true;
            }
            this._require.load(['../Widget/DrawingToolbar/Models/DrawingToolbar']).then(function (modules) {
                for (var i = 0; i < length; i++) {
                    if (!_this.drawTool)
                        _this.initializeDrawingToolbar(modules.DrawingToolbar);
                    var geom = data.circleGeometries[i];
                    var radius = geom.radius;
                    if (data.isWGS1984) {
                        geom = _this.commonService.projService.transformWGS1984ToITM(geom.x, geom.y);
                    }
                    var polyline = new common.Common.Polyline([[[geom.x, geom.y],
                            [(geom.x + radius), geom.y]]]);
                    var geometry = _this.drawTool.getCircleGeometry(polyline, 1);
                    var name = (data.names && (data.names.length == length)) ? data.names[i] : "";
                    var tooltipContent = (data.data.tooltips && (data.data.tooltips.length == length)) ? data.data.tooltips[i] : "";
                    var geomData = (data.geomData && data.geomData[i]) ? data.geomData[i] : "";
                    var headerContent = (data.data.headers && (data.data.headers.length == length)) ? data.data.headers[i] : "";
                    var isBubbleUrl = data.data.bubbleUrl != undefined && data.data.bubbleUrl.trim() != "";
                    var bubbleContent = "";
                    if (isBubbleUrl) {
                        bubbleContent = data.data.bubbleUrl + ((data.data.bubbles && (data.data.bubbles.length == length)) ? data.data.bubbles[i] : "");
                    }
                    else {
                        if (data.data.bubbleHTML && data.data.bubbleHTML.trim() != "" && data.data.bubbleHTMLParameters && data.data.bubbleHTMLParameters[i]) {
                            bubbleContent = _this.stringFormat(false, data.data.bubbleHTML, data.data.bubbleHTMLParameters[i]);
                        }
                    }
                    pSymbol = useDefaultSymbol ? pSymbol : _this.mapGraphics.getSymbol(data.symbols[i], data.geometryType);
                    gids.push(_this.mapGraphics.addGraphic(new Graphic(geometry, pSymbol), graphicLayer, name, tooltipContent, bubbleContent, headerContent, geom, geomData));
                }
                var isMobile = _this.commonService.mapService.$rootScope.isMobile;
                _this.mapGraphics.onMouseOver(common.Common.graphicLayer.API, function (graphic, x, y) { _this.createTooltipForGraphic(graphic, x, y); });
                _this.mapGraphics.onMouseOut(common.Common.graphicLayer.API, function (graphic) { _this.deleteGraphicTooltip(graphic); });
                _this.mapGraphics.onClickMobile(common.Common.graphicLayer.API, isMobile, function (graphic, x, y, evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (data.showBubble) {
                        _this.showGraphicBubble(isBubbleUrl, graphic, x, y);
                        defer.notify(gids);
                    }
                    else {
                        var GraphicData = {
                            x: x,
                            y: y,
                            geomData: graphic.attributes.data,
                            geometry: graphic.attributes.wkt,
                            bubbleContent: graphic.attributes.bubbleContent,
                            name: graphic.attributes.name,
                            tooltipContent: graphic.attributes.tooltipContent,
                            headerContent: graphic.attributes.headerContent,
                            id: graphic.attributes.gov_gid
                        };
                        defer.notify(GraphicData);
                    }
                });
                //this.mapGraphics.onClickMobile(common.Common.graphicLayer.API, isMobile, (graphic, x, y, evt) => {
                //    evt.preventDefault();
                //    evt.stopPropagation();
                //    this.showGraphicBubble(isBubbleUrl, graphic, x, y);
                //})
                //this.mapGraphics.onClick(common.Common.graphicLayer.API, (graphic, x, y, evt) => {
                //    evt.preventDefault();
                //    evt.stopPropagation();
                //    this.showGraphicBubble(isBubbleUrl, graphic, x, y);
                //})
                //this.mapGraphics.onMouseOver(common.Common.graphicLayer.API, (graphic, x, y) => { this.createTooltipForGraphic(graphic, x, y); });
                //this.mapGraphics.onMouseOut(common.Common.graphicLayer.API, (graphic) => { this.deleteGraphicTooltip(graphic); });
                //defer.resolve(gids);
            });
            return defer.promise;
        };
        esriMap.prototype.addGeometries = function (data, graphicLayer) {
            var _this = this;
            if (data.geometryType == common.Common.geometryType.CIRCLE) {
                return this.addCircleGeometries(data, graphicLayer);
            }
            var defer = this.geomClickDefer;
            if (data.clearExisting) {
                this.mapGraphics.clearGraphics(graphicLayer);
            }
            var gids = new Array();
            var pSymbol = null;
            var useDefaultSymbol = false;
            if (!data.wkts || data.wkts.length == 0) {
                defer.resolve(gids);
                return defer.promise;
            }
            if (data.symbols == null || data.symbols.length != data.wkts.length) {
                pSymbol = this.mapGraphics.getSymbol(data.defaultSymbol, data.geometryType);
                useDefaultSymbol = true;
            }
            for (var i = 0; i < data.wkts.length; i++) {
                var geometry = this.wktToGeometry(data.wkts[i], data.geometryType, data.isWGS1984);
                var name = (data.names && (data.names.length == data.wkts.length)) ? data.names[i] : "";
                var tooltipContent = (data.data.tooltips && (data.data.tooltips.length == data.wkts.length)) ? data.data.tooltips[i] : "";
                var headerContent = (data.data.headers && (data.data.headers.length == data.wkts.length)) ? data.data.headers[i] : "";
                var geomData = (data.geomData && data.geomData[i]) ? data.geomData[i] : "";
                var isBubbleUrl = data.data.bubbleUrl != undefined && data.data.bubbleUrl.trim() != "";
                var bubbleContent = "";
                if (isBubbleUrl) {
                    bubbleContent = data.data.bubbleUrl + ((data.data.bubbles && (data.data.bubbles.length == data.wkts.length)) ? data.data.bubbles[i] : "");
                }
                else {
                    if (data.data.bubbleHTML && data.data.bubbleHTML.trim() != "" && data.data.bubbleHTMLParameters && data.data.bubbleHTMLParameters[i]) {
                        bubbleContent = this.stringFormat(false, data.data.bubbleHTML, data.data.bubbleHTMLParameters[i]);
                    }
                }
                pSymbol = useDefaultSymbol ? pSymbol : this.mapGraphics.getSymbol(data.symbols[i], data.geometryType);
                gids.push(this.mapGraphics.addGraphic(new Graphic(geometry, pSymbol), graphicLayer, name, tooltipContent, bubbleContent, headerContent, '', geomData));
            }
            var isMobile = this.commonService.mapService.$rootScope.isMobile;
            if (!this.graphicLayersEventsHandle[common.Common.graphicLayer.API]) {
                this.graphicLayersEventsHandle[common.Common.graphicLayer.API] = {};
            }
            if (!this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onMouseOver']) {
                this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onMouseOver'] = this.mapGraphics.onMouseOver(common.Common.graphicLayer.API, function (graphic, x, y) { _this.createTooltipForGraphic(graphic, x, y); });
            }
            if (!this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onMouseOut']) {
                this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onMouseOut'] = this.mapGraphics.onMouseOut(common.Common.graphicLayer.API, function (graphic) { _this.deleteGraphicTooltip(graphic); });
            }
            if (this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onClickMobile']) {
                this.mapGraphics.removeOnClickMobile(this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onClickMobile']);
                this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onClickMobile'] = null;
            }
            this.graphicLayersEventsHandle[common.Common.graphicLayer.API]['onClickMobile'] = this.mapGraphics.onClickMobile(common.Common.graphicLayer.API, isMobile, function (graphic, x, y, evt) {
                evt.preventDefault();
                evt.stopPropagation();
                if (data.showBubble) {
                    _this.showGraphicBubble(isBubbleUrl, graphic, x, y);
                    defer.notify(gids);
                }
                else {
                    var GraphicData = {
                        x: x,
                        y: y,
                        geomData: graphic.attributes.data,
                        bubbleContent: graphic.attributes.bubbleContent,
                        name: graphic.attributes.name,
                        tooltipContent: graphic.attributes.tooltipContent,
                        headerContent: graphic.attributes.headerContent,
                        id: graphic.attributes.gov_gid
                    };
                    defer.notify(GraphicData);
                }
            });
            //    this.mapGraphics.onClick(common.Common.graphicLayer.API, (graphic, x, y, evt) => {
            //   evt.preventDefault();
            //   evt.stopPropagation();
            //     this.showGraphicBubble(isBubbleUrl, graphic, x, y);
            //   })
            //this.mapGraphics.onMouseOver(common.Common.graphicLayer.API, (graphic, x, y) => { this.createTooltipForGraphic(graphic, x, y); });
            //this.mapGraphics.onMouseOut(common.Common.graphicLayer.API, (graphic) => { this.deleteGraphicTooltip(graphic); });
            if (data.showBubble) {
                defer.resolve(gids);
            }
            return defer.promise;
        };
        esriMap.prototype.showGraphicBubble = function (isBubbleUrl, graphic, x, y) {
            var bubbleContent = graphic.attributes['bubbleContent'];
            var headerContent = graphic.attributes['headerContent'];
            var id = graphic.attributes['gov_gid'];
            if (!this.commonService.mapService.isUndefinedOrNull(bubbleContent)) {
                var bubbleData = {
                    "requestParams": {
                        "x": x,
                        "y": y
                    },
                    "data": {
                        "Result": [{
                                "bubbleContent": bubbleContent, "header": headerContent, "isBubbleUrl": isBubbleUrl, 'extent': graphic.geometry.getExtent()
                            }],
                        "BubbleType": common.Common.bubbleType.IFRAME
                    }
                };
                ;
                this.commonService.mapService.$rootScope.$broadcast('bubbleEvent', bubbleData);
            }
        };
        esriMap.prototype.createTooltipForGraphic = function (graphic, x, y) {
            var str = graphic.attributes['tooltipContent'];
            var id = graphic.attributes['gov_gid'];
            var div = $("<div>");
            div.attr("id", id);
            div.attr("title", str);
            div.attr("style", "left: " + x + "px; top:" + y + "px;  z-index:0;position:absolute");
            var img = $("<img>");
            img.attr("id", "img_" + id);
            img.attr("src", this.commonService.mapService.getSiteBaseUrl() + "Images/transparent.gif");
            img.attr("width", 1);
            img.attr("height", 1);
            div.append(img);
            $('#' + this.id).find('#map_container').append(div);
            $("#" + id).tipsy({ trigger: 'manual' });
            $("#" + id).tipsy('show');
        };
        esriMap.prototype.deleteGraphicTooltip = function (graphic) {
            var id = graphic.attributes['gov_gid'];
            $("#" + id).tipsy('hide');
            $("#" + id).remove();
        };
        esriMap.prototype.clearGraphicsByName = function (names, layerType) {
            for (var i = 0; i < names.length; i++)
                this.mapGraphics.removeGraphic(names[i], layerType);
        };
        esriMap.prototype.clearGraphicsById = function (ids, layerType) {
            for (var i = 0; i < ids.length; i++)
                this.mapGraphics.removeGraphic(ids[i], layerType);
        };
        esriMap.prototype.clearMapMarker = function () {
            this.mapGraphics.clearGraphics(common.Common.graphicLayer.DEFAULT);
            this.mapMarker = null;
        };
        esriMap.prototype.setGpsMarker = function (x, y, accuracy) {
            var point = new common.Common.Point(x, y);
            var circle = new common.Common.Circle(x, y, accuracy);
            if (this.gpsMarker.point == null) {
                var pSymbol = new PictureMarkerSymbol({
                    url: "images/gps.png",
                    width: 12,
                    height: 12
                });
                var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, null, new dojo.Color([130, 177, 255, 0.25]));
                this.gpsMarker.point = this.mapGraphics.addGraphic(new Graphic(point, pSymbol), common.Common.graphicLayer.GPS);
                this.gpsMarker.circle = this.mapGraphics.addGraphic(new Graphic(circle, fillSymbol), common.Common.graphicLayer.GPS);
            }
            else {
                this.mapGraphics.moveGraphic(this.gpsMarker.point, common.Common.graphicLayer.GPS, point);
                this.mapGraphics.moveGraphic(this.gpsMarker.circle, common.Common.graphicLayer.GPS, circle);
            }
            return circle.getExtent();
        };
        esriMap.prototype.getGraphicLayerExtent = function (layerType) {
            if (this.drawTool == null)
                return;
            var mapGraphics = this.drawTool.getDrawnGraphics();
            var extent;
            for (var i = 0; i < mapGraphics.length; i++) {
                var geom = mapGraphics[i].geometry;
                var geomExtent = geom.getExtent();
                if (geomExtent == null)
                    continue;
                if (extent == null) {
                    extent = geomExtent;
                }
                else {
                    extent.xmin = Math.min(extent.xmin, geomExtent.xmin);
                    extent.ymin = Math.min(extent.ymin, geomExtent.ymin);
                    extent.xmax = Math.max(extent.xmax, geomExtent.xmax);
                    extent.ymax = Math.max(extent.ymax, geomExtent.ymax);
                }
            }
            return extent;
        };
        esriMap.prototype.removeGpsMarker = function () {
            this.mapGraphics.removeGraphic(this.gpsMarker.point, common.Common.graphicLayer.GPS);
            this.mapGraphics.removeGraphic(this.gpsMarker.circle, common.Common.graphicLayer.GPS);
            this.gpsMarker = {
                point: null,
                circle: null
            };
        };
        esriMap.prototype.setMapSelection = function (params, clearMarker) {
            var _this = this;
            if (clearMarker === void 0) { clearMarker = true; }
            var resources = {}; //setting resource to be refreshed later
            resources[this.govmapConfig.selectionLayer.resource] = [this.govmapConfig.selectionLayer.layerId];
            this.deleteMapSelection(false, clearMarker);
            var pThis = this;
            if (params.marker && params.centroid) {
                pThis.setMapMarker(params.centroid.x, params.centroid.y);
            }
            return this.addDynamicWorkspaceLayer({
                definitionExpression: params.filter,
                resource: this.govmapConfig.selectionLayer.resource,
                layerId: this.govmapConfig.selectionLayer.layerId,
                sourceName: params.dataSource,
                workspaceId: this.govmapConfig.selectionLayer.workspaceId,
                renderer: this.commonService.layerRendererService.getSelectionRenderer(params)
            }).then(function () {
                return pThis.updateResourcesLayerVisiblity(resources, true).then(function () {
                    var layer = _this.getLayer(_this.govmapConfig.selectionLayer.resource);
                    layer.suspended = true;
                    layer.resume();
                });
            });
        };
        esriMap.prototype.deleteMapSelection = function (refresh, clearMarker) {
            if (refresh === void 0) { refresh = true; }
            if (clearMarker === void 0) { clearMarker = true; }
            var defer = this.$q.defer();
            var selectionResource = this.govmapConfig.selectionLayer.resource;
            if (clearMarker) {
                this.clearMapMarker();
            }
            if (selectionResource in this.mapLoadedResources) {
                var selectionSerivce = this.mapLoadedResources[selectionResource].resource;
                if (selectionSerivce.visibleLayers && (selectionSerivce.visibleLayers.indexOf(this.govmapConfig.selectionLayer.layerId) != -1)) {
                    selectionSerivce.setDynamicLayerInfos([], true);
                    selectionSerivce.setLayerDrawingOptions([], true);
                }
            }
            if (refresh)
                this.refreshResource({ resource: this.govmapConfig.selectionLayer.resource });
            defer.resolve();
            return defer.promise;
        };
        esriMap.prototype.getMapTolerance = function () {
            return (this.govmapConfig.identify.pixelTolerance * this.getZoomLevelResolution(this.getLevel()));
        };
        esriMap.prototype.getMapToleranceByZoomLevel = function (zoom) {
            return (this.govmapConfig.identify.pixelTolerance * this.getZoomLevelResolution(zoom));
        };
        esriMap.prototype.getVisibleLayers = function () {
            var visibleLayers = {};
            for (var resource in this.mapLoadedResources) {
                var mService = this.mapLoadedResources[resource].resource;
                if (mService.visibleLayers != [-1])
                    visibleLayers[resource] = mService.visibleLayers;
            }
            return visibleLayers;
        };
        esriMap.prototype.getLayerDefinitions = function () {
            var definitionExp = {};
            for (var resource in this.mapLoadedResources) {
                definitionExp[resource] = {};
                var mService = this.mapLoadedResources[resource].resource;
                if (mService.layerDefinitions.length > 0) {
                    for (var index = 0; index < mService.layerDefinitions.length; index++) {
                        var def = mService.layerDefinitions[index];
                        if (!this.commonService.mapService.isEmptyString(def)) {
                            definitionExp[resource][index] = def;
                        }
                    }
                }
            }
            return definitionExp;
        };
        esriMap.prototype.gpsOn = function () {
            var pThis = this;
            this.commonService.gpsService.watchLocation().then(function (data) {
                //console.log("watch location success : " + data.success);                
                if (pThis.mapMovedGPSOn) {
                    console.log("watch only gpsMarker");
                    pThis.setGpsMarker(data.success.x, data.success.y, data.success.accuracy);
                }
                else {
                    console.log("watch zoomToExtent and gpsMarker");
                    pThis.zoomToExtent(pThis.setGpsMarker(data.success.x, data.success.y, data.success.accuracy));
                }
            }, function (error) {
                console.log(error.error);
            }, function (data) {
                if (data.status == 0) {
                    if (pThis.mapMovedGPSOn) {
                        console.log("watch only gpsMarker");
                        pThis.setGpsMarker(data.success.x, data.success.y, data.success.accuracy);
                    }
                    else {
                        console.log("watch zoomToExtent and gpsMarker");
                        pThis.zoomToExtent(pThis.setGpsMarker(data.success.x, data.success.y, data.success.accuracy));
                    }
                }
                else {
                    console.log(data.error);
                }
            });
        };
        esriMap.prototype.gpsOff = function () {
            this.commonService.gpsService.clearWatch();
            this.mapMovedGPSOn = false;
            console.log("mapMovedGPSOn is false - esrimap gpsoff");
            this.removeGpsMarker();
        };
        esriMap.prototype.getGpsLocation = function () {
            return this.commonService.gpsService.getLocation();
        };
        esriMap.prototype.refreshResource = function (params) {
            var resource = params.resource;
            if (params.layerName) {
                params.layerName = params.layerName.toUpperCase();
                if (!(params.layerName in this.mapResources.layerMapping))
                    return;
                var layer = this.mapResources.layerMapping[params.layerName];
                resource = layer.resource;
            }
            resource = resource.toLowerCase();
            if (!(resource in this.mapLoadedResources))
                return;
            this.getMapResource(resource).then(function (mService) {
                mService.refresh();
            });
        };
        esriMap.prototype.disableClientCache = function (resource) {
            resource = resource.toLowerCase();
            if (!(resource in this.mapLoadedResources))
                return;
            this.getMapResource(resource).then(function (mService) {
                mService.setDisableClientCaching(true);
            });
        };
        esriMap.prototype.enableClientCache = function (resource) {
            resource = resource.toLowerCase();
            if (!(resource in this.mapLoadedResources))
                return;
            this.getMapResource(resource).then(function (mService) {
                mService.setDisableClientCaching(false);
            });
        };
        esriMap.prototype.execute = function (p, postExecute) {
            var _this = this;
            var invoker = null;
            if (angular.isArray(p)) {
                invoker = new common.Common.Invoker(this.$q, p);
            }
            else {
                invoker = new common.Common.Invoker(this.$q, [p]);
            }
            invoker.execute(function () {
                _this.suspendLayers();
            }).then(function (result) {
                if (angular.isFunction(postExecute))
                    postExecute().then(function () {
                        _this.resumeLayers();
                        invoker.clearExecute();
                    });
                else {
                    _this.resumeLayers();
                    invoker.clearExecute();
                }
            });
        };
        esriMap.prototype.getLayersCount = function (dictLayers) {
            var count = 0;
            for (var groupLayers in dictLayers)
                count = count + Object.keys(dictLayers[groupLayers].dictTocUserGroupLayers).length;
            return count;
        };
        esriMap.prototype.getExtentCenter = function (extent) {
            return new common.Common.Point((extent.xmax + extent.xmin) / 2, (extent.ymax + extent.ymin) / 2);
        };
        esriMap.prototype.getExtent = function () {
            return this.extent;
        };
        esriMap.prototype.geometryToWKT = function (geometry) {
            return this.commonService.mapService.geometryToWKT(geometry);
        };
        esriMap.prototype.getCircleData = function (geometry) {
            return this.commonService.mapService.getCircleData(geometry);
        };
        esriMap.prototype.wktToGeometry = function (wkt, geometryType, isWGS1984) {
            if (isWGS1984 === void 0) { isWGS1984 = false; }
            return this.commonService.mapService.wktToJSONGeometry(wkt, isWGS1984);
        };
        esriMap.prototype.setDrawPointTooltip = function (tooltipText) {
            if (tooltipText.length > 0) {
                this._require.load(['dojo/i18n!esri/nls/jsapi']).then(function (bundle) {
                    bundle.toolbars.draw.addPoint = tooltipText;
                });
            }
        };
        esriMap.prototype.setMobileDrawGeomtryTooltip = function (tooltipText) {
            if (tooltipText.length > 0) {
                this._require.load(['dojo/i18n!esri/nls/jsapi']).then(function (bundle) {
                    bundle.toolbars.draw.complete = tooltipText;
                });
            }
        };
        esriMap.prototype.stringFormat = function (useLocale, format, values) {
            var result = '';
            for (var i = 0;;) {
                // Find the next opening or closing brace
                var open = format.indexOf('{', i);
                var close = format.indexOf('}', i);
                if ((open < 0) && (close < 0)) {
                    // Not found: copy the end of the string and break
                    result += format.slice(i);
                    break;
                }
                if ((close > 0) && ((close < open) || (open < 0))) {
                    if (format.charAt(close + 1) !== '}') {
                        throw new Error('format stringFormatBraceMismatch');
                    }
                    result += format.slice(i, close + 1);
                    i = close + 2;
                    continue;
                }
                // Copy the string before the brace
                result += format.slice(i, open);
                i = open + 1;
                // Check for double braces (which display as one and are not arguments)
                if (format.charAt(i) === '{') {
                    result += '{';
                    i++;
                    continue;
                }
                if (close < 0)
                    throw new Error('format stringFormatBraceMismatch');
                // Find the closing brace
                // Get the string between the braces, and split it around the ':' (if any)
                var brace = format.substring(i, close);
                var colonIndex = brace.indexOf(':');
                var argNumber = parseInt((colonIndex < 0) ? brace : brace.substring(0, colonIndex), 10);
                if (isNaN(argNumber))
                    throw new Error('format stringFormatInvalid');
                var argFormat = (colonIndex < 0) ? '' : brace.substring(colonIndex + 1);
                var arg = values[argNumber];
                if (typeof (arg) === "undefined" || arg === null) {
                    arg = '';
                }
                // If it has a toFormattedString method, call it.  Otherwise, call toString()
                if (arg.toFormattedString) {
                    result += arg.toFormattedString(argFormat);
                }
                else if (useLocale && arg.localeFormat) {
                    result += arg.localeFormat(argFormat);
                }
                else if (arg.format && argFormat != '') {
                    result += arg.format(argFormat);
                }
                else
                    result += arg.toString();
                i = close + 1;
            }
            return result;
        };
        esriMap.$inject = [
            'relativeExtentService'
        ];
        esriMap.relativePath = "govmap/widget/govmapmap";
        return esriMap;
    })(Map);
    return esriMap;
});
