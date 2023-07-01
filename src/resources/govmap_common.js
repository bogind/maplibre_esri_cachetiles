var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
define(["require", "exports", "esri/geometry/Point", "esri/geometry/Circle", "esri/geometry/Extent", "esri/geometry/Polyline", "esri/geometry/Polygon", "esri/geometry/screenUtils", "esri/layers/WebTiledLayer", "esri/layers/DynamicMapServiceLayer", "esri/SpatialReference", "esri/symbols/SimpleMarkerSymbol", 'esri/symbols/PictureMarkerSymbol', "esri/symbols/SimpleFillSymbol", "esri/layers/GraphicsLayer", "esri/symbols/SimpleLineSymbol", "esri/graphic", "esri/Color"], function (require, exports, esriPoint, esriCircle, esriExtent, esriPolyline, esriPolygon, ScreenUtils, WebTiledLayer, DynamicMapServiceLayer, SpatialReference, SimpleMarkerSymbol, PictureMarkerSymbol, SimpleFillSymbol, esriGraphicsLayer, SimpleLineSymbol, Graphic, Color) {
    var Common;
    (function (Common) {
        var Invoker = (function () {
            function Invoker($q, commands) {
                this.$q = $q;
                this.commands = commands || new Array();
            }
            Invoker.prototype.addCommand = function (command) {
                this.commands.push(command);
            };
            Invoker.prototype.execute = function (beforeExecute) {
                try {
                    if (beforeExecute && typeof (beforeExecute) == "function")
                        beforeExecute();
                }
                catch (e) {
                    console.log(e);
                }
                var pCommands = new Array();
                for (var i = 0; i < this.commands.length; i++) {
                    try {
                        // console.log(this.commands[i]());
                        pCommands.push(this.commands[i]());
                    }
                    catch (e) {
                        console.log(e);
                        console.log(this.commands[i]());
                    }
                }
                return this.$q.all(pCommands);
            };
            Invoker.prototype.clearExecute = function () {
                this.commands = new Array();
            };
            return Invoker;
        })();
        Common.Invoker = Invoker;
        var Point = (function (_super) {
            __extends(Point, _super);
            function Point(p1, p2) {
                var dstPoint = {
                    "spatialReference": { "wkid": 2039 }
                };
                if (typeof (p1) === "object")
                    angular.extend(dstPoint, p1);
                else {
                    if (typeof p1 == 'string')
                        p1 = parseFloat(p1);
                    if (typeof p2 == 'string')
                        p2 = parseFloat(p2);
                    angular.extend(dstPoint, { "x": p1, "y": p2 });
                }
                _super.call(this, dstPoint);
            }
            return Point;
        })(esriPoint);
        Common.Point = Point;
        var Circle = (function (_super) {
            __extends(Circle, _super);
            function Circle(p1, p2, p3) {
                var point = null;
                if (typeof (p1) === "object") {
                    point = new Point(p1);
                    p3 = p2;
                }
                else {
                    point = new Point(p1, p2);
                }
                _super.call(this, point, {
                    radius: p3
                });
            }
            return Circle;
        })(esriCircle);
        Common.Circle = Circle;
        var MarkerGraphic = (function (_super) {
            __extends(MarkerGraphic, _super);
            function MarkerGraphic(geometry, symbol, attributes) {
                _super.call(this, geometry, symbol, attributes);
            }
            return MarkerGraphic;
        })(Graphic);
        Common.MarkerGraphic = MarkerGraphic;
        var PictureMarkerGraphic = (function (_super) {
            __extends(PictureMarkerGraphic, _super);
            function PictureMarkerGraphic(geometry, symbol, attributes) {
                _super.call(this, geometry, symbol, attributes);
            }
            return PictureMarkerGraphic;
        })(Graphic);
        Common.PictureMarkerGraphic = PictureMarkerGraphic;
        var Polyline = (function (_super) {
            __extends(Polyline, _super);
            function Polyline(p1) {
                var dstPolyline = {
                    "spatialReference": { "wkid": 2039 }
                };
                if (p1 instanceof Array)
                    angular.extend(dstPolyline, { "paths": p1 });
                else if (typeof (p1) === "object")
                    angular.extend(dstPolyline, p1);
                _super.call(this, dstPolyline);
            }
            return Polyline;
        })(esriPolyline);
        Common.Polyline = Polyline;
        var Polygon = (function (_super) {
            __extends(Polygon, _super);
            function Polygon(p1) {
                var dstPolygon = {
                    "spatialReference": { "wkid": 2039 }
                };
                if (p1 instanceof Array)
                    angular.extend(dstPolygon, { "rings": p1 });
                else if (typeof (p1) === "object" && p1 != null)
                    angular.extend(dstPolygon, p1);
                _super.call(this, dstPolygon);
            }
            return Polygon;
        })(esriPolygon);
        Common.Polygon = Polygon;
        var PolygonGraphic = (function (_super) {
            __extends(PolygonGraphic, _super);
            function PolygonGraphic(geometry, symbol, attributes) {
                _super.call(this, geometry, symbol, attributes);
            }
            return PolygonGraphic;
        })(Graphic);
        Common.PolygonGraphic = PolygonGraphic;
        var Extent = (function (_super) {
            __extends(Extent, _super);
            function Extent(p1, p2, p3, p4) {
                var dstExtent = {
                    "spatialReference": { "wkid": 2039 }
                };
                if (typeof (p1) === "object")
                    angular.extend(dstExtent, p1);
                else
                    angular.extend(dstExtent, {
                        xmin: p1,
                        ymin: p2,
                        xmax: p3,
                        ymax: p4
                    });
                _super.call(this, dstExtent);
            }
            return Extent;
        })(esriExtent);
        Common.Extent = Extent;
        var GovmapMapEventHandler = (function () {
            function GovmapMapEventHandler(map) {
                this.disabled = false;
                this.map = map;
                this.callbacks = {};
                for (var e in event) {
                    var key = parseInt(e);
                    this.callbacks[key] = new Array();
                }
                //adding NON map events
                this.eventDefers = {};
                this.eventDefers[event.LAYER_ERROR] = map.$q.defer();
                this.eventDefers[event.LAYER_ERROR].promise.then(null, null, function (data) {
                    ptrThis.executeCallbacks(event.LAYER_ERROR, data);
                });
                var ptrThis = this;
                map.on("extent-change", function (data) {
                    ptrThis.executeCallbacks(event.EXTENT_CHANGE, {
                        delta: data.delta,
                        extent: data.extent,
                        levelChange: data.levelChange,
                        lod: data.lod
                    });
                });
                map.on("load", function (data) {
                    //console.log("mapOnLoad");
                    ptrThis.executeCallbacks(event.MAP_LOAD, data);
                });
                map.on("dbl-click", function (data) {
                    ptrThis.executeCallbacks(event.DOUBLE_CLICK, {
                        'mapPoint': data.mapPoint,
                        'screenPoint': data.screenPoint
                    });
                });
                map.on("click", function (data) {
                    ptrThis.executeCallbacks(event.CLICK, {
                        'mapPoint': data.mapPoint,
                        'screenPoint': data.screenPoint
                    });
                });
                map.on("pan", function (data) {
                    ptrThis.executeCallbacks(event.PAN, {
                        delta: data.delta,
                        extent: data.extent
                    });
                });
                map.on("mouse-move", function (data) {
                    ptrThis.executeCallbacks(event.MOUSE_MOVE, {
                        'mapPoint': data.mapPoint,
                        'screenPoint': data.screenPoint
                    });
                });
                map.on("mouse-over", function (data) {
                    ptrThis.executeCallbacks(event.MOUSE_OVER, {
                        'data': data
                    });
                });
                map.on("mouse-down", function (data) {
                    if (data.button === 2) {
                        ptrThis.executeCallbacks(event.RIGHT_CLICK, {
                            mapPoint: data.mapPoint,
                            screenPoint: data.screenPoint
                        });
                    }
                    if (data.button === 1) {
                        ptrThis.executeCallbacks(event.MOUSE_DOWN, {
                            mapPoint: data.mapPoint,
                            screenPoint: data.screenPoint
                        });
                    }
                });
                map.on("mouse-drag-start", function (data) {
                    ptrThis.executeCallbacks(event.MOUSE_DRAG_START, {
                        mapPoint: data.mapPoint,
                        screenPoint: data.screenPoint
                    });
                });
                map.on("mouse-drag", function (data) {
                    ptrThis.executeCallbacks(event.MOUSE_DRAG, {
                        mapPoint: data.mapPoint,
                        screenPoint: data.screenPoint
                    });
                });
                map.on("resize", function (data) {
                    ptrThis.executeCallbacks(event.RESIZE, {});
                });
            }
            GovmapMapEventHandler.prototype.addEvent = function (event, callback) {
                return this.callbacks[event].push(callback) - 1;
            };
            GovmapMapEventHandler.prototype.removeEvent = function (event, handler) {
                if (event in this.callbacks && handler in this.callbacks[event])
                    delete this.callbacks[event][handler];
            };
            GovmapMapEventHandler.prototype.disableAllEvents = function () {
                this.disabled = true;
                this.map.disablePan();
                this.map.disableScrollWheelZoom();
            };
            GovmapMapEventHandler.prototype.enableAllEvents = function () {
                this.disabled = false;
                this.map.enablePan();
                this.map.enableScrollWheelZoom();
            };
            GovmapMapEventHandler.prototype.notifyEvent = function (event, data) {
                if (event in this.eventDefers) {
                    this.eventDefers[event].notify(data);
                }
            };
            GovmapMapEventHandler.prototype.executeCallbacks = function (event, data) {
                if (this.disabled)
                    return;
                for (var i = 0; i < this.callbacks[event].length; i++) {
                    if (this.callbacks[event] == null)
                        continue;
                    try {
                        this.callbacks[event][i](data);
                    }
                    catch (e) { }
                }
            };
            return GovmapMapEventHandler;
        })();
        Common.GovmapMapEventHandler = GovmapMapEventHandler;
        var GovmapWebTiledLayerOptions = (function () {
            function GovmapWebTiledLayerOptions(obj) {
                this.copyright = ("copyright" in obj) ? obj.copyright : undefined;
                this.fullExtent = ("fullExtent" in obj) ? obj.fullExtent : undefined;
                this.initialExtent = ("initialExtent" in obj) ? obj.initialExtent : undefined;
                this.resampling = ("resampling" in obj) ? obj.resampling : undefined;
                this.resamplingTolerance = ("resamplingTolerance" in obj) ? obj.resamplingTolerance : undefined;
                this.subDomains = ("subDomains" in obj) ? obj.subDomains : undefined;
                this.tileInfo = ("tileInfo" in obj) ? obj.tileInfo : undefined;
                this.layerName = ("layerName" in obj) ? obj.layerName : undefined;
                this.urlTemplate = ("urlTemplate" in obj) ? obj.urlTemplate : undefined;
                this.getUrlFunction = ("getUrlFunction" in obj) ? obj.getUrlFunction : undefined;
                this.id = ("id" in obj) ? obj.id : undefined;
                this.visible = ("visible" in obj) ? obj.visible : undefined;
                this.opacity = ("opacity" in obj) ? obj.opacity : undefined;
                this.rendererId = ("rendererId" in obj) ? obj.rendererId : undefined;
                this.levelsMapping = ("levelsMapping" in obj) ? obj.levelsMapping : undefined;
            }
            return GovmapWebTiledLayerOptions;
        })();
        Common.GovmapWebTiledLayerOptions = GovmapWebTiledLayerOptions;
        var GovmapWebTiledLayer = (function (_super) {
            __extends(GovmapWebTiledLayer, _super);
            function GovmapWebTiledLayer(options) {
                _super.call(this, options.urlTemplate, options);
                this.spatialReference = new SpatialReference({ "wkid": 2039 });
                this.initialExtent = options.initialExtent;
                this.fullExtent = options.fullExtent;
                this.tileInfo = options.tileInfo;
                this.copyright = options.copyright || "";
                this.urlTemplate = options.urlTemplate;
                this.tileServers = options.tileServers || [];
                this.layerName = options.layerName;
                this.loaded = true;
                this.getUrlFunction = options.getUrlFunction;
                this.subDomains = options.subDomains || null;
                this.currentDomain = 0;
                this.levelsMapping = options.levelsMapping || null;
            }
            GovmapWebTiledLayer.prototype.getSubDomain = function () {
                if (this.currentDomain == this.subDomains.length) {
                    this.currentDomain = 0;
                }
                this.currentDomain++;
                return this.subDomains[this.currentDomain - 1];
            };
            GovmapWebTiledLayer.prototype.getTileUrl = function (level, row, column) {
                if (this.getUrlFunction && typeof (this.getUrlFunction) == "function") {
                    return this.getUrlFunction(level, row, column, this);
                }
            };
            return GovmapWebTiledLayer;
        })(WebTiledLayer);
        Common.GovmapWebTiledLayer = GovmapWebTiledLayer;
        var HeatMapLayer = (function (_super) {
            __extends(HeatMapLayer, _super);
            function HeatMapLayer(targetDiv, map, options) {
                var _this = this;
                _super.call(this);
                // defaults
                this.data = [];
                this.loaded = false;
                this.globalMax = 0;
                this.map = map;
                this.config = angular.extend({
                    radius: 40,
                    debug: false,
                    visible: true,
                    gradient: {
                        0.45: "rgb(000,000,255)",
                        0.55: "rgb(000,255,255)",
                        0.65: "rgb(000,255,000)",
                        0.95: "rgb(255,255,000)",
                        1.00: "rgb(255,000,000)"
                    },
                    opacity: 0.5
                }, options);
                this.options = {
                    useLocalMaximum: false,
                    map: this.map,
                    config: this.config
                };
                this.targetDiv = targetDiv;
                // map var                        
                this.options.config.height = this.options.map.height;
                this.options.config.width = this.options.map.width;
                this.options.config.container = this.targetDiv;
                // create heatmap
                this.heatMap = window.h337.create(this.options.config);
                // global maximum value
                // connect on resize
                this.options.map.on("resize", function (evt) {
                    _this.resizeHeatmap(evt.width, evt.height);
                });
                // heatlayer div styling
                targetDiv.style.setProperty("position", "absolute");
                targetDiv.style.setProperty("display", "none");
                //// loaded
                this.loaded = true;
            }
            HeatMapLayer.prototype.configure = function (options) {
                this.config = angular.extend({
                    radius: 40,
                    debug: false,
                    visible: true,
                    gradient: {
                        0.45: "rgb(000,000,255)",
                        0.55: "rgb(000,255,255)",
                        0.65: "rgb(000,255,000)",
                        0.95: "rgb(255,255,000)",
                        1.00: "rgb(255,000,000)"
                    },
                    opacity: 0.5
                }, options);
                this.options = {
                    useLocalMaximum: false,
                    map: this.map,
                    config: this.config
                };
                this.heatMap.configure(options);
            };
            HeatMapLayer.prototype.resizeHeatmap = function (width, height) {
                // set heatmap data size
                this.heatMap._renderer.setDimensions(width, height);
                //this.heatMap.set("width", width);
                //this.heatMap.set("height", height);
                // set width and height of container
                this.targetDiv.style.setProperty("width", width + 'px');
                this.targetDiv.style.setProperty("height", height + 'px');
                // set width and height of canvas element inside of container                      
                if (this.targetDiv.firstChild) {
                    angular.element(this.targetDiv.firstChild).attr({
                        'width': width,
                        'height': height,
                    });
                }
                // set atx canvas width and height fix
                /* var actx = this.heatMap._renderer.shadowCtx;
                 actx.canvas.height = height;
                 actx.canvas.width = width;
                 this.heatMap._renderer.shadowCtx = actx;*/
                // refresh image and heat map size
                this.refresh();
            };
            // stores heatmap converted data into the plugin which renders it
            HeatMapLayer.prototype.storeHeatmapData = function (heatPluginData) {
                // set heatmap data
                this.heatMap.setData(heatPluginData);
            };
            // converts parsed data into heatmap format
            HeatMapLayer.prototype.convertHeatmapData = function (parsedData) {
                // variables
                var xParsed, yParsed, heatPluginData, screenGeometry;
                // set heat plugin data object
                heatPluginData = {
                    max: parsedData.max,
                    data: [] // empty data
                };
                // if data
                if (parsedData.data) {
                    // for all x values
                    for (xParsed in parsedData.data) {
                        // if data[x]
                        if (parsedData.data.hasOwnProperty(xParsed)) {
                            // for all y values and count
                            for (yParsed in parsedData.data[xParsed]) {
                                if (parsedData.data[xParsed].hasOwnProperty(yParsed)) {
                                    // make sure extent is normalized
                                    var normalizedExtent = this.options.map.extent._normalize();
                                    // convert data point into screen geometry
                                    screenGeometry = ScreenUtils.toScreenGeometry(normalizedExtent, this.options.map.width, this.options.map.height, parsedData.data[xParsed][yParsed].dataPoint);
                                    // push to heatmap plugin data array
                                    heatPluginData.data.push({
                                        x: screenGeometry.x,
                                        y: screenGeometry.y,
                                        count: parsedData.data[xParsed][yParsed].count // count value of x,y
                                    });
                                }
                            }
                        }
                    }
                }
                // store in heatmap plugin which will render it
                this.storeHeatmapData(heatPluginData);
            };
            // runs through data and calulates weights and max
            HeatMapLayer.prototype.parseHeatmapData = function (features) {
                if ("valueField" in this.options.config)
                    this.parseHeamapDataValue(features, this.options.config.valueField);
                else
                    this.parseHeamapDataCount(features);
            };
            HeatMapLayer.prototype.parseHeamapDataValue = function (features, valueField) {
                // variables
                var heatPluginData, screenGeometry;
                // set heat plugin data object
                heatPluginData = {
                    data: [] // empty data
                };
                var i, dataPoint, attributes;
                // if data points exist
                if (features) {
                    // for each data point
                    for (i = 0; i < features.length; i++) {
                        // get geometry and normalize it
                        var geo = features[i].point;
                        // create geometry point
                        dataPoint = new esriPoint(geo.x, geo.y, this.options.map.spatialReference);
                        // get extent and normalize it.
                        var normalizedExtent = this.options.map.extent._normalize();
                        // check point
                        var validPoint = false;
                        // if not using local max, point is valid
                        if (!this.options.useLocalMaximum) {
                            validPoint = true;
                        }
                        else if (normalizedExtent.contains(dataPoint)) {
                            validPoint = true;
                        }
                        if (validPoint) {
                            // attributes
                            attributes = features[i].attributes;
                            var normalizedExtent = this.options.map.extent._normalize();
                            // convert data point into screen geometry
                            screenGeometry = ScreenUtils.toScreenGeometry(normalizedExtent, this.options.map.width, this.options.map.height, dataPoint);
                            heatPluginData.data.push(angular.extend(new Object({
                                x: screenGeometry.x,
                                y: screenGeometry.y
                            }), attributes));
                        }
                    }
                    // store in heatmap plugin which will render it
                    this.storeHeatmapData(heatPluginData);
                }
            };
            HeatMapLayer.prototype.parseHeamapDataCount = function (features) {
                // variables
                var i, parsedData, dataPoint, attributes;
                // if data points exist
                if (features) {
                    // create parsed data object
                    parsedData = {
                        max: 0,
                        data: []
                    };
                    if (!this.options.useLocalMaximum) {
                        parsedData.max = this.globalMax;
                    }
                    // for each data point
                    for (i = 0; i < features.length; i++) {
                        // get geometry and normalize it
                        var geo = features[i].point;
                        // create geometry point
                        dataPoint = new esriPoint(geo.x, geo.y, this.options.map.spatialReference);
                        // get extent and normalize it.
                        var normalizedExtent = this.options.map.extent._normalize();
                        // check point
                        var validPoint = false;
                        // if not using local max, point is valid
                        if (!this.options.useLocalMaximum) {
                            validPoint = true;
                        }
                        else if (normalizedExtent.contains(dataPoint)) {
                            validPoint = true;
                        }
                        if (validPoint) {
                            // attributes
                            attributes = features[i].attributes;
                            // if array value is undefined
                            if (!parsedData.data[dataPoint.x]) {
                                // create empty array value
                                parsedData.data[dataPoint.x] = [];
                            }
                            // array value array is undefined
                            if (!parsedData.data[dataPoint.x][dataPoint.y]) {
                                // create object in array
                                parsedData.data[dataPoint.x][dataPoint.y] = {};
                                // if count is defined in datapoint
                                if (attributes && attributes.hasOwnProperty('count')) {
                                    // create array value with count of count set in datapoint
                                    parsedData.data[dataPoint.x][dataPoint.y].count = attributes.count;
                                }
                                else {
                                    // create array value with count of 0
                                    parsedData.data[dataPoint.x][dataPoint.y].count = 0;
                                }
                            }
                            // add 1 to the count
                            parsedData.data[dataPoint.x][dataPoint.y].count += 1;
                            // store dataPoint var
                            parsedData.data[dataPoint.x][dataPoint.y].dataPoint = dataPoint;
                            // if count is greater than current max
                            if (parsedData.max < parsedData.data[dataPoint.x][dataPoint.y].count) {
                                // set max to this count
                                parsedData.max = parsedData.data[dataPoint.x][dataPoint.y].count;
                                if (!this.options.useLocalMaximum) {
                                    this.globalMax = parsedData.data[dataPoint.x][dataPoint.y].count;
                                }
                            }
                        }
                    }
                    // convert parsed data into heatmap plugin formatted data
                    this.convertHeatmapData(parsedData);
                }
            };
            // set data function call
            HeatMapLayer.prototype.setData = function (features) {
                // set width/height
                this.resizeHeatmap(this.options.map.width, this.options.map.height);
                // store points
                this.data = features;
                // create data and then store it
                this.parseHeatmapData(features);
                // redraws the heatmap
                this.refresh();
            };
            // add one feature to the heatmap
            HeatMapLayer.prototype.addDataPoint = function (feature) {
                if (feature) {
                    // push to data
                    this.data.push(feature);
                }
            };
            // return data set of features
            HeatMapLayer.prototype.exportDataSet = function () {
                return this.data;
            };
            // clear data function
            HeatMapLayer.prototype.clearData = function () {
                // empty heat map
                this.heatMap.removeData();
                // empty array
                var empty = [];
                // set data to empty array
                this.setData(empty);
            };
            // get image
            HeatMapLayer.prototype.getImageUrl = function (extent, width, height, callback) {
                // create heatmap data using last data
                this.parseHeatmapData(this.data);
                // image data
                var imageUrl = this.heatMap.getDataURL();
                // callback
                return callback(imageUrl);
            };
            return HeatMapLayer;
        })(DynamicMapServiceLayer);
        Common.HeatMapLayer = HeatMapLayer;
        var GraphicsLayer = (function (_super) {
            __extends(GraphicsLayer, _super);
            function GraphicsLayer(options) {
                _super.call(this, options);
            }
            GraphicsLayer.prototype.count = function () {
                return this.graphics.length;
            };
            return GraphicsLayer;
        })(esriGraphicsLayer);
        var Graphics = (function () {
            function Graphics(map) {
                this.map = map;
                this.graphicLayers = new Array();
                for (var gLayer in Common.graphicLayer) {
                    var graphicLayer = new GraphicsLayer();
                    this.graphicLayers.push({
                        "graphicLayer": graphicLayer,
                        "graphicLayerType": parseInt(gLayer),
                        "graphics": {},
                        sequence: 0
                    }); //initializing graphic layers object and creating graphic layers
                    this.map.addLayer(graphicLayer);
                }
                var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([0, 0, 255]), 2);
                //Initializing selection default symbol
                this.defaultSelectionSymbol = {
                    point: new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 10, lineSymbol, new Color([0, 0, 255])),
                    polyline: lineSymbol,
                    polygon: new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, lineSymbol, new Color([0, 0, 255, 0.50]))
                };
                //End initializing selection default symbol
            }
            Graphics.prototype.getSymbol = function (params, gType) {
                //create and return symbol according to parameters and geometry type
                switch (gType) {
                    case geometryType.POINT:
                        if ("url" in params && "width" in params && "height" in params) {
                            return new PictureMarkerSymbol(params.url, params.width, params.height);
                        }
                        var outlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(params.outlineColor), params.outlineWidth);
                        return new SimpleMarkerSymbol(SimpleLineSymbol.STYLE_SOLID, params.size, outlineSymbol, new Color(params.fillColor));
                    case geometryType.POLYLINE:
                        return new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(params.color), params.width);
                    case geometryType.POLYGON:
                        var outlineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color(params.outlineColor), params.outlineWidth);
                        return new SimpleFillSymbol(SimpleLineSymbol.STYLE_SOLID, outlineSymbol, new Color(params.fillColor));
                }
                return null;
            };
            Graphics.prototype.hide = function () {
                //looping all graphic layer and hide them
                for (var i = 0; i < this.graphicLayers.length; i++) {
                    this.graphicLayers[i].graphicLayer.hide();
                }
            };
            Graphics.prototype.show = function () {
                //looping all graphic layer and show them
                for (var i = 0; i < this.graphicLayers.length; i++) {
                    this.graphicLayers[i].graphicLayer.show();
                }
            };
            Graphics.prototype.clearGraphics = function (layerType) {
                //clear specific layer graphics
                var layer = this.graphicLayers[layerType];
                layer.graphicLayer.clear();
                layer.graphics = {};
                layer.sequence = 0;
            };
            Graphics.prototype.hasGraphic = function (graphic, layerType) {
                //check if graphic exists in the requested layer
                if (!graphic)
                    return false;
                var layer = this.graphicLayers[layerType];
                var gid = graphic.attributes["gov_gid"];
                return gid in layer.graphics;
            };
            Graphics.prototype.getGraphicById = function (graphicId, layerType) {
                //get graphic by graphic id
                var layer = this.graphicLayers[layerType];
                if (graphicId in layer.graphics)
                    return layer.graphics[graphicId];
                return null;
            };
            Graphics.prototype.getGraphicByName = function (graphicName, layerType) {
                //get graphic by graphic name
                var layer = this.graphicLayers[layerType];
                for (var id in layer.graphics) {
                    if ("name" in layer.graphics[id].attributes && layer.graphics[id].attributes["name"] == graphicName)
                        return layer.graphics[id];
                }
                return null;
            };
            Graphics.prototype.refreshGraphicLayer = function (layerType) {
                var layer = this.graphicLayers[layerType];
                layer.graphicLayer.redraw();
            };
            Graphics.prototype.removeGraphic = function (p1, layerType) {
                //removing specific graphic from requested layer
                if (angular.isUndefined(p1) || p1 == null)
                    return;
                var graphic;
                var gid;
                if (typeof p1 == 'number') {
                    gid = p1;
                    graphic = this.getGraphicById(p1, layerType);
                }
                else if (typeof p1 == 'string') {
                    graphic = this.getGraphicByName(p1, layerType);
                    if (graphic)
                        gid = graphic.attributes["gov_gid"];
                }
                else {
                    graphic = p1;
                    gid = graphic.attributes["gov_gid"];
                }
                console.log("gid " + gid);
                var layer = this.graphicLayers[layerType];
                if (this.hasGraphic(graphic, layerType)) {
                    console.log("delete " + gid);
                    delete layer.graphics[gid];
                    layer.graphicLayer.remove(graphic);
                }
                else {
                    console.log("!hasGraphic " + gid);
                }
            };
            Graphics.prototype.removeGraphics = function (graphics, layerType) {
                if (!(graphics && graphics.length > 0))
                    return;
                var layer = this.graphicLayers[layerType];
                for (var i = 0; i < graphics.length; i++) {
                    var gid = graphics[i].attributes["gov_gid"];
                    if (this.hasGraphic(graphics[i], layerType)) {
                        delete layer.graphics[gid];
                        layer.graphicLayer.remove(graphics[i]);
                    }
                }
            };
            Graphics.prototype.moveGraphic = function (p1, layerType, geometry) {
                //change graphic geometry
                if (angular.isUndefined(p1) || p1 == null)
                    return;
                var graphic;
                if (typeof p1 == 'number') {
                    graphic = this.getGraphicById(p1, layerType);
                }
                else {
                    graphic = p1;
                }
                if (!this.hasGraphic(graphic, layerType))
                    return;
                graphic.setGeometry(geometry);
            };
            Graphics.prototype.getNextId = function (layerType) {
                var layer = this.graphicLayers[layerType];
                var id = layer.sequence;
                layer.sequence++;
                return id;
            };
            Graphics.prototype.addGraphic = function (graphic, layerType, name, tooltipContent, bubbleContent, headerContent, wkt, data) {
                var layer = this.graphicLayers[layerType];
                if (!graphic.attributes)
                    graphic.attributes = {};
                var gid = this.getNextId(layerType);
                graphic.attributes["gov_gid"] = gid;
                if (name && name.length > 0)
                    graphic.attributes["name"] = name;
                if (tooltipContent && tooltipContent.length > 0)
                    graphic.attributes["tooltipContent"] = tooltipContent;
                if (bubbleContent && bubbleContent.length > 0)
                    graphic.attributes["bubbleContent"] = bubbleContent;
                if (headerContent && headerContent.length > 0)
                    graphic.attributes["headerContent"] = headerContent;
                if (wkt)
                    graphic.attributes["wkt"] = wkt;
                if (data)
                    graphic.attributes["data"] = data;
                if (layer.graphicLayer.graphics && layer.graphicLayer.graphics.length > 0) {
                    var graphicByName = this.getGraphicByName(name, layerType);
                    if (graphicByName) {
                        this.removeGraphic(graphicByName, layerType);
                    }
                }
                layer.graphicLayer.add(graphic);
                layer.graphics[gid] = graphic;
                return gid;
            };
            Graphics.prototype.addGraphics = function (graphics, layerType, names) {
                var gids = new Array();
                if (!graphics || graphics.length == 0)
                    return gids;
                var name = "";
                for (var i = 0; i < graphics.length; i++) {
                    name = (names && names.length == graphics.length) ? names[i] : "";
                    gids.push(this.addGraphic(graphics[i], layerType, name));
                }
                return gids;
            };
            Graphics.prototype.getSelectionSymbol = function (geometry) {
                switch (geometry.type) {
                    case 'point':
                        return this.defaultSelectionSymbol.point;
                    case 'polyline':
                        return this.defaultSelectionSymbol.polyline;
                    case 'polygon':
                        return this.defaultSelectionSymbol.polygon;
                }
            };
            Graphics.prototype.addSelectionGraphic = function (geometry) {
                var layer = this.graphicLayers[graphicLayer.SELECTION];
                var graphic = new Graphic(geometry, this.getSelectionSymbol(geometry));
                if (!graphic.attributes)
                    graphic.attributes = {};
                var gid = this.getNextId(graphicLayer.SELECTION);
                graphic.attributes["gov_gid"] = gid;
                layer.graphicLayer.add(graphic);
                layer.graphics[gid] = graphic;
                return gid;
            };
            Graphics.prototype.addSelectionGraphics = function (geometries) {
                if (!geometries || geometries.length == 0)
                    return;
                for (var i = 0; i < geometries.length; i++) {
                    this.addSelectionGraphic(geometries[i]);
                }
            };
            Graphics.prototype.onClickMobile = function (layerType, isMobile, callback) {
                if (!callback)
                    return;
                var layer = this.graphicLayers[layerType];
                layer.graphicLayer.enableMouseEvents();
                if (isMobile) {
                    //this.removeOnMouseOver(layer.graphicLayer.on("mouse-over"));
                    return layer.graphicLayer.on("mouse-over", function (eventArgs) {
                        try {
                            callback(eventArgs.graphic || eventArgs.event.graphic, eventArgs.mapPoint.x, eventArgs.mapPoint.y, eventArgs);
                        }
                        catch (e) {
                            console.log(e);
                        }
                    });
                }
                else {
                    //this.removeOnClick(layer.graphicLayer.on("click"));
                    return layer.graphicLayer.on("click", function (eventArgs) {
                        try {
                            callback(eventArgs.graphic || eventArgs.event.graphic, eventArgs.mapPoint.x, eventArgs.mapPoint.y, eventArgs);
                        }
                        catch (e) {
                            console.log(e);
                        }
                    });
                }
            };
            ;
            Graphics.prototype.removeOnClickMobile = function (handle) {
                if (handle) {
                    try {
                        handle.remove();
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
            };
            Graphics.prototype.onClick = function (layerType, callback) {
                if (!callback)
                    return;
                var layer = this.graphicLayers[layerType];
                layer.graphicLayer.enableMouseEvents();
                return layer.graphicLayer.on("click", function (eventArgs) {
                    try {
                        callback(eventArgs.graphic || eventArgs.event.graphic, eventArgs.mapPoint.x, eventArgs.mapPoint.y, eventArgs);
                    }
                    catch (e) {
                        console.log(e);
                    }
                });
            };
            Graphics.prototype.removeOnClick = function (handle) {
                if (handle) {
                    try {
                        handle.remove();
                    }
                    catch (e) {
                        console.log(e);
                    }
                }
            };
            Graphics.prototype.onMouseOver = function (layerType, callback) {
                if (!callback)
                    return;
                var layer = this.graphicLayers[layerType];
                return layer.graphicLayer.on("mouse-over", function (eventArgs) {
                    try {
                        callback(eventArgs.graphic, eventArgs.x, eventArgs.y);
                    }
                    catch (e) {
                    }
                });
            };
            Graphics.prototype.removeOnMouseOver = function (handle) {
                if (handle) {
                    try {
                        handle.remove();
                    }
                    catch (e) {
                    }
                }
            };
            Graphics.prototype.onMouseOut = function (layerType, callback) {
                if (!callback)
                    return;
                var layer = this.graphicLayers[layerType];
                return layer.graphicLayer.on("mouse-out", function (eventArgs) {
                    try {
                        callback(eventArgs.graphic);
                    }
                    catch (e) {
                    }
                });
            };
            Graphics.prototype.removeOnMouseOut = function (handle) {
                if (handle) {
                    try {
                        handle.remove();
                    }
                    catch (e) {
                    }
                }
            };
            return Graphics;
        })();
        Common.Graphics = Graphics;
        var EnumEx = (function () {
            function EnumEx() {
            }
            EnumEx.getEnumToTranslated = function (emumType, index) {
                return emumType.BasePath() + "." + emumType[index];
            };
            EnumEx.getKeys = function (e) {
                return Object.keys(e).filter(function (v) { return isNaN(parseInt(v, 10)); });
            };
            EnumEx.getValues = function (e, requestetKeys) {
                return Object.keys(e).map(function (v) { return parseInt(v, 10); }).filter(function (v) { return !isNaN(v) && (requestetKeys == undefined || requestetKeys.indexOf(v) != -1); });
            };
            EnumEx.getNamesAndValues = function (e, requestetKeys) {
                return EnumEx.getValues(e, requestetKeys).map(function (v) { return { name: String(e[v]), value: v }; });
            };
            return EnumEx;
        })();
        Common.EnumEx = EnumEx;
        var queryString = (function () {
            function queryString() {
            }
            queryString.CENTER = 'c';
            queryString.LEVEL = 'z';
            queryString.BACKGROUND = 'b';
            queryString.BUBBLE_STATE = 'bs';
            queryString.VISIBLE_LAYERS = 'lay';
            queryString.APPLICATION = 'app';
            queryString.FREE_SEARCH = 'q';
            queryString.IDENTIFY_ON_CLICK = 'in';
            queryString.TOC_LAYERS = 'laym';
            queryString.SHOW_XY = 'xy';
            queryString.FILTER_LAYER_NAME = 'ln';
            queryString.FILTER_WHERE = 'wc';
            queryString.FILTER_ZOOM = 'fz';
            queryString.ACTION = 'rq';
            queryString.BG_BUTTON = 'bb';
            queryString.SHOW_BUBBLE = 'sbs';
            queryString.BUBBLE_MAX_WIDTH = 'bmw';
            queryString.ZOOM_BUTTON = 'zb';
            queryString.PLAN_NAME = 'pn';
            queryString.APP_CATEGORY = 'cat';
            queryString.CAT_OPTION = 'op';
            queryString.MIS_HASAVA = 'ma';
            queryString.EMBEDDED_TOGGLE = "et";
            queryString.SET_MAP_MARKER = "mk";
            queryString.LAYERS_MODE = "lm";
            queryString.TRANS_TRIP_ID = "ti";
            queryString.TRANS_ROUTE_ID = "ld";
            queryString.TRANS_DATE = "date";
            queryString.TRANS_DEPARTURE_TIME = "dt";
            queryString.TRANS_STATION_ID = "stationId";
            queryString.API_TOKEN = "api_token";
            //        static USER_TOKEN = "user_token";
            //       static AUTH_DATA = "auth_data";
            queryString.PARENT_HOST = "parentHost";
            queryString.SHARED_BACKGROUND = "sb";
            queryString.LANGUAGE = "lang";
            return queryString;
        })();
        Common.queryString = queryString;
        var UserDefault = (function () {
            function UserDefault() {
            }
            return UserDefault;
        })();
        Common.UserDefault = UserDefault;
        var MyMap = (function () {
            function MyMap() {
            }
            return MyMap;
        })();
        Common.MyMap = MyMap;
        var ActionField = (function () {
            function ActionField() {
            }
            return ActionField;
        })();
        Common.ActionField = ActionField;
        (function (cursorType) {
            cursorType[cursorType["DEFAULT"] = 0] = "DEFAULT";
            cursorType[cursorType["TARGET"] = 1] = "TARGET";
            cursorType[cursorType["MEASURE"] = 2] = "MEASURE";
            cursorType[cursorType["POLYGON"] = 3] = "POLYGON";
            cursorType[cursorType["CIRCLE"] = 4] = "CIRCLE";
            cursorType[cursorType["RECTANGLE"] = 5] = "RECTANGLE";
            cursorType[cursorType["SELECT_FEATURES"] = 6] = "SELECT_FEATURES";
            cursorType[cursorType["ZOOM_IN"] = 7] = "ZOOM_IN";
            cursorType[cursorType["OTHER"] = 8] = "OTHER";
        })(Common.cursorType || (Common.cursorType = {}));
        var cursorType = Common.cursorType;
        ;
        (function (SymbolIconType) {
            SymbolIconType[SymbolIconType["CSS"] = 0] = "CSS";
            SymbolIconType[SymbolIconType["DYNAMIC"] = 1] = "DYNAMIC";
            SymbolIconType[SymbolIconType["ESRI"] = 2] = "ESRI";
        })(Common.SymbolIconType || (Common.SymbolIconType = {}));
        var SymbolIconType = Common.SymbolIconType;
        ;
        (function (geometryType) {
            geometryType[geometryType["POINT"] = 0] = "POINT";
            geometryType[geometryType["POLYLINE"] = 1] = "POLYLINE";
            geometryType[geometryType["POLYGON"] = 2] = "POLYGON";
            geometryType[geometryType["LINE"] = 3] = "LINE";
            geometryType[geometryType["CIRCLE"] = 4] = "CIRCLE";
        })(Common.geometryType || (Common.geometryType = {}));
        var geometryType = Common.geometryType;
        (function (direction) {
            direction[direction["TOP"] = 0] = "TOP";
            direction[direction["RIGHT"] = 1] = "RIGHT";
            direction[direction["LEFT"] = 2] = "LEFT";
            direction[direction["BOTTOM"] = 3] = "BOTTOM";
        })(Common.direction || (Common.direction = {}));
        var direction = Common.direction;
        (function (graphicLayer) {
            graphicLayer[graphicLayer["DEFAULT"] = 0] = "DEFAULT";
            graphicLayer[graphicLayer["SELECTION"] = 1] = "SELECTION";
            graphicLayer[graphicLayer["API"] = 2] = "API";
            graphicLayer[graphicLayer["DRAWING"] = 3] = "DRAWING";
            graphicLayer[graphicLayer["APPLICATION"] = 4] = "APPLICATION";
            graphicLayer[graphicLayer["GPS"] = 5] = "GPS";
        })(Common.graphicLayer || (Common.graphicLayer = {}));
        var graphicLayer = Common.graphicLayer;
        (function (graphicType) {
            graphicType[graphicType["MARKER_SYMBOL"] = 0] = "MARKER_SYMBOL";
            graphicType[graphicType["PICTURE_MARKER_SYMBOL"] = 1] = "PICTURE_MARKER_SYMBOL";
            graphicType[graphicType["POLYGON_SYMBOL"] = 2] = "POLYGON_SYMBOL";
            graphicType[graphicType["POLYLINE_SYMBOL"] = 3] = "POLYLINE_SYMBOL";
        })(Common.graphicType || (Common.graphicType = {}));
        var graphicType = Common.graphicType;
        (function (event) {
            event[event["PAN"] = 0] = "PAN";
            event[event["EXTENT_CHANGE"] = 1] = "EXTENT_CHANGE";
            event[event["MAP_LOAD"] = 2] = "MAP_LOAD";
            event[event["CLICK"] = 3] = "CLICK";
            event[event["DOUBLE_CLICK"] = 4] = "DOUBLE_CLICK";
            event[event["MOUSE_MOVE"] = 5] = "MOUSE_MOVE";
            event[event["RIGHT_CLICK"] = 6] = "RIGHT_CLICK";
            event[event["LAYER_ERROR"] = 7] = "LAYER_ERROR";
            event[event["MOUSE_OVER"] = 8] = "MOUSE_OVER";
            event[event["MOUSE_DRAG_START"] = 9] = "MOUSE_DRAG_START";
            event[event["MOUSE_DRAG"] = 10] = "MOUSE_DRAG";
            event[event["RESIZE"] = 11] = "RESIZE";
            event[event["MOUSE_DOWN"] = 12] = "MOUSE_DOWN";
        })(Common.event || (Common.event = {}));
        var event = Common.event;
        (function (fileUploadState) {
            fileUploadState[fileUploadState["NONE"] = 0] = "NONE";
            fileUploadState[fileUploadState["COMPLETED_UPLOADED"] = 1] = "COMPLETED_UPLOADED";
            fileUploadState[fileUploadState["COMPLETED_NOT_UPLOADED"] = 2] = "COMPLETED_NOT_UPLOADED";
        })(Common.fileUploadState || (Common.fileUploadState = {}));
        var fileUploadState = Common.fileUploadState;
        var filterAction = (function () {
            function filterAction() {
            }
            filterAction.NONE = { "key": 0, "value": "" };
            filterAction.FILTERLAYER = { "key": 1, "value": "filter_layer" };
            return filterAction;
        })();
        Common.filterAction = filterAction;
        (function (mapDeferes) {
            mapDeferes[mapDeferes["EXTENT_CHANGE"] = 0] = "EXTENT_CHANGE";
            mapDeferes[mapDeferes["GEOM_CLICK"] = 1] = "GEOM_CLICK";
        })(Common.mapDeferes || (Common.mapDeferes = {}));
        var mapDeferes = Common.mapDeferes;
        (function (resourceType) {
            resourceType[resourceType["SITE_LAYER"] = 0] = "SITE_LAYER";
            resourceType[resourceType["APPLICATION_LAYER"] = 1] = "APPLICATION_LAYER";
            resourceType[resourceType["EXTERNAL_LAYER"] = 2] = "EXTERNAL_LAYER";
            resourceType[resourceType["BACKGROUND_LAYER"] = 3] = "BACKGROUND_LAYER";
            resourceType[resourceType["USER_LAYER"] = 4] = "USER_LAYER";
            resourceType[resourceType["SELECTION_LAYER"] = 5] = "SELECTION_LAYER";
        })(Common.resourceType || (Common.resourceType = {}));
        var resourceType = Common.resourceType;
        (function (layerType) {
            layerType[layerType["NONE"] = 8] = "NONE";
            layerType[layerType["PUBLISHED"] = 5] = "PUBLISHED";
            layerType[layerType["SHARED"] = 6] = "SHARED";
            layerType[layerType["USER"] = 4] = "USER";
            layerType[layerType["MUNICIPAL"] = 7] = "MUNICIPAL";
            layerType[layerType["SITE"] = 0] = "SITE";
            layerType[layerType["EXTERNAL"] = 3] = "EXTERNAL";
            layerType[layerType["BACKGROUND"] = 1] = "BACKGROUND";
            layerType[layerType["APPLICATION"] = 2] = "APPLICATION";
        })(Common.layerType || (Common.layerType = {}));
        var layerType = Common.layerType;
        (function (bubbleType) {
            bubbleType[bubbleType["GENERIC"] = 0] = "GENERIC";
            bubbleType[bubbleType["HOKMECHER"] = 1] = "HOKMECHER";
            bubbleType[bubbleType["KSHTANN_ASSETS_STATIC"] = 2] = "KSHTANN_ASSETS_STATIC";
            bubbleType[bubbleType["BUS"] = 3] = "BUS";
            bubbleType[bubbleType["IFRAME"] = 5] = "IFRAME";
            bubbleType[bubbleType["BACKGROUND"] = 6] = "BACKGROUND";
            bubbleType[bubbleType["API"] = 7] = "API";
        })(Common.bubbleType || (Common.bubbleType = {}));
        var bubbleType = Common.bubbleType;
        (function (FieldType) {
            FieldType[FieldType["NONE"] = 0] = "NONE";
            FieldType[FieldType["Text"] = 1] = "Text";
            FieldType[FieldType["Number"] = 2] = "Number";
            FieldType[FieldType["Choice"] = 3] = "Choice";
            FieldType[FieldType["MultipleChoice"] = 4] = "MultipleChoice";
            FieldType[FieldType["Link"] = 5] = "Link";
            FieldType[FieldType["Picture"] = 6] = "Picture";
            FieldType[FieldType["GenericTime"] = 7] = "GenericTime";
            FieldType[FieldType["Date"] = 8] = "Date";
        })(Common.FieldType || (Common.FieldType = {}));
        var FieldType = Common.FieldType;
        (function (LayerDataFileTypes) {
            LayerDataFileTypes[LayerDataFileTypes["None"] = 0] = "None";
            LayerDataFileTypes[LayerDataFileTypes["XLS"] = 1] = "XLS";
            LayerDataFileTypes[LayerDataFileTypes["XLSX"] = 2] = "XLSX";
            LayerDataFileTypes[LayerDataFileTypes["CSV"] = 3] = "CSV";
            LayerDataFileTypes[LayerDataFileTypes["ZIP"] = 4] = "ZIP";
        })(Common.LayerDataFileTypes || (Common.LayerDataFileTypes = {}));
        var LayerDataFileTypes = Common.LayerDataFileTypes;
        var FieldType;
        (function (FieldType) {
            function BasePath() {
                return "FieldType";
            }
            FieldType.BasePath = BasePath;
        })(FieldType = Common.FieldType || (Common.FieldType = {}));
        (function (FooterType) {
            FooterType[FooterType["NONE"] = 0] = "NONE";
            FooterType[FooterType["GENERIC"] = 1] = "GENERIC";
            FooterType[FooterType["GENERIC_USER_LOGGED_IN"] = 2] = "GENERIC_USER_LOGGED_IN";
            FooterType[FooterType["USER_DATA"] = 3] = "USER_DATA";
            FooterType[FooterType["USER_ADMIN"] = 4] = "USER_ADMIN";
            FooterType[FooterType["USER_EDITABLE"] = 5] = "USER_EDITABLE"; //  updateEntityDetails, updateEntityLocation options
        })(Common.FooterType || (Common.FooterType = {}));
        var FooterType = Common.FooterType;
        (function (responseStatusCode) {
            responseStatusCode[responseStatusCode["SUCCESS"] = 0] = "SUCCESS";
            responseStatusCode[responseStatusCode["FAIL"] = 1] = "FAIL";
            responseStatusCode[responseStatusCode["VALIDATED"] = 2] = "VALIDATED";
            responseStatusCode[responseStatusCode["NOT_VALIDATED"] = 3] = "NOT_VALIDATED";
        })(Common.responseStatusCode || (Common.responseStatusCode = {}));
        var responseStatusCode = Common.responseStatusCode;
        (function (errorCode) {
            errorCode[errorCode["EXCEPTION"] = 0] = "EXCEPTION";
            errorCode[errorCode["CRITICAL_EXCEPTION"] = 1] = "CRITICAL_EXCEPTION";
            errorCode[errorCode["INVALID_PASSWORD_EMAIL"] = 2] = "INVALID_PASSWORD_EMAIL";
            errorCode[errorCode["MISSING_DATA"] = 3] = "MISSING_DATA";
            errorCode[errorCode["INCORRECT_DATA"] = 4] = "INCORRECT_DATA";
            errorCode[errorCode["TIMEOUT"] = 5] = "TIMEOUT";
            errorCode[errorCode["INVALID_CAPTCHA"] = 6] = "INVALID_CAPTCHA";
        })(Common.errorCode || (Common.errorCode = {}));
        var errorCode = Common.errorCode;
        (function (drawType) {
            drawType[drawType["POINT"] = 0] = "POINT";
            drawType[drawType["POLYLINE"] = 1] = "POLYLINE";
            drawType[drawType["POLYGON"] = 2] = "POLYGON";
            drawType[drawType["CIRCLE"] = 3] = "CIRCLE";
            drawType[drawType["RECTANGLE"] = 4] = "RECTANGLE";
            drawType[drawType["PICTURE"] = 5] = "PICTURE";
            drawType[drawType["FREEHAND_POLYGON"] = 6] = "FREEHAND_POLYGON";
        })(Common.drawType || (Common.drawType = {}));
        var drawType = Common.drawType;
        (function (ComponentType) {
            ComponentType[ComponentType["AUTO_COMPLETE"] = 0] = "AUTO_COMPLETE";
            ComponentType[ComponentType["TEXT"] = 1] = "TEXT";
        })(Common.ComponentType || (Common.ComponentType = {}));
        var ComponentType = Common.ComponentType;
        (function (LocateType) {
            LocateType[LocateType["address"] = 0] = "address";
            LocateType[LocateType["parcel"] = 1] = "parcel";
            LocateType[LocateType["parcelFreeSearch"] = 2] = "parcelFreeSearch";
            LocateType[LocateType["addressFreeSearch"] = 3] = "addressFreeSearch";
        })(Common.LocateType || (Common.LocateType = {}));
        var LocateType = Common.LocateType;
        (function (DisplayView) {
            DisplayView[DisplayView["AllOff"] = 0] = "AllOff";
            DisplayView[DisplayView["Search"] = 1] = "Search";
            DisplayView[DisplayView["Layers"] = 2] = "Layers";
            DisplayView[DisplayView["Apps"] = 3] = "Apps";
        })(Common.DisplayView || (Common.DisplayView = {}));
        var DisplayView = Common.DisplayView;
        (function (SystemConfigActive) {
            SystemConfigActive[SystemConfigActive["systemConfig"] = 0] = "systemConfig";
            SystemConfigActive[SystemConfigActive["cacheType"] = 1] = "cacheType";
            SystemConfigActive[SystemConfigActive["displayView"] = 2] = "displayView";
            SystemConfigActive[SystemConfigActive["AllOff"] = 3] = "AllOff";
        })(Common.SystemConfigActive || (Common.SystemConfigActive = {}));
        var SystemConfigActive = Common.SystemConfigActive;
        (function (StatusUser) {
            StatusUser[StatusUser["notExist"] = 0] = "notExist";
            StatusUser[StatusUser["inProgress"] = 1] = "inProgress";
            StatusUser[StatusUser["reject"] = 2] = "reject";
            StatusUser[StatusUser["finish"] = 3] = "finish";
            StatusUser[StatusUser["notActive"] = 4] = "notActive";
        })(Common.StatusUser || (Common.StatusUser = {}));
        var StatusUser = Common.StatusUser;
        (function (FieldStatuses) {
            FieldStatuses[FieldStatuses["NONE"] = 0] = "NONE";
            FieldStatuses[FieldStatuses["New"] = 1] = "New";
            FieldStatuses[FieldStatuses["Update"] = 2] = "Update";
            FieldStatuses[FieldStatuses["Delete"] = 3] = "Delete";
        })(Common.FieldStatuses || (Common.FieldStatuses = {}));
        var FieldStatuses = Common.FieldStatuses;
        (function (StepEnums) {
            StepEnums[StepEnums["WelcomeScreen"] = 1] = "WelcomeScreen";
            StepEnums[StepEnums["GeneralSettings"] = 2] = "GeneralSettings";
            StepEnums[StepEnums["FileUpload"] = 3] = "FileUpload";
            StepEnums[StepEnums["FilldesSettings"] = 4] = "FilldesSettings";
            StepEnums[StepEnums["Symbologies"] = 5] = "Symbologies";
            StepEnums[StepEnums["ShareSettings"] = 6] = "ShareSettings";
        })(Common.StepEnums || (Common.StepEnums = {}));
        var StepEnums = Common.StepEnums;
        var StepEnums;
        (function (StepEnums) {
            function BasePath() {
                return "CreateLayerWizard.StepEnums";
            }
            StepEnums.BasePath = BasePath;
        })(StepEnums = Common.StepEnums || (Common.StepEnums = {}));
        (function (Language) {
            Language[Language["HE"] = 0] = "HE";
            Language[Language["EN"] = 1] = "EN";
        })(Common.Language || (Common.Language = {}));
        var Language = Common.Language;
        //#region renderers enum
        (function (markerSymbolType) {
            markerSymbolType[markerSymbolType["STYLE_CIRCLE"] = 0] = "STYLE_CIRCLE";
            markerSymbolType[markerSymbolType["STYLE_SQUARE"] = 1] = "STYLE_SQUARE";
            markerSymbolType[markerSymbolType["STYLE_PATH"] = 2] = "STYLE_PATH";
            markerSymbolType[markerSymbolType["STYLE_DIAMOND"] = 3] = "STYLE_DIAMOND";
            markerSymbolType[markerSymbolType["STYLE_X"] = 4] = "STYLE_X";
            markerSymbolType[markerSymbolType["STYLE_CROSS"] = 5] = "STYLE_CROSS";
        })(Common.markerSymbolType || (Common.markerSymbolType = {}));
        var markerSymbolType = Common.markerSymbolType;
        ;
        (function (lineSymbolType) {
            lineSymbolType[lineSymbolType["STYLE_DASH"] = 0] = "STYLE_DASH";
            lineSymbolType[lineSymbolType["STYLE_DASHDOT"] = 1] = "STYLE_DASHDOT";
            lineSymbolType[lineSymbolType["STYLE_DASHDOTDOT"] = 2] = "STYLE_DASHDOTDOT";
            lineSymbolType[lineSymbolType["STYLE_DOT"] = 3] = "STYLE_DOT";
            lineSymbolType[lineSymbolType["STYLE_NULL"] = 4] = "STYLE_NULL";
            lineSymbolType[lineSymbolType["STYLE_SOLID"] = 5] = "STYLE_SOLID";
        })(Common.lineSymbolType || (Common.lineSymbolType = {}));
        var lineSymbolType = Common.lineSymbolType;
        ;
        (function (fillSymbolType) {
            fillSymbolType[fillSymbolType["STYLE_BACKWARD_DIAGONAL"] = 0] = "STYLE_BACKWARD_DIAGONAL";
            fillSymbolType[fillSymbolType["STYLE_CROSS"] = 1] = "STYLE_CROSS";
            fillSymbolType[fillSymbolType["STYLE_DIAGONAL_CROSS"] = 2] = "STYLE_DIAGONAL_CROSS";
            fillSymbolType[fillSymbolType["STYLE_FORWARD_DIAGONAL"] = 3] = "STYLE_FORWARD_DIAGONAL";
            fillSymbolType[fillSymbolType["STYLE_HORIZONTAL"] = 4] = "STYLE_HORIZONTAL";
            fillSymbolType[fillSymbolType["STYLE_NULL"] = 5] = "STYLE_NULL";
            fillSymbolType[fillSymbolType["STYLE_SOLID"] = 6] = "STYLE_SOLID";
            fillSymbolType[fillSymbolType["STYLE_VERTICAL"] = 7] = "STYLE_VERTICAL";
        })(Common.fillSymbolType || (Common.fillSymbolType = {}));
        var fillSymbolType = Common.fillSymbolType;
        ;
        (function (renderer) {
            renderer[renderer["SIMPLE"] = 0] = "SIMPLE";
            renderer[renderer["UNIQUEVALUE"] = 1] = "UNIQUEVALUE";
            renderer[renderer["CLASSBREAKS"] = 2] = "CLASSBREAKS";
        })(Common.renderer || (Common.renderer = {}));
        var renderer = Common.renderer;
        ;
        (function (RowStatus) {
            RowStatus[RowStatus["NONE"] = 0] = "NONE";
            RowStatus[RowStatus["NEW"] = 1] = "NEW";
            RowStatus[RowStatus["UPDATE"] = 2] = "UPDATE";
            RowStatus[RowStatus["DELETE"] = 3] = "DELETE";
        })(Common.RowStatus || (Common.RowStatus = {}));
        var RowStatus = Common.RowStatus;
        ;
        (function (Watch) {
            Watch[Watch["NONE"] = 0] = "NONE";
            Watch[Watch["ONLY_HIS"] = 1] = "ONLY_HIS";
            Watch[Watch["ALL"] = 2] = "ALL";
        })(Common.Watch || (Common.Watch = {}));
        var Watch = Common.Watch;
        ;
        (function (Edit) {
            Edit[Edit["NONE"] = 0] = "NONE";
            Edit[Edit["ONLY_HIS"] = 1] = "ONLY_HIS";
            Edit[Edit["ALL"] = 2] = "ALL";
        })(Common.Edit || (Common.Edit = {}));
        var Edit = Common.Edit;
        ;
        (function (Admin_Users) {
            Admin_Users[Admin_Users["NONE"] = 0] = "NONE";
            Admin_Users[Admin_Users["ADMIN"] = 1] = "ADMIN";
        })(Common.Admin_Users || (Common.Admin_Users = {}));
        var Admin_Users = Common.Admin_Users;
        ;
        (function (Admin_Design) {
            Admin_Design[Admin_Design["NONE"] = 0] = "NONE";
            Admin_Design[Admin_Design["ADMIN"] = 1] = "ADMIN";
        })(Common.Admin_Design || (Common.Admin_Design = {}));
        var Admin_Design = Common.Admin_Design;
        ;
        (function (ElectionsDisplayBy) {
            ElectionsDisplayBy[ElectionsDisplayBy["StatisticArea"] = 0] = "StatisticArea";
            ElectionsDisplayBy[ElectionsDisplayBy["Neighborhood"] = 1] = "Neighborhood";
            ElectionsDisplayBy[ElectionsDisplayBy["City"] = 2] = "City";
        })(Common.ElectionsDisplayBy || (Common.ElectionsDisplayBy = {}));
        var ElectionsDisplayBy = Common.ElectionsDisplayBy;
        (function (AppDisplayBy) {
            AppDisplayBy[AppDisplayBy["StatisticArea"] = 0] = "StatisticArea";
            AppDisplayBy[AppDisplayBy["City"] = 1] = "City";
            AppDisplayBy[AppDisplayBy["District"] = 2] = "District";
            AppDisplayBy[AppDisplayBy["Automatic"] = 3] = "Automatic";
        })(Common.AppDisplayBy || (Common.AppDisplayBy = {}));
        var AppDisplayBy = Common.AppDisplayBy;
        (function (AppRendererType) {
            AppRendererType[AppRendererType["JenksBreaks"] = 2] = "JenksBreaks";
            AppRendererType[AppRendererType["EqualInterval"] = 3] = "EqualInterval";
            AppRendererType[AppRendererType["Quantile"] = 4] = "Quantile";
            AppRendererType[AppRendererType["ClassBreaks"] = 5] = "ClassBreaks";
        })(Common.AppRendererType || (Common.AppRendererType = {}));
        var AppRendererType = Common.AppRendererType;
        (function (AppStyle) {
            AppStyle[AppStyle["Circles"] = 0] = "Circles";
            AppStyle[AppStyle["Polygons"] = 2] = "Polygons";
        })(Common.AppStyle || (Common.AppStyle = {}));
        var AppStyle = Common.AppStyle;
        //#endregion renderers enum
        (function (ElectionsIndice) {
            ElectionsIndice[ElectionsIndice["HighestParty"] = 1] = "HighestParty";
            ElectionsIndice[ElectionsIndice["HighestVoting"] = 2] = "HighestVoting";
            ElectionsIndice[ElectionsIndice["ClosestToResult"] = 3] = "ClosestToResult";
        })(Common.ElectionsIndice || (Common.ElectionsIndice = {}));
        var ElectionsIndice = Common.ElectionsIndice;
        //EmbeddedMapLayersMode
        (function (LayersMode) {
            LayersMode[LayersMode["OnOff"] = 1] = "OnOff";
            LayersMode[LayersMode["OnOffLegend"] = 2] = "OnOffLegend";
            LayersMode[LayersMode["Legend"] = 3] = "Legend";
            LayersMode[LayersMode["None"] = 4] = "None";
        })(Common.LayersMode || (Common.LayersMode = {}));
        var LayersMode = Common.LayersMode;
    })(Common = exports.Common || (exports.Common = {}));
});
