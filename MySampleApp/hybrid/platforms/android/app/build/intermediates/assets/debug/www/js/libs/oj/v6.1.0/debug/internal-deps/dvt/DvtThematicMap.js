/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
"use strict";
define(['./DvtToolkit', './DvtPanZoomCanvas'], function(dvt) {
  // Internal use only.  All APIs and functionality are subject to change at any time.

(function(dvt) {
/**
 * DVT Toolkit based thematic map component
 * @param {dvt.Context} context The rendering context.
 * @param {function} callback The function that should be called to dispatch component events.
 * @param {Obj} callbackObj The object to dispatch component events to
 * @constructor
 */
dvt.ThematicMap = function(context, callback, callbackObj) {
  this.Init(context, callback, callbackObj);
};

dvt.Obj.createSubclass(dvt.ThematicMap, dvt.PanZoomComponent);

/**
 * @const
 */
dvt.ThematicMap.DEFAULT_MAX_ZOOM_FACTOR = 6;

/**
 * Initializes the thematicMap
 * @param {dvt.Context} context The rendering context.
 * @param {function} callback The function that should be called to dispatch component events.
 * @param {Obj} callbackObj The object to dispatch component events to
 * @protected
 */
dvt.ThematicMap.prototype.Init = function(context, callback, callbackObj) {
  dvt.ThematicMap.superclass.Init.call(this, context, callback, callbackObj);

  this._layers = [];
  this._createLayers();
  this._bRendered = false;
  this.Defaults = new DvtThematicMapDefaults();

  this._initialZooming = false;
  this._zooming = false;
  this._panning = false;

  this._selectedAreas = {};

  this._bListenersRemoved = false;
  this._createHandlers();
  this.EventManager.associate(this, this);
};

/**
 * Helper function to create displayable containers
 * @private
 */
dvt.ThematicMap.prototype._createLayers = function() {
  this._areaLayers = new dvt.Container(this.getCtx());
  this._dataAreaLayers = new dvt.Container(this.getCtx());
  this._dataPointLayers = new dvt.Container(this.getCtx());
  this._labelLayers = new dvt.Container(this.getCtx());
  this._linkLayers = new dvt.Container(this.getCtx());
};

/**
 * Returns a new instance of DvtJsonThematicMap. Currently only called by json supported platforms.
 * @param {dvt.Context} context The rendering context.
 * @param {string} callback The function that should be called to dispatch component events.
 * @param {object} callbackObj The optional object instance on which the callback function is defined.
 * @return {dvt.ThematicMap}
 */
dvt.ThematicMap.newInstance = function(context, callback, callbackObj) {
  return new dvt.ThematicMap(context, callback, callbackObj);
};

/**
 * @override
 */
dvt.ThematicMap.prototype.SetOptions = function(options) {
  dvt.ThematicMap.superclass.SetOptions.call(this, options);
  if (dvt.Agent.isEnvironmentTest()) {
    this.Options['animationOnDisplay'] = 'none';
    this.Options['animationOnMapChange'] = 'none';
  }

  var parser = new DvtThematicMapJsonParser(this);
  parser.parse(this.Options);
};

/**
 * Sets the style defaults for this component.
 * @param {Object} defaults The json object containing style defaults
 */
dvt.ThematicMap.prototype.setStyleDefaults = function(defaults) {
  this._styleDefaults = defaults;
};

/**
 * Returns the style defaults for this component.
 * @return {Object} The json object containing style defaults
 */
dvt.ThematicMap.prototype.getStyleDefaults = function() {
  return this._styleDefaults;
};

/**
 * Returns the max zoom factor for this map which could be 1 if zooming is off or
 * a value less than 1 was provided.
 * @return {number}
 */
dvt.ThematicMap.prototype.getMaxZoomFactor = function() {
  var maxZoom = this.Options['maxZoom'];
  if (!this._zooming) {
    return 1;
  }
  else if (!isNaN(maxZoom)) {
    return Math.max(maxZoom, 1);
  }
  else {
    return dvt.ThematicMap.DEFAULT_MAX_ZOOM_FACTOR;
  }
};

/**
 * Returns whether the marker zoom behavior is 'fixed'. Valid values are fixed (default) and zoom.
 * @return {boolean} True if the marker zoom behavior is fixed
 */
dvt.ThematicMap.prototype.isMarkerZoomBehaviorFixed = function() {
  return this.Options['markerZoomBehavior'] == 'fixed';
};

/**
 * Adds a map layer to this thematic map component.
 * @param {DvtMapLayer} layer
 */
dvt.ThematicMap.prototype.addLayer = function(layer) {
  this._layers.push(layer);
};

/**
 * Returns the map layer with the given name.
 * @param {string} layerName
 * @return {DvtMapLayer}
 */
dvt.ThematicMap.prototype.getLayer = function(layerName) {
  for (var i = 0; i < this._layers.length; i++) {
    if (this._layers[i].getLayerName() == layerName)
      return this._layers[i];
  }
};

/**
 * Returns the array of area layer and top level point data layers for this map
 * @return {Array} The array of map layers
 */
dvt.ThematicMap.prototype.getAllLayers = function() {
  return this._layers;
};

/**
 * Returns the displayable containing area layers.
 * @return {dvt.Displayable} The area layer container
 */
dvt.ThematicMap.prototype.getAreaLayerContainer = function() {
  return this._areaLayers;
};

/**
 * Returns the displayable containing data areas.
 * @return {dvt.Displayable} The data area container
 */
dvt.ThematicMap.prototype.getDataAreaContainer = function() {
  return this._dataAreaLayers;
};

/**
 * Returns the displayable containing data markers and images.
 * @return {dvt.Displayable} The data marker and images container
 */
dvt.ThematicMap.prototype.getDataPointContainer = function() {
  return this._dataPointLayers;
};

/**
 * Returns the displayable containing labels.
 * @return {dvt.Displayable} The label container
 */
dvt.ThematicMap.prototype.getLabelContainer = function() {
  return this._labelLayers;
};

/**
 * Returns the displayable containing links.
 * @return {dvt.Displayable} The link container
 */
dvt.ThematicMap.prototype.getLinkContainer = function() {
  return this._linkLayers;
};

/**
 * Sets the map name
 * @param {string} attr The map name
 */
dvt.ThematicMap.prototype.setMapName = function(attr) {
  this._bBaseMapChanged = (this._mapName && this._mapName != attr);
  this._mapName = attr;
};

/**
 * Sets the animation duration for this component
 * @param {string} attr The animation duration in milliseconds
 */
dvt.ThematicMap.prototype.setAnimationDuration = function(attr) {
  this._animationDuration = parseFloat(attr);
};

/**
 * Returns the animation duration for this component
 * @return {Number} The animation duration in milliseconds
 */
dvt.ThematicMap.prototype.getAnimationDuration = function() {
  return this._animationDuration;
};

/**
 * Returns how to display tooltips.
 * @return {string}
 */
dvt.ThematicMap.prototype.getDisplayTooltips = function() {
  var tooltipDisplay = this.Options['tooltipDisplay'];
  switch (tooltipDisplay) {
    case 'shortDesc':
      return 'shortDescOnly';
    case 'none':
      return tooltipDisplay;
    default:
      return 'auto';
  }
};

/**
 * Sets whether initial zooming is enabled.
 * @param {boolean} attr
 */
dvt.ThematicMap.prototype.setInitialZooming = function(attr) {
  this._initialZooming = attr;
};

/**
 * @override
 */
dvt.ThematicMap.prototype.PreRender = function() {
  dvt.ThematicMap.superclass.PreRender.call(this);

  // Set map changed flag before parsing and rendering
  this._bBaseMapChanged = false;

  // 3 cases we need to handle
  // 1. Initial render
  // 2. New base map
  // For case 2 we need to clear the old stored information
  if (!this.IsResize() && this._pzcContainer) {

    // Save reference to check for animations in Render
    this._oldMapProvider = this.Options['mapProvider'];

    this._layers = [];

    this._zooming = true;
    this._panning = true;

    // save a copy of the old pzc for animation
    this._oldPzc = this._pzc;

    this._createLayers();

    this.EventManager.removeListeners(this);
    this._createHandlers();
    this._bListenersRemoved = false;
    // clear data tips from previous event handlers
    this.EventManager.hideTooltip();
    this.EventManager.associate(this, this);
  }
};


/**
 * Creates all the event handlers that this component needs
 * @private
 */
dvt.ThematicMap.prototype._createHandlers = function() {
  // Each Tmap has only one keyboard handler. Each layer has its own event manager
  // because selection modes can differ between layers.
  this.EventManager = new DvtThematicMapEventManager(this.getCtx(), this.dispatchEvent, this);
  this.EventManager.addListeners(this);
  if (!dvt.Agent.isTouchDevice()) {
    this._keyboardHandler = new DvtThematicMapKeyboardHandler(this, this.EventManager);
    this.EventManager.setKeyboardHandler(this._keyboardHandler);
  } else {
    this._keyboardHandler = null;
  }
};

/**
 * @override
 */
dvt.ThematicMap.prototype.Render = function() {
  dvt.ThematicMap.superclass.Render.call(this);
  // Create a new container and render the component into it
  var pzcContainer = new dvt.Container(this.getCtx());
  var cpContainer = new dvt.Container(this.getCtx());
  this._pzc = this.getPanZoomCanvas();
  this._pzc.addChild(pzcContainer);
  this._pzc.getContentPane().addChild(cpContainer);
  this._render(pzcContainer, cpContainer);

  if (!this._areaLayer)
    return;

  // Animation Support
  // Stop any animation in progress
  this.StopAnimation(true);
  var bounds = new dvt.Rectangle(0, 0, this.getWidth(), this.getHeight());
  // 2 types of animations can occur where #2 needs to animate out the old data
  // 1) animation on display
  // 2) animation on base map change

  // Enable basemap animation for mapProvider case
  if (this.getMapName() == null) {
    var newMapProvider = this.Options['mapProvider'];
    if (this._oldMapProvider !== newMapProvider) {
      this._bBaseMapChanged = true;
      this._oldMapProvider = newMapProvider;
    }
  }

  if (!this._bRendered && !this._oldPzc) { // Case 1
    var animOnDisplay = this.Options['animationOnDisplay'];
    animOnDisplay = animOnDisplay === 'auto' ? 'alphaFade' : null;
    if (animOnDisplay) {
      this.Animation = dvt.BlackBoxAnimationHandler.getInAnimation(this.getCtx(), animOnDisplay, this._pzc, bounds, this._animationDuration);
    }
  }
  else if (this._bBaseMapChanged && !this.IsResize()) { // Case 2
    var animOnMapChange = this.Options['animationOnMapChange'];
    animOnMapChange = animOnMapChange === 'auto' ? 'alphaFade' : null;
    if (animOnMapChange) {
      this.Animation = dvt.BlackBoxAnimationHandler.getCombinedAnimation(this.getCtx(), animOnMapChange, this._oldPzc, this._pzc, bounds, this._animationDuration);
      this.addChild(this._oldPzc);
    }
  }

  // If an animation was created, play it
  if (this.Animation) {
    this.EventManager.hideTooltip();
    // Disable event listeners temporarily
    this.EventManager.removeListeners(this);
    this._bListenersRemoved = true;
    // Start the animation
    this.Animation.setOnEnd(this.OnAnimationEnd, this);
    this.Animation.play();
  } else {
    this.OnAnimationEnd();
  }

  // Update the pointers
  this._pzcContainer = pzcContainer;

  // For mashup case, the component who calls this last will get their keyboard handler set on the wrapping div
  // so we need to call this after rendering data layers
  this.getCtx().setKeyboardFocusArray([this]);
  this._bRendered = true;
};

/**
 * Calculate the minimum zoom for this basemap taking into account the pan zoom canvas size
 * @return {number} The minimum zoom for this basemap
 * @private
 */
dvt.ThematicMap.prototype._calcMinZoom = function() {
  var zoomPadding = this._pzc.getZoomToFitPadding();
  var mapDim = this._areaLayer.getLayerDim();
  var pzcDim = this._pzc.getSize();
  var dzx = (pzcDim.w - 2 * zoomPadding) / mapDim.w;
  var dzy = (pzcDim.h - 2 * zoomPadding) / mapDim.h;
  var dz = Math.min(dzx, dzy);
  return dz;
};

/**
 * Renders all layers and subcomponents for this component
 * @param {dvt.Container} pzcContainer A child container of the pan zoom canvas
 * @param {dvt.Container} cpContainer A child container of the pan zoom canvas content pane
 * @private
 */
dvt.ThematicMap.prototype._render = function(pzcContainer, cpContainer) {

  // Add all containers
  cpContainer.addChild(this._areaLayers);
  cpContainer.addChild(this._dataAreaLayers);
  if (this.isMarkerZoomBehaviorFixed())
    pzcContainer.addChild(this._dataPointLayers);
  else
    cpContainer.addChild(this._dataPointLayers);
  pzcContainer.addChild(this._labelLayers);
  pzcContainer.addChild(this._linkLayers);

  // Render all point layers and the first area layer
  var pzcMatrix = this._pzc.getContentPane().getMatrix();
  this._areaLayerRendered = false;
  for (var i = 0; i < this._layers.length; i++) {
    var layer = this._layers[i];
    if ((!this._areaLayerRendered && layer instanceof DvtMapAreaLayer) || !(layer instanceof DvtMapAreaLayer)) {
      layer.render(pzcMatrix);
      if (!this._areaLayerRendered && layer instanceof DvtMapAreaLayer) {
        this._areaLayerRendered = true;
        this._areaLayer = layer;
      }
    }
  }

  if (!this._areaLayer)
    return;

  var isolatedArea = this._areaLayer.getIsolatedArea();
  if (this._isolatedArea != isolatedArea) {
    // if the isolated area changes, ignore any saved zoom/pan states
    this._isolatedArea = isolatedArea;
  }

  this._setInitialKeyboardFocus();

  // Do not set min and max zoom before calling zoom to fit on map
  this._pzc.setMinZoom(null);
  this._pzc.setMaxZoom(null);
  this._pzc.setZoomingEnabled(true);
  this._pzc.setPanningEnabled(true);


  // Zoom to fit before initial render animations so animations will look correct
  // Additional zooming for initialZooming will be applied after animations are complete
  this._pzc.zoomToFit(null, this._areaLayer.getLayerDim());

  // Get the current zoom of the canvas to set min canvas zoom to fit component in viewport
  this._updateZoomLimits();

  this._pzc.setZoomingEnabled(this._zooming);
  this._pzc.setPanningEnabled(this._panning);
  if (this.Options['_resources'])
    this._pzc.setPanCursor(this.Options['_resources']['panCursorUp'], this.Options['_resources']['panCursorDown']);
};

/**
 * Helper to set the initial keyboard focus to a data area, marker or link.
 * @private
 */
dvt.ThematicMap.prototype._setInitialKeyboardFocus = function() {
  if (this._keyboardHandler) {
    var navigables = this.getNavigableAreas();
    if (navigables.length == 0)
      navigables = this.getNavigableMarkers();
    if (navigables.length == 0)
      navigables = this.getNavigableLinks();
    this.EventManager.setInitialFocus(navigables[0]);
  }
};

/**
 * Called on data layer ppr to render a data layer with new data.
 * @param {Object} dataLayerOptions The json object containing data layer information.
 * @param {String} parentLayer The area layer name for this data layer or null
 * @param {boolean} isAreaDataLayer True if we are parsing an area data layer
 */
dvt.ThematicMap.prototype.updateLayer = function(dataLayerOptions, parentLayer, isAreaDataLayer) {
  // Stop any animations before starting layer animations
  this._bRendered = false;
  this.StopAnimation(true);

  // Parse new data layer
  var parser = new DvtThematicMapJsonParser(this);
  parser.ParseDataLayers([dataLayerOptions], this.getLayer(parentLayer), this._areaLayer.getLayerName(), isAreaDataLayer);
  this._bRendered = true;

  // Reset initially focused object with updated data items
  this._setInitialKeyboardFocus();

  // Set component keyboard listener last for mashup case
  this.getCtx().setKeyboardFocusArray([this]);

  // reset zoom limits since we could now have an isolated area after data layer update
  this._updateZoomLimits();
};

/**
 * Fires the ready event if animation has been completed
 * @private
 */
dvt.ThematicMap.prototype._renderCompleted = function() {
  if (!this.AnimationStopped)
    this.RenderComplete();

  // Reset animation flags
  this.Animation = null;
  this.AnimationStopped = false;
};
/**
 * Determines and sets the min and max zoom for the component.
 * @private
 */
dvt.ThematicMap.prototype._updateZoomLimits = function() {
  var fittedZoom = this._calcMinZoom();
  this._pzc.setMinZoom(fittedZoom);
  this._pzc.setMaxZoom(fittedZoom * this.getMaxZoomFactor());
};

/**
 * Hook for updating the component after a data layer update
 * @protected
 */
dvt.ThematicMap.prototype.OnUpdateLayerEnd = function() {
  if (this._areaLayer.getIsolatedArea())
    this._pzc.zoomToFit(null, this._areaLayer.getLayerDim());

  if (this._initialZooming)
    this._zoomData();
  this._renderCompleted();
};

/**
 * Returns the map name.
 * @return {string}
 */
dvt.ThematicMap.prototype.getMapName = function() {
  return this._mapName;
};

/**
 * Handles transforms for containers that aren't updated by the pan zoom canvas
 * @param {dvt.Matrix} pzcMatrix The pan zoom canvas transform
 * @private
 */
dvt.ThematicMap.prototype._transformContainers = function(pzcMatrix) {
  // this._areaLayers, and this._dataAreaLayers transforms handled by pzc

  // update point and label layers with new panX/panY
  var mat = new dvt.Matrix();
  mat.translate(pzcMatrix.getTx(), pzcMatrix.getTy());

  // this._dataPointLayers zoom transforms handled by markers to avoid scaling marker filter effects
  // tx/ty transforms are handled by tmap for better interactivity
  if (this.isMarkerZoomBehaviorFixed())
    this._dataPointLayers.setMatrix(mat);
  this._labelLayers.setMatrix(mat);
  this._linkLayers.setMatrix(mat);
};

/**
 * Constrain the component panning so that we only allow panning when zoomed beyond the current viewport and we don't
 * allow the map to be panned completely outside of the viewport.
 * @param {number} zoom The current component zoom
 * @private
 */
dvt.ThematicMap.prototype._constrainPanning = function(zoom) {
  var padding = this._pzc.getZoomToFitPadding();
  var pzcDim = this._pzc.getSize();
  var viewportDim = new dvt.Rectangle(padding, padding, pzcDim.w - 2 * padding, pzcDim.h - 2 * padding);
  var mapDim = this._areaLayer.getLayerDim();
  var zoomedMapX = mapDim.x * zoom;
  var zoomedMapY = mapDim.y * zoom;
  var zoomedMapW = mapDim.w * zoom;
  var zoomedMapH = mapDim.h * zoom;

  if (zoomedMapW > viewportDim.w) {
    this._pzc.setMinPanX((viewportDim.x + viewportDim.wt) - (zoomedMapX + zoomedMapW));
    this._pzc.setMaxPanX(viewportDim.x - zoomedMapX);
  } else {
    var minMaxX = (viewportDim.x + viewportDim.w) / 2 - (zoomedMapX + zoomedMapW / 2);
    this._pzc.setMinPanX(minMaxX);
    this._pzc.setMaxPanX(minMaxX);
  }

  if (zoomedMapH > viewportDim.h) {
    this._pzc.setMinPanY((viewportDim.y + viewportDim.h) - (zoomedMapY + zoomedMapH));
    this._pzc.setMaxPanY(viewportDim.y - zoomedMapY);
  } else {
    var minMaxY = (viewportDim.y + viewportDim.h) / 2 - (zoomedMapY + zoomedMapH / 2);
    this._pzc.setMinPanY(minMaxY);
    this._pzc.setMaxPanY(minMaxY);
  }
};


/**
 * Updates the dvt.Animator associated with a pan or zoom event with additional properties for containers not added to the content pane.
 * @param {dvt.BaseComponentEvent} event The pan or zoom event
 * @param {boolean} bRecenterObjs Whether to recenter map objects that are pinned to a particular long/lat or x/y coordinate
 * @private
 */
dvt.ThematicMap.prototype._updateAnimator = function(event, bRecenterObjs) {
  var animator = event.getAnimator();
  if (animator) {
    var contentPane = this._pzc.getContentPane();
    var mat = animator.getDestVal(contentPane, contentPane.getMatrix);
    if (bRecenterObjs) {
      this._currentAnimMatrix = contentPane.getMatrix();
      animator.addProp(dvt.Animator.TYPE_MATRIX, this, this._getCenteredObjsMatrix, this._setCenteredObjsMatrix, mat);
    }
    var transMat = new dvt.Matrix(1, 0, 0, 1, mat.getTx(), mat.getTy());
    if (this.isMarkerZoomBehaviorFixed())
      animator.addProp(dvt.Animator.TYPE_MATRIX, this._dataPointLayers, this._dataPointLayers.getMatrix, this._dataPointLayers.setMatrix, transMat);
    animator.addProp(dvt.Animator.TYPE_MATRIX, this._labelLayers, this._labelLayers.getMatrix, this._labelLayers.setMatrix, transMat);
    animator.addProp(dvt.Animator.TYPE_MATRIX, this._linkLayers, this._linkLayers.getMatrix, this._linkLayers.setMatrix, transMat);
  }
};


/**
 * Processes a zoom event for this component and subcomponents.
 * @param {dvt.ZoomEvent} event The event to process
 * @protected
 */
dvt.ThematicMap.prototype.HandleZoomEvent = function(event) {
  var type = event.getSubType();
  switch (type) {
    case dvt.ZoomEvent.SUBTYPE_ADJUST_PAN_CONSTRAINTS:
      // Calculate the new content dimensions based on the new zoom
      if (this._panning)
        this._constrainPanning(event.getNewZoom());
      break;
    case dvt.ZoomEvent.SUBTYPE_ZOOMING:
    case dvt.ZoomEvent.SUBTYPE_ELASTIC_ANIM_BEGIN:
      this._updateAnimator(event, true);
      break;
    case dvt.ZoomEvent.SUBTYPE_ZOOMED:
      var zoom = event.getNewZoom();
      if (zoom != null) {
        var pzcMatrix = this._pzc.getContentPane().getMatrix();
        // null out animator for Flash. Temp fix until  is done.
        event._animator = null;
        this.dispatchEvent(dvt.EventFactory.newThematicMapViewportChangeEvent(pzcMatrix.getTx(), pzcMatrix.getTy(), zoom));

        this._transformContainers(pzcMatrix);

        for (var i = 0; i < this._layers.length; i++)
          this._layers[i].HandleZoomEvent(event, pzcMatrix);
      }
      break;
    case dvt.ZoomEvent.SUBTYPE_ZOOM_AND_CENTER:
      // zoom and center on the current selection from the last clicked data layer
      // this can include both points and areas
      this.fitSelectedRegions();
      break;
    case dvt.ZoomEvent.SUBTYPE_ZOOM_TO_FIT_END:
      // reset pan/zoom state
      this.dispatchEvent(dvt.EventFactory.newThematicMapViewportChangeEvent());
      break;
    default:
      break;
  }
};

/**
 * @override
 */
dvt.ThematicMap.prototype.HandlePanEvent = function(event) {
  var subType = event.getSubType();
  if (subType == dvt.PanEvent.SUBTYPE_ELASTIC_ANIM_BEGIN || subType == dvt.PanEvent.SUBTYPE_PANNING) {
    this._updateAnimator(event, false);
  }
  else if (subType == dvt.PanEvent.SUBTYPE_PANNED) {
    if (event.getNewX() != null) {
      var pzcMatrix = this._pzc.getContentPane().getMatrix();
      // null out animator for Flash. Temp fix until  is done.
      event._animator = null;
      this.dispatchEvent(dvt.EventFactory.newThematicMapViewportChangeEvent(pzcMatrix.getTx(), pzcMatrix.getTy(), this._pzc.getZoom()));

      this._transformContainers(pzcMatrix);

      for (var i = 0; i < this._layers.length; i++)
        this._layers[i].HandlePanEvent(pzcMatrix);
    }
  }
};

/**
 * @override
 */
dvt.ThematicMap.prototype.GetControlPanelBehavior = function() {
  return dvt.PanZoomComponent.CONTROL_PANEL_BEHAVIOR_HIDDEN;
};

/**
 * @override
 */
dvt.ThematicMap.prototype.GetControlPanel = function() {
  return null;
};

/**
 * Sets whether zooming is enabled.
 * @param {boolean} attr
 */
dvt.ThematicMap.prototype.setZooming = function(attr) {
  this._zooming = attr;
};

/**
 * Sets whether panning is enabled.
 * @param {boolean} attr
 */
dvt.ThematicMap.prototype.setPanning = function(attr) {
  this._panning = attr;
};

/**
 * Zooms map to fit the current rendered data
 * @private
 */
dvt.ThematicMap.prototype._zoomData = function() {
  var areaBounds = this._dataAreaLayers.getDimensions();
  var pointBounds = this._dataPointLayers.getDimensions();
  if (this.isMarkerZoomBehaviorFixed()) {
    var mat = this._pzc.getContentPane().getMatrix();
    pointBounds.w /= mat.getA();
    pointBounds.h /= mat.getD();
    pointBounds.x /= mat.getA();
    pointBounds.y /= mat.getD();
  }

  var bounds = areaBounds.getUnion(pointBounds);
  this.StopAnimation(true);

  var maxZoom;
  if (!this._pzc.isZoomingEnabled()) {
    // if zooming is off, temporarily set max zoom factor as if zooming were
    // allowed so zoom to fit isn't constrained
    maxZoom = this._pzc.getMaxZoom();
    this._pzc.setMaxZoom(maxZoom * dvt.ThematicMap.DEFAULT_MAX_ZOOM_FACTOR);
  }

  var animation;
  if (!dvt.Agent.isEnvironmentTest())
    animation = new dvt.Animator(this.getCtx(), .3);
  if (bounds.w > 0 && bounds.h > 0)
    this._pzc.zoomToFit(animation, bounds);
  else
    this._pzc.zoomToFit(animation, this._areaLayer.getLayerDim());
  if (animation)
    animation.play();

  if (maxZoom)
    this._pzc.setMaxZoom(maxZoom);
};

/**
 * Zooms the component to fit the passed in bounds
 * @param {dvt.Rectangle} bounds The bounds to zoom
 * @private
 */
dvt.ThematicMap.prototype._zoomToFitBounds = function(bounds) {
  var animator = new dvt.Animator(this.getCtx(), .3);
  this._pzc.zoomToFit(animator, bounds);
  animator.play();
};

/**
 * Zooms the component to fit a passed in or last clicked area
 * @param {dvt.Path} toFit The area to zoom to fit to
 */
dvt.ThematicMap.prototype.fitRegion = function(toFit) {
  if (!toFit)
    toFit = this._zoomToFitObject;
  if (!toFit)
    toFit = this._clickedObject;
  this._zoomToFitBounds(toFit.getDimensions());
};


/**
 * Zooms the component to fit the currently selected areas
 */
dvt.ThematicMap.prototype.fitSelectedRegions = function() {
  if (this._clickedDataLayerId) {
    var dataLayer = this.getLayer(this._clickedLayerName).getDataLayer(this._clickedDataLayerId);
    if (dataLayer) {
      var selectionHandler = dataLayer._selectionHandler;
      if (selectionHandler) {
        var selection = selectionHandler.getSelection();
        for (var i = 0; i < selection.length; i++) {
          selection[i] = selection[i].getDisplayable();
        }
        if (selection.length > 0) {
          var bounds = selection[0].getDimensions();
          for (var j = 1; j < selection.length; j++)
            bounds = bounds.getUnion(selection[j].getDimensions());
          this._zoomToFitBounds(bounds);
        }
      }
    }
  }
};

/**
 *  Zooms to fit the map within the viewport.
 */
dvt.ThematicMap.prototype.fitMap = function() {
  var animator = new dvt.Animator(this.getCtx(), .3);
  this._pzc.zoomToFit(animator);
  animator.play();
};

/**
 * Returns the array of navigable area logical objects
 * @return {Array} The array of DvtMapAreaPeer objects
 */
dvt.ThematicMap.prototype.getNavigableAreas = function() {
  var areas = [];
  if (this._areaLayer) {
    var dataLayers = this._areaLayer.getDataLayers();
    for (var id in dataLayers) {
      areas = areas.concat(dataLayers[id].getNavigableAreaObjects());
    }
  }
  return areas;
};

/**
 * Returns the array of navigable marker logical objects
 * @return {Array} The array of DvtMapObjPeer objects
 */
dvt.ThematicMap.prototype.getNavigableMarkers = function() {
  var markers = [];
  for (var i = 0; i < this._layers.length; i++) {
    var dataLayers = this._layers[i].getDataLayers();
    for (var id in dataLayers)
      markers = markers.concat(dataLayers[id].getMarkerObjects());
  }
  return markers;
};

/**
 * Returns the array of navigable link logical objects
 * @return {Array} The array of DvtMapLinkPeer objects
 */
dvt.ThematicMap.prototype.getNavigableLinks = function() {
  var navigable = [];
  for (var i = 0; i < this._layers.length; i++) {
    var dataLayers = this._layers[i].getDataLayers();
    for (var id in dataLayers)
      navigable = navigable.concat(dataLayers[id].getLinkObjects());
  }
  return navigable;
};

/**
 * Used for updating the positions of centered objects like markers, images, and labels during animation.
 * @param {dvt.Matrix} matrix The current animation matrix to use for updating the centered objects
 * @private
 */
dvt.ThematicMap.prototype._setCenteredObjsMatrix = function(matrix) {
  this._currentAnimMatrix = matrix;
  // update centered markers and images
  if (this.isMarkerZoomBehaviorFixed()) {
    var objs = this.getNavigableMarkers();
    for (var i = 0; i < objs.length; i++)
      objs[i].HandleZoomEvent(matrix);
    // update centered labels for area and area data layers
    var numLabelLayers = this._labelLayers.getNumChildren();
    for (var j = 0; j < numLabelLayers; j++) {
      var labelLayer = this._labelLayers.getChildAt(j);
      var numLabels = labelLayer.getNumChildren();
      for (var k = 0; k < numLabels; k++) {
        var label = labelLayer.getChildAt(k);
        if (label instanceof DvtMapLabel)
          label.update(matrix);
      }
    }
  }
};

/**
 * Returns the current animation matrix used for updating centered objects
 * @return {dvt.Matrix} The current animation matrix
 * @private
 */
dvt.ThematicMap.prototype._getCenteredObjsMatrix = function() {
  return this._currentAnimMatrix;
};

/**
 * Sets the data layer click info of the last clicked item.
 * @param {string} clientId
 * @param {string} layerName
 * @param {dvt.Displayable} obj
 */
dvt.ThematicMap.prototype.setClickInfo = function(clientId, layerName, obj) {
  this._clickedLayerName = layerName;
  this._clickedDataLayerId = clientId;
  this._clickedObject = obj;
};

/**
 * @override
 */
dvt.ThematicMap.prototype.dispatchEvent = function(event) {
  var type = event['type'];
  if (type == 'selection') {
    this._handleSelectionEvent(event);
  }
  dvt.ThematicMap.superclass.dispatchEvent.call(this, event);
};

/**
 * Process a selection event before sending it to the peer
 * @param {object} event The selection event to process
 * @private
 */
dvt.ThematicMap.prototype._handleSelectionEvent = function(event) {
  if (this._clickedDataLayerId) {
    this._selectedRowKeys = event['selection'];
    var dataLayer = this.getLayer(this._clickedLayerName).getDataLayer(this._clickedDataLayerId);
    this._selectedAreas[this._clickedLayerName] = dataLayer.getSelectedAreas(this._selectedRowKeys);
    event['clientId'] = this._clickedDataLayerId;

    // Save fit to region object
    if (this._clickedObject && !(this._clickedObject instanceof dvt.SimpleMarker || this._clickedObject instanceof dvt.ImageMarker))
      this._zoomToFitObject = this._clickedObject;
  } else {
    this._zoomToFitObject = null;
  }
};

/**
 * @override
 */
dvt.ThematicMap.prototype.destroy = function() {
  var layers = this.getAllLayers();
  for (var i = 0; i < layers.length; i++)
    layers[i].destroy();

  // Always call superclass last for destroy
  dvt.ThematicMap.superclass.destroy.call(this);
};


/**
 * Hook for cleaning up animation behavior at the end of the animation.
 * @protected
 */
dvt.ThematicMap.prototype.OnAnimationEnd = function() {
  if (this._oldPzc) {
    this.removeChild(this._oldPzc);
    this._oldPzc = null;
  }

  // Remove the animation reference
  this._renderCompleted();

  // After the initial render animations we should perform any additional zooms
  if (this._initialZooming)
    this._zoomData();

  // Initial Highlighting
  if (this.Options['highlightedCategories'] && this.Options['highlightedCategories'].length > 0)
    this.highlight(this.Options['highlightedCategories']);

  // Restore event listeners
  if (this._bListenersRemoved) {
    this.EventManager.addListeners(this);
    this._bListenersRemoved = false;
  }
};

/**
 * Returns the automation object for this thematic map
 * @return {dvt.Automation} The automation object
 */
dvt.ThematicMap.prototype.getAutomation = function() {
  if (!this.Automation)
    this.Automation = new DvtThematicMapAutomation(this);
  return this.Automation;
};

/**
 * @override
 */
dvt.ThematicMap.prototype.GetComponentDescription = function() {
  return dvt.Bundle.getTranslatedString(dvt.Bundle.UTIL_PREFIX, 'THEMATIC_MAP');
};

/**
 * @override
 */
dvt.ThematicMap.prototype.highlight = function(categories) {
  // Update the options
  this.Options['highlightedCategories'] = dvt.JsonUtils.clone(categories);

  // Perform the highlighting
  dvt.CategoryRolloverHandler.highlight(categories,
      this.getNavigableAreas().concat(this.getNavigableMarkers()).concat(this.getNavigableLinks()),
      this.Options['highlightMatch'] == 'any');
};

/**
 * Hides or shows default hover effect on the specified data item
 * @param {string} id The data item id
 * @param {boolean} hovered True to show hover effect
 */
dvt.ThematicMap.prototype.processDefaultHoverEffect = function(id, hovered) {
  var dataItem = this._getDataItemById(id);
  if (dataItem)
    dataItem.processDefaultHoverEffect(hovered);
};

/**
 * Hides or shows default selection effect on the specified data item
 * @param {string} id The data item id
 * @param {boolean} selected True to show selection effect
 */
dvt.ThematicMap.prototype.processDefaultSelectionEffect = function(id, selected) {
  var dataItem = this._getDataItemById(id);
  if (dataItem)
    dataItem.processDefaultSelectionEffect(selected);
};

/**
 * Hides or shows default keyboard focus effect on the specified data item
 * @param {string} id The data item id
 * @param {boolean} focused True to show keyboard focus effect
 */
dvt.ThematicMap.prototype.processDefaultFocusEffect = function(id, focused) {
  var dataItem = this._getDataItemById(id);
  if (dataItem)
    dataItem.processDefaultFocusEffect(focused);
};

/**
 * Retrieves a data item by id
 * @param {string} id The id of the data item to retreive
 * @return {DvtMapObjPeer}
 * @private
 */
dvt.ThematicMap.prototype._getDataItemById = function(id) {
  var ctx = this.getCtx();
  for (var i = 0; i < this._layers.length; i++) {
    var dataLayers = this._layers[i].getDataLayers();
    for (var dlId in dataLayers) {
      var dataObjs = dataLayers[dlId].getMarkerObjects();
      for (var j = 0; j < dataObjs.length; j++) {
        if (dvt.Obj.compareValues(ctx, dataObjs[j].getId(), id))
          return dataObjs[j];
      }
    }
  }
  return null;
};

/**
 * Retrieves a map area by area name
 * @param {string} areaName
 * @param {DvtMapDataLayer} dataLayer
 * @return {DvtMapAreaPeer}
 * @private
 */
dvt.ThematicMap.prototype._getAreaFromDataLayer = function(areaName, dataLayer) {
  var dataObjs = dataLayer.getAreaObjects();
  for (var j = 0; j < dataObjs.length; j++) {
    if (dataObjs[j].getLocation() === areaName)
      return dataObjs[j];
  }
  return null;
};

/**
 * Default values and utility functions for thematic map component versioning.
 * @class
 * @constructor
 * @extends {dvt.BaseComponentDefaults}
 */
var DvtThematicMapDefaults = function() {
  this.Init({'fusion': DvtThematicMapDefaults.DEFAULT,
    'alta': DvtThematicMapDefaults.SKIN_ALTA});
};

dvt.Obj.createSubclass(DvtThematicMapDefaults, dvt.BaseComponentDefaults);

/** @const **/
DvtThematicMapDefaults.DEFAULT = {
  'animationDuration' : 500,
  'animationOnDisplay' : 'none',
  'animationOnMapChange' : 'none',
  'highlightMatch' : 'all',
  'hoverBehavior': 'none',
  'initialZooming' : 'none',
  'markerZoomBehavior' : 'fixed',
  'panning' : 'none',
  'tooltipDisplay' : 'auto',
  'touchResponse' : 'auto',
  'visualEffects': 'none',
  'zooming' : 'none',
  'styleDefaults' : {
    'skin' : 'alta',
    '_areaStyle' : {'backgroundColor': '#B8CDEC', 'borderColor': '#FFFFFF'},
    'hoverBehaviorDelay' : 200,
    'dataAreaDefaults' : {
      'borderColor' : '#FFFFFF',
      'hoverColor' : '#FFFFFF',
      'opacity' : 1,
      'selectedInnerColor' : '#FFFFFF',
      'selectedOuterColor' : '#000000'
    },
    'dataMarkerDefaults' : {
      'borderColor' : '#FFFFFF',
      'borderStyle' : 'solid',
      'borderWidth' : 0.5,
      'color' : '#000000',
      'height' : 8,
      'labelStyle' : new dvt.CSSStyle(dvt.BaseComponentDefaults.FONT_FAMILY_SKYROS + dvt.BaseComponentDefaults.FONT_SIZE_13 + 'color:#000000'),
      'opacity' : 0.4,
      'scaleX' : 1,
      'scaleY' : 1,
      'shape' : 'circle',
      'width' : 8
    },
    'linkDefaults' : {
      'color' : '#9bb2c7',
      '_hoverColor' : '#FFFFFF',
      '_selectedColor' : '#000000',
      'width' : 2
    },
    'labelStyle' : new dvt.CSSStyle(dvt.BaseComponentDefaults.FONT_FAMILY_SKYROS + dvt.BaseComponentDefaults.FONT_SIZE_11)
  },
  'resources' : {
    'images' : {},
    'translations' : {}
  }
};

/** @const **/
DvtThematicMapDefaults.SKIN_ALTA = {
  'styleDefaults' : {
    '_areaStyle' : {'backgroundColor': '#DDDDDD', 'borderColor': '#FFFFFF'},
    'dataMarkerDefaults' : {
      'color' : 'rgb(51,51,51)',
      'labelStyle' : new dvt.CSSStyle(dvt.BaseComponentDefaults.FONT_FAMILY_ALTA_12 + 'color:#333333'),
      'opacity' : 1
    },
    'labelStyle' : new dvt.CSSStyle(dvt.BaseComponentDefaults.FONT_FAMILY_ALTA_12)
  }
};

/** @const **/
DvtThematicMapDefaults.DEFAULT_AREA_LAYER = {
  'animationOnLayerChange' : 'none',
  'labelDisplay' : 'auto',
  'labelType' : 'short'
};

/** @const **/
DvtThematicMapDefaults.DEFAULT_DATA_LAYER = {
  'animationOnDataChange' : 'none',
  'selectionMode' : 'none'
};


/**
 * Combines the user options with the defaults for the specified version for an area layer.
 * Returns the combined options object.  This object will contain internal attribute values and should be
 * accessed in internal code only.
 * @param {object} userOptions The object containing options specifications for this component.
 * @param {boolean=} isCustomElement Whether or not the JET component was created as a custom element
 * @return {object} The combined options object.
 */
DvtThematicMapDefaults.prototype.calcAreaLayerOptions = function(userOptions, isCustomElement) {
  var defaultObj = DvtThematicMapDefaults.DEFAULT_AREA_LAYER;
  if (isCustomElement)
    defaultObj = dvt.JsonUtils.merge({'labelDisplay': 'off'}, defaultObj);

  return dvt.JsonUtils.merge(userOptions, defaultObj);
};


/**
 * Combines the user options with the defaults for the specified version for a data layer.
 * Returns the combined options object.  This object will contain internal attribute values and should be
 * accessed in internal code only.
 * @param {object} userOptions The object containing options specifications for this component.
 * @return {object} The combined options object.
 */
DvtThematicMapDefaults.prototype.calcDataLayerOptions = function(userOptions) {
  return dvt.JsonUtils.merge(userOptions, DvtThematicMapDefaults.DEFAULT_DATA_LAYER);
};


/**
 * Scales down gap sizes based on the size of the component.
 * @param {dvt.ThematicMap} tmap The thematic map that is being rendered.
 * @param {Number} defaultSize The default gap size.
 * @return {Number}
 */
DvtThematicMapDefaults.getGapSize = function(tmap, defaultSize) {
  return Math.ceil(defaultSize * tmap.getGapRatio());
};

/**
 * @override
 */
DvtThematicMapDefaults.prototype.getNoCloneObject = function() {
  return {
    'mapProvider': true,
    'areaLayers': {'areaDataLayer': {'areas': true, 'markers': true, 'links': true}},
    'pointDataLayers': {'markers': true, 'links': true},
    'areas': true,
    'markers': true,
    'links': true
  };
};

/**
 * @override
 */
DvtThematicMapDefaults.prototype.getAnimationDuration = function(options)
{ 
  return options['animationDuration'];
};

// APIs called by the ADF Faces drag source for dvt.ThematicMap

/**
 * Returns the current drag source.
 * @return {DvtDragSource}
 * @private
 */
dvt.ThematicMap.prototype._getCurrentDragSource = function() {
  for (var i = 0; i < this._layers.length; i++) {
    var dataLayers = this._layers[i].getDataLayers();
    for (var id in dataLayers) {
      var dataLayer = dataLayers[id];
      var dragSource = dataLayer.getDragSource();
      if (dragSource && dragSource.getDragCandidate())
        return dragSource;
    }
  }
  return null;
};

/**
 * If this object supports drag, returns the client id of the drag component.
 * Otherwise returns null.
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @param {Array} clientIds the array of client ids of the valid drag components
 * @return {boolean}
 */
dvt.ThematicMap.prototype.isDragAvailable = function(mouseX, mouseY, clientIds) {
  this._dragAllowed = false;
  var dragSource = this._getCurrentDragSource();
  return dragSource ? dragSource.isDragAvailable(clientIds) : false;
};

/**
 * Returns the transferable object for a drag initiated at these coordinates.
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @return {Object}
 */
dvt.ThematicMap.prototype.getDragTransferable = function(mouseX, mouseY) {
  var dragSource = this._getCurrentDragSource();
  return dragSource ? dragSource.getDragTransferable(mouseX, mouseY) : null;
};

/**
 * Returns the feedback for the drag operation.
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @return {Object}
 */
dvt.ThematicMap.prototype.getDragOverFeedback = function(mouseX, mouseY) {
  var dragSource = this._getCurrentDragSource();
  return dragSource ? dragSource.getDragOverFeedback(mouseX, mouseY) : null;
};

/**
 * Returns an Object containing the drag context info.
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @return {Object}
 */
dvt.ThematicMap.prototype.getDragContext = function(mouseX, mouseY) {
  var dragSource = this._getCurrentDragSource();
  return dragSource ? dragSource.getDragContext(mouseX, mouseY) : null;
};

/**
 * Returns the offset to use for the drag feedback. This positions the drag
 * feedback relative to the pointer.
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @return {Object}
 */
dvt.ThematicMap.prototype.getDragOffset = function(mouseX, mouseY) {
  var dragSource = this._getCurrentDragSource();
  return dragSource ? dragSource.getDragOffset(mouseX, mouseY) : null;
};


/**
 * Returns the offset from the mouse pointer where the drag is considered to be located.
 * @param {number} xOffset The mouse x-offset
 * @param {number} yOffset The mouse y-offset
 * @return {Object}
 */
dvt.ThematicMap.prototype.getPointerOffset = function(xOffset, yOffset) {
  var dragSource = this._getCurrentDragSource();
  return dragSource ? dragSource.getPointerOffset(xOffset, yOffset) : null;
};


/**
 * Notifies the component that a drag started.
 */
dvt.ThematicMap.prototype.initiateDrag = function() {
  var dragSource = this._getCurrentDragSource();
  if (dragSource)
    dragSource.initiateDrag();
};


/**
 * Clean up after the drag is completed.
 */
dvt.ThematicMap.prototype.dragDropEnd = function() {
  var dragSource = this._getCurrentDragSource();
  if (dragSource)
    dragSource.dragDropEnd();
  // : clean up the pan zoom touches after DnD
  this.getPanZoomCanvas().resetTouchTargets();
};


/**
 * Implemented for dvt.DragRecognizer
 * @override
 */
dvt.ThematicMap.prototype.prepDrag = function() {
  if (this._panning)
    this._startDragDropTimer(1000);
  else
    this._dragAllowed = true;
};


/**
 * Implemented for dvt.DragRecognizer
 * @override
 */
dvt.ThematicMap.prototype.abortPrep = function() {
  this._stopDragDropTimer();
};


/**
 * Implemented for dvt.DragRecognizer
 * @override
 */
dvt.ThematicMap.prototype.recognizeDrag = function() {
  this._stopDragDropTimer();
  return this._dragAllowed;
};


/**
 * Starts the drag timer to prevent immediately initiating a drag action when panning is available
 * @param {number} time The time in milliseconds to set the timer for
 * @private
 */
dvt.ThematicMap.prototype._startDragDropTimer = function(time) {
  this._dragDropTimer = new dvt.Timer(this.getCtx(), time, this._handleDragDropTimer, this, 1);
  this._dragDropTimer.start();
};


/**
 * Stops the drag timer and allows a drag action to initiate
 * @private
 */
dvt.ThematicMap.prototype._handleDragDropTimer = function() {
  this._stopDragDropTimer();
  this._dragAllowed = true;
};


/**
 * Stops the drag timer
 * @private
 */
dvt.ThematicMap.prototype._stopDragDropTimer = function() {
  if (this._dragDropTimer) {
    this._dragDropTimer.stop();
    this._dragDropTimer = null;
  }
};

// APIs called by the ADF Faces drop target for dvt.ThematicMap

/**
 * Returns the current map drop target for the given coordinate
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @return {DvtThematicMapDropTarget}
 * @private
 */
dvt.ThematicMap.prototype._getCurrentDropTarget = function(mouseX, mouseY) {
  for (var i = 0; i < this._layers.length; i++) {
    if (this._layers[i].getDropTarget) {
      var dropTarget = this._layers[i].getDropTarget();
      if (dropTarget && dropTarget.getDropSite(mouseX, mouseY))
        return dropTarget;
    }
  }
  return null;
};

/**
 * If a drop is possible at these mouse coordinates, returns the client id
 * of the drop component. Returns null if drop is not possible.
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @param {Array} clientIds the array of client ids of the valid drag components
 * @return {string}
 */
dvt.ThematicMap.prototype.acceptDrag = function(mouseX, mouseY, clientIds) {
  var zoom = this._pzc.getZoom();
  mouseX = (mouseX - this._pzc.getPanX()) / zoom;
  mouseY = (mouseY - this._pzc.getPanY()) / zoom;
  this._dropTarget = this._getCurrentDropTarget(mouseX, mouseY);
  if (this._dropTarget)
    return this._dropTarget.acceptDrag(mouseX, mouseY, clientIds);
  else
    return null;
};

/**
 * Paints drop site feedback as a drag enters the drop site.
 */
dvt.ThematicMap.prototype.dragEnter = function() {
  if (this._dropTarget)
    this._dropTarget.dragEnter();
};

/**
 * Cleans up drop site feedback as a drag exits the drop site.
 */
dvt.ThematicMap.prototype.dragExit = function() {
  if (this._dropTarget)
    this._dropTarget.dragExit();
};

/**
 * Returns the object representing the drop site. This method is called when a valid
 * drop is performed.
 * @param {number} mouseX The mouse x-coordinate
 * @param {number} mouseY The mouse y-coordinate
 * @return {object} the object representing the drop site
 */
dvt.ThematicMap.prototype.getDropSite = function(mouseX, mouseY) {
  var zoom = this._pzc.getZoom();
  mouseX = (mouseX - this._pzc.getPanX()) / zoom;
  mouseY = (mouseY - this._pzc.getPanY()) / zoom;
  if (this._dropTarget)
    return this._dropTarget.getDropSite(mouseX, mouseY);
  else
    return null;
};

/**
 * Drop Target event handler for dvt.ThematicMap
 * @param {DvtMapAreaLayer} areaLayer The area layer this drop target belongs to
 * @param {String} basemap The basemap name
 * @extends {dvt.DropTarget}
 * @constructor
 */
var DvtThematicMapDropTarget = function(areaLayer, basemap) {
  this._areaLayer = areaLayer;
  this._basemap = basemap;
};

dvt.Obj.createSubclass(DvtThematicMapDropTarget, dvt.DropTarget);


/**
 * @override
 */
DvtThematicMapDropTarget.prototype.acceptDrag = function(mouseX, mouseY, clientIds) {
  // If there is no obj under the point, then don't accept the drag
  var obj = this._areaLayer.__getObjectUnderPoint(mouseX, mouseY);
  if (!obj) {
    this._areaLayer.__showDropSiteFeedback(null);
    return null;
  }
  else if (obj != this._dropSite) {
    this._areaLayer.__showDropSiteFeedback(obj);
    this._dropSite = obj;
  }

  // Return the first clientId, since this component has only a single drag source
  return clientIds[0];
};


/**
 * @override
 */
DvtThematicMapDropTarget.prototype.dragExit = function() {
  // Remove drop site feedback
  this._areaLayer.__showDropSiteFeedback(null);
  this._dropSite = null;
};


/**
 * @override
 */
DvtThematicMapDropTarget.prototype.getDropSite = function(mouseX, mouseY) {
  var obj = this._areaLayer.__getObjectUnderPoint(mouseX, mouseY);
  if (obj) {
    var projPoint = DvtThematicMapProjections.inverseProject(mouseX, mouseY, this._basemap);
    return {regionId: obj.getAreaId(), localX: projPoint.x, localY: projPoint.y};
  } else {
    return null;
  }
};

/**
 * Provides automation services for a DVT component.
 * @class  DvtThematicMapAutomation
 * @param {dvt.ThematicMap} dvtComponent
 * @implements {dvt.Automation}
 * @constructor
 */
var DvtThematicMapAutomation = function(dvtComponent) {
  this._tmap = dvtComponent;
};

dvt.Obj.createSubclass(DvtThematicMapAutomation, dvt.Automation);


/**
 * Valid subIds inlcude:
 * <ul>
 * <li>dataLayerId:area[index]</li>
 * <li>dataLayerId:marker[index]</li>
 * <li>tooltip</li>
 * </ul>
 * @override
 */
DvtThematicMapAutomation.prototype.GetSubIdForDomElement = function(displayable) {
  var logicalObj = this._tmap.getEventManager().GetLogicalObject(displayable);
  if (logicalObj && (logicalObj instanceof DvtMapAreaPeer || logicalObj instanceof DvtMapObjPeer))
    return this._getSubId(logicalObj);
  return null;
};


/**
 * Valid subIds inlcude:
 * <ul>
 * <li>dataLayerId:area[index]</li>
 * <li>dataLayerId:marker[index]</li>
 * <li>tooltip</li>
 * </ul>
 * @override
 */
DvtThematicMapAutomation.prototype.getDomElementForSubId = function(subId) {
  if (subId == dvt.Automation.TOOLTIP_SUBID)
    return this.GetTooltipElement(this._tmap);

  var colonIdx = subId.indexOf(':');
  var parenIdx = subId.indexOf('[');
  if (colonIdx > 0 && parenIdx > 0) {
    var dataLayerId = subId.substring(0, colonIdx);
    var dataObjType = subId.substring(colonIdx + 1, parenIdx);
    var index = parseInt(subId.substring(parenIdx + 1, subId.length - 1));
    return this._getDomElement(dataLayerId, dataObjType, index);
  }
  return null;
};


/**
 * Returns an object containing data for a thematic map data object. Used for verification.
 * Valid verification values inlcude:
 * <ul>
 * <li>color</li>
 * <li>tooltip</li>
 * <li>label</li>
 * <li>selected</li>
 * </ul>
 * @param {String} dataLayerId The id of the data layer
 * @param {String} dataObjType The object type. Valid values are area or marker
 * @param {Number} index The index of the area or marker
 * @return {Object} An object containing data for the marker or area
 */
DvtThematicMapAutomation.prototype.getData = function(dataLayerId, dataObjType, index) {
  var dataObj = this._getDataObject(dataLayerId, dataObjType, index);
  if (dataObj) {
    var data = {};
    data['color'] = dataObj.getDatatipColor();
    data['tooltip'] = dataObj.getShortDesc();
    var label = dataObj.getLabel();
    data['label'] = label ? label.getTextString() : null;
    data['selected'] = dataObj.isSelected();
    return data;
  }
  return null;
};


/**
 * Returns the SVG DOM Element for a given subId
 * @param {String} dataLayerId The id of the data layer
 * @param {String} dataObjType The object type. Valid values are area or marker
 * @param {Number} index The index of the area or marker
 * @return {SVGElement} The SVG DOM Element
 * @private
 */
DvtThematicMapAutomation.prototype._getDomElement = function(dataLayerId, dataObjType, index) {
  var dataObj = this._getDataObject(dataLayerId, dataObjType, index);
  if (dataObj)
    return dataObj.getDisplayable().getElem();
  return null;
};


/**
 * Returns the subId for a thematic map data object
 * @param {DvtMapObjPeer} dataObject The DvtMapObjPeer to get a subId for
 * @return {String} The subId for the DvtMapObjPeer or null if there is no match
 * @private
 */
DvtThematicMapAutomation.prototype._getSubId = function(dataObject) {
  var displayable = dataObject.getDisplayable();
  var layers = this._tmap.getAllLayers();
  for (var i = 0; i < layers.length; i++) {
    var dataLayers = layers[i].getDataLayers();
    for (var id in dataLayers) {
      // A path could be a map area or link
      if (displayable instanceof dvt.Path) {
        var areas = dataLayers[id].getAreaObjects();
        for (var k = 0; k < areas.length; k++) {
          if (areas[k] === dataObject)
            return this._getDataLayerId(id) + ':' + 'area[' + k + ']';
        }
        var links = dataLayers[id].getLinkObjects();
        for (var k = 0; k < links.length; k++) {
          if (links[k] === dataObject)
            return this._getDataLayerId(id) + ':' + 'link[' + k + ']';
        }
      }
      else {
        var markers = dataLayers[id].getMarkerObjects();
        for (var k = 0; k < markers.length; k++) {
          if (markers[k] === dataObject)
            return this._getDataLayerId(id) + ':' + 'marker[' + k + ']';
        }
      }
    }
  }
  return null;
};


/**
 * Returns the DvtMapObjPeer for the given data layer and data object id
 * @param {String} dataLayerId The id of the data layer
 * @param {String} dataObjType The object type. Valid values are area or marker
 * @param {Number} index The index of the area or marker
 * @return {DvtMapObjPeer} The DvtMapObjPeer matching the parameters or null if none exists
 * @private
 */
DvtThematicMapAutomation.prototype._getDataObject = function(dataLayerId, dataObjType, index) {
  var layers = this._tmap.getAllLayers();
  for (var i = 0; i < layers.length; i++) {
    var dataLayers = layers[i].getDataLayers();
    for (var id in dataLayers) {
      if (this._getDataLayerId(id) == dataLayerId) {
        if (dataObjType == 'area') {
          return dataLayers[id].getDataAreaCollection()[index];
        }
        else if (dataObjType == 'marker') {
          return dataLayers[id].getDataMarkerCollection()[index];
        }
        else if (dataObjType == 'link') {
          return dataLayers[id].getDataLinkCollection()[index];
        }
      }
    }
  }
  return null;
};


/**
 * Returns the data layer id in the expected subId format.
 * @param {String} dataLayerId The id of the data layer
 * @return {String} The id of the data layer in subId format
 * @private
 */
DvtThematicMapAutomation.prototype._getDataLayerId = function(dataLayerId) {
  // For ADF the clientId is passed in and we need to parse out just the data layerId e.g. 'demoTemplate:tm1:adl1'
  var colonIdx = dataLayerId.lastIndexOf(':');
  if (colonIdx > 0)
    return dataLayerId.substring(colonIdx + 1);
  return dataLayerId;
};

// Copyright (c) 2011, 2017, Oracle and/or its affiliates. All rights reserved.
/**
 * Creates a selectable map area.
 * @param {dvt.Context} context The rendering context.
 * @param {boolean} bSupportsVectorEffects True if the rendering context supports vector effects
 * @constructor
 */
var DvtSelectablePath = function(context, bSupportsVectorEffects) {
  this.Init(context, bSupportsVectorEffects);
};

dvt.Obj.createSubclass(DvtSelectablePath, dvt.Path);

/** @const **/
DvtSelectablePath.HOVER_STROKE_WIDTH = 2;
/** @const **/
DvtSelectablePath.SELECTED_INNER_STROKE_WIDTH = 1;
/** @const **/
DvtSelectablePath.SELECTED_OUTER_STROKE_WIDTH = 4;
/** @const **/
DvtSelectablePath.SELECTED_HOVER_OUTER_STROKE_WIDTH = 6;


/**
 * Object initializer.
 * @param {dvt.Context} context The rendering context.
 * @param {boolean} bSupportsVectorEffects True if the rendering context supports vector effects
 * @protected
 */
DvtSelectablePath.prototype.Init = function(context, bSupportsVectorEffects) {
  DvtSelectablePath.superclass.Init.call(this, context);
  this.Zoom = 1;
  //IE10, Flash/XML toolkit do not support vector-effects=non-scaling-stroke so we still need to set stroke width based on zoom
  this._bSupportsVectorEffects = bSupportsVectorEffects;
};

/**
 * @override
 */
DvtSelectablePath.prototype.setSelected = function(selected) {
  if (this.IsSelected == selected)
    return;
  if (selected) {
    if (this.isHoverEffectShown()) {
      this.CreateSelectedHoverStrokes();
      this.SelectedHoverInnerStroke = this._adjustStrokeZoomWidth(this.SelectedHoverInnerStroke, DvtSelectablePath.HOVER_STROKE_WIDTH);
      this.SelectedHoverOuterStroke = this._adjustStrokeZoomWidth(this.SelectedHoverOuterStroke, DvtSelectablePath.SELECTED_HOVER_OUTER_STROKE_WIDTH);
    } else {
      this.SelectedInnerStroke = this._adjustStrokeZoomWidth(this.SelectedInnerStroke, DvtSelectablePath.SELECTED_INNER_STROKE_WIDTH);
      this.SelectedOuterStroke = this._adjustStrokeZoomWidth(this.SelectedOuterStroke, DvtSelectablePath.SELECTED_OUTER_STROKE_WIDTH);
    }
  }
  DvtSelectablePath.superclass.setSelected.call(this, selected);
};


/**
 * @override
 */
DvtSelectablePath.prototype.showHoverEffect = function() {
  if (this.isSelected()) {
    this.CreateSelectedHoverStrokes();
    this.SelectedHoverInnerStroke = this._adjustStrokeZoomWidth(this.SelectedHoverInnerStroke, DvtSelectablePath.HOVER_STROKE_WIDTH);
    this.SelectedHoverOuterStroke = this._adjustStrokeZoomWidth(this.SelectedHoverOuterStroke, DvtSelectablePath.SELECTED_HOVER_OUTER_STROKE_WIDTH);
  } else {
    this.HoverInnerStroke = this._adjustStrokeZoomWidth(this.HoverInnerStroke, DvtSelectablePath.HOVER_STROKE_WIDTH);
  }
  DvtSelectablePath.superclass.showHoverEffect.call(this);
};


/**
 * @override
 */
DvtSelectablePath.prototype.CreateSelectedHoverStrokes = function() {
  if (!this.SelectedHoverInnerStroke) {
    this.SelectedHoverInnerStroke = this.HoverInnerStroke.clone();
    this.SelectedHoverInnerStroke.setWidth(DvtSelectablePath.HOVER_STROKE_WIDTH);
    if (this._bSupportsVectorEffects)
      this.SelectedHoverInnerStroke.setFixedWidth(true);
  }
  if (!this.SelectedHoverOuterStroke) {
    this.SelectedHoverOuterStroke = this.SelectedOuterStroke.clone();
    this.SelectedHoverOuterStroke.setWidth(DvtSelectablePath.SELECTED_HOVER_OUTER_STROKE_WIDTH);
    if (this._bSupportsVectorEffects)
      this.SelectedHoverOuterStroke.setFixedWidth(true);
  }
};


/**
 * @override
 */
DvtSelectablePath.prototype.hideHoverEffect = function() {
  if (this.isSelected()) {
    this.SelectedInnerStroke = this._adjustStrokeZoomWidth(this.SelectedInnerStroke, DvtSelectablePath.SELECTED_INNER_STROKE_WIDTH);
    this.SelectedOuterStroke = this._adjustStrokeZoomWidth(this.SelectedOuterStroke, DvtSelectablePath.SELECTED_OUTER_STROKE_WIDTH);
  }
  DvtSelectablePath.superclass.hideHoverEffect.call(this);
};


/**
 * @override
 */
DvtSelectablePath.prototype.setHoverStroke = function(innerStroke, outerStroke) {
  DvtSelectablePath.superclass.setHoverStroke.call(this, innerStroke, outerStroke);
  if (this._bSupportsVectorEffects) {
    if (this.HoverInnerStroke)
      this.HoverInnerStroke.setFixedWidth(true);
    if (this.HoverOuterStroke)
      this.HoverOuterStroke.setFixedWidth(true);
  }
  return this;
};

/**
 * @override
 */
DvtSelectablePath.prototype.setSelectedStroke = function(innerStroke, outerStroke) {
  DvtSelectablePath.superclass.setSelectedStroke.call(this, innerStroke, outerStroke);
  if (this._bSupportsVectorEffects) {
    if (this.SelectedInnerStroke)
      this.SelectedInnerStroke.setFixedWidth(true);
    if (this.SelectedOuterStroke)
      this.SelectedOuterStroke.setFixedWidth(true);
  }
  return this;
};

/**
 * @override
 */
DvtSelectablePath.prototype.setSelectedHoverStroke = function(innerStroke, outerStroke) {
  DvtSelectablePath.superclass.setSelectedHoverStroke.call(this, innerStroke, outerStroke);
  if (this._bSupportsVectorEffects) {
    if (this.SelectedHoverInnerStroke)
      this.SelectedHoverInnerStroke.setFixedWidth(true);
    if (this.SelectedHoverOuterStroke)
      this.SelectedHoverOuterStroke.setFixedWidth(true);
  }
  return this;
};

/**
 * Updates the stroke width for a shape on zoom.
 * @param {DvtPath} shape
 * @param {boolean} fixedWidth
 * @private
 */
DvtSelectablePath.prototype._updateStrokeZoomWidth = function(shape, fixedWidth) {
  if (!this._bSupportsVectorEffects) {
    var stroke = shape.getStroke();
    if (stroke) {
      stroke = stroke.clone();
      stroke.setWidth(fixedWidth / this.Zoom);
      shape.setStroke(stroke);
    }
  }
};

/**
 * Adjusts the stroke width for this map area on zoom and returns a new DvtStroke.
 * @param {DvtStroke} stroke
 * @param {boolean} fixedWidth
 * @return {DvtStroke}
 * @private
 */
DvtSelectablePath.prototype._adjustStrokeZoomWidth = function(stroke, fixedWidth) {
  if (!this._bSupportsVectorEffects) {
    var adjustedStroke = stroke.clone();
    adjustedStroke.setWidth(fixedWidth / this.Zoom);
    return adjustedStroke;
  }
  return stroke;
};

/**
 * Handles a zoom event for the map area.
 * @param {dvt.Matrix} pzcMatrix The pan zoom canvas transform
 */
DvtSelectablePath.prototype.handleZoomEvent = function(pzcMatrix) {
  this.Zoom = pzcMatrix.getA();
  if (this.isSelected()) {
    if (this.isHoverEffectShown()) {
      this._updateStrokeZoomWidth(this.InnerShape, DvtSelectablePath.HOVER_STROKE_WIDTH);
      this._updateStrokeZoomWidth(this, DvtSelectablePath.SELECTED_HOVER_OUTER_STROKE_WIDTH);
    } else {
      this._updateStrokeZoomWidth(this.InnerShape, DvtSelectablePath.SELECTED_INNER_STROKE_WIDTH);
      this._updateStrokeZoomWidth(this, DvtSelectablePath.SELECTED_OUTER_STROKE_WIDTH);
    }
  }
  else if (this.isHoverEffectShown()) {
    this._updateStrokeZoomWidth(this.InnerShape, DvtSelectablePath.HOVER_STROKE_WIDTH);
  }
  else {
    this._updateStrokeZoomWidth(this, 1);
  }
};

// Copyright (c) 2015, 2017, Oracle and/or its affiliates. All rights reserved.
/**
  *  Creates a custom data item that supports interaction and accessibility.
  *  @extends {dvt.Container}
  *  @constructor
  *  @param {dvt.Context} context The rendering context
  *  @param {SVGElement||dvt.BaseComponent} dataItem The custom data item which can be either an SVGElement or a dvt.BaseComponent
  *  @param {object} styles The object containing interaction styling info
  */
var DvtCustomDataItem = function(context, dataItem, styles) {
  this.Init(context, dataItem, styles);
};

dvt.Obj.createSubclass(DvtCustomDataItem, dvt.Container);

/**
 *  Object initializer.
 *  @param {dvt.Context} context The rendering context
 *  @param {SVGElement||dvt.BaseComponent} dataItem The custom data item which can be either an SVGElement or a dvt.BaseComponent
 *  @param {object} styles The object containing interaction styling info
 *  @protected
 */
DvtCustomDataItem.prototype.Init = function(context, dataItem, styles) {
  DvtCustomDataItem.superclass.Init.call(this, context);

  this._dataItem = dataItem;
  if (dataItem instanceof dvt.BaseComponent) {
    this._width = dataItem.getWidth();
    this._height = dataItem.getHeight();
    this.addChild(dataItem);
  } else {
    this.getElem().appendChild(dataItem);//dataItem is output of a custom renderer function or a knockout template @HtmlUpdateOk
    // TODO make this more efficient by defering to render call
    var dim = dvt.DisplayableUtils.getDimensionsForced(context, this);
    this._width = dim.w;
    this._height = dim.h;
  }

  // Create bounding rect where we will apply interaction effects and wai-aria properties
  this._boundingRect = new dvt.Rect(context, 0, 0, this._width, this._height);
  this._boundingRect.setInvisibleFill();
  var his = new dvt.SolidStroke(styles['selectedInnerColor'], 1, 2);
  var hos = new dvt.SolidStroke('rgb(235, 236, 237)', 1, 2);
  var sis = new dvt.SolidStroke(styles['selectedInnerColor'], 1, 1);
  var sos = new dvt.SolidStroke(styles['selectedOuterColor'], 1, 2);
  var shis = new dvt.SolidStroke(styles['selectedInnerColor'], 1, 2);
  var shos = new dvt.SolidStroke(styles['selectedOuterColor'], 1, 2);
  this._boundingRect.setHoverStroke(his, hos).setSelectedStroke(sis, sos).setSelectedHoverStroke(shis, shos);
  // Bounding rect stroke alignment is set to OUTER.
  // For OUTER stroke alignment, the stroke is applied on the outer edge of the path of the bounding rect.
  // The outer stroke will circumscribe inner stroke and the width of outer stroke won't be reduced by inner stroke.
  // The outer stroke visible width will be same as specified.
  this._boundingRect.setStrokeAlignment(dvt.Stroke.OUTER);
  this.addChildAt(this._boundingRect, 0);
};

/**
 * For accessibility, a custom svg data item sets wai-aria information on its bounding rect for VoiceOver.
 * @override
 */
DvtCustomDataItem.prototype.setAriaProperty = function(property, value) {
  if (dvt.Agent.isTouchDevice())
    this._boundingRect.setAriaProperty(property, value);
  else
    DvtCustomDataItem.superclass.setAriaProperty.call(this, property, value);
};

/**
 * For accessibility, a custom svg data item sets wai-aria information on its bounding rect for VoiceOver.
 * @override
 */
DvtCustomDataItem.prototype.setAriaRole = function(role) {
  if (dvt.Agent.isTouchDevice())
    this._boundingRect.setAriaRole(role);
  else
    DvtCustomDataItem.superclass.setAriaRole.call(this, role);
};

/**
 * Returns the width of the custom svg dom element
 * @return {number}
 */
DvtCustomDataItem.prototype.getWidth = function() {
  return this._width;
};

/**
 * Returns the height of the custom svg dom element
 * @return {number}
 */
DvtCustomDataItem.prototype.getHeight = function() {
  return this._height;
};

/**
 * Sets whether this data item is selectable.
 * Implemented to match selection APIs on dvt.Shape called by the DvtMapObjPeer.
 * @param {boolean} bSelectable True if this data item is selectable
 */
DvtCustomDataItem.prototype.setSelectable = function(bSelectable) {
  this._boundingRect.setSelectable(bSelectable);
};

/**
 * Returns true if this data item is selectable.
 * Implemented to match selection APIs on dvt.Shape called by the DvtMapObjPeer.
 * @return {boolean}
 */
DvtCustomDataItem.prototype.isSelectable = function() {
  return this._boundingRect.isSelectable();
};

/**
 * Returns whether this data item is selected.
 * Implemented to match selection APIs on dvt.Shape called by the DvtMapObjPeer.
 * @return {boolean}
 */
DvtCustomDataItem.prototype.isSelected = function() {
  return this._boundingRect.isSelected();
};

/**
 * Sets whether this data item is selected.
 * Implemented to match selection APIs on dvt.Shape called by the DvtMapObjPeer.
 * @param {boolean} selected True if this data item is selected
 */
DvtCustomDataItem.prototype.setSelected = function(selected) {
  this._boundingRect.setSelected(selected);
};

/**
 * Shows the hover effect for this displayable.
 * Implemented to match selection APIs on dvt.Shape called by the DvtMapObjPeer.
 */
DvtCustomDataItem.prototype.showHoverEffect = function() {
  this._boundingRect.showHoverEffect();
};

/**
 * Hides the hover effect for this displayable.
 * Implemented to match selection APIs on dvt.Shape called by the DvtMapObjPeer.
 */
DvtCustomDataItem.prototype.hideHoverEffect = function() {
  this._boundingRect.hideHoverEffect();
};

/**
 * Returns the root element representing this data item which can either be a custom svg element or a DvtBaseComopnent.
 * @return {SVGElement|dvt.BaseComponent}
 */
DvtCustomDataItem.prototype.getRootElement = function() {
  return this._dataItem;
};

/**
 * Updates the current root element representing this data item which can either be a custom svg element or a DvtBaseComopnent
 * with the new which is used to update interaction effects.
 * @param {SVGElement|dvt.BaseComponent} rootElement The new root element
 */
DvtCustomDataItem.prototype.updateRootElement = function(rootElement) {
  if (this._dataItem === rootElement)
    return;

  if (this._dataItem)
    this._dataItem instanceof dvt.BaseComponent ? this.removeChild(this._dataItem) : this.getElem().removeChild(this._dataItem);

  // NOTE: Not updating width/height in this method call because we're assuming
  // that the application wouldn't want to recenter based on increased dimensions
  // caused by selection effects.
  if (rootElement instanceof dvt.BaseComponent)
    this.addChild(rootElement);
  else
    this.getElem().appendChild(rootElement);//rootElement is output of a custom renderer function or a knockout template @HtmlUpdateOk
  this._dataItem = rootElement;
};

/**
 * @override
 */
DvtCustomDataItem.prototype.fireKeyboardListener = function(event) {
  if (this._dataItem instanceof dvt.BaseComponent)
    this._dataItem.fireKeyboardListener(event);
};

// For MAF this != window and we want to use this
// For JET this isn't available in use strict mode so we want to use window
/**
 * Utility class for storing built-in basemap info.
 */
var DvtBaseMapManager;
if (this) {
  if (this['DvtBaseMapManager']) {
    DvtBaseMapManager = this['DvtBaseMapManager'];
  } else {
    DvtBaseMapManager = {};
    this['DvtBaseMapManager'] = DvtBaseMapManager;
    DvtBaseMapManager['_UNPROCESSED_MAPS'] = [[], [], []];
    DvtBaseMapManager['_UNPROCESSED_PARENT_UPDATES'] = [[]];
  }
} else {
  if (window['DvtBaseMapManager']) {
    DvtBaseMapManager = window['DvtBaseMapManager'];
  } else {
    DvtBaseMapManager = {};
    window['DvtBaseMapManager'] = DvtBaseMapManager;
    DvtBaseMapManager['_UNPROCESSED_MAPS'] = [[], [], []];
    DvtBaseMapManager['_UNPROCESSED_PARENT_UPDATES'] = [[]];
  }
}

dvt.Obj.createSubclass(DvtBaseMapManager, dvt.Obj, 'DvtBaseMapManager');
/** @const */
DvtBaseMapManager.TYPE_LABELS = 0;// contain region labels
/** @const */
DvtBaseMapManager.TYPE_PATH = 1;// contain region paths
/** @const */
DvtBaseMapManager.TYPE_PARENTREGION_CHILDREN = 2;// contains parent region id to current region id mappings.  Stored this way since mapping is only needed if child layer is present.
/** @const */
DvtBaseMapManager.TYPE_LABELINFO = 3;// contains leaderline info
/** @const */
DvtBaseMapManager.TYPE_DIM = 4; //basemap dimensions
/** @const @private */
DvtBaseMapManager._INDEX = '__index';
/** @const @private */
DvtBaseMapManager._GLOBAL_MAPS = new Object();

/**
 * Returns the dimensions for a built-in map
 * @param {string} baseMapName The basemap name
 * @param {string} layerName The layer name
 * @return {dvt.Rectangle}
 */
DvtBaseMapManager.getBaseMapDim = function(baseMapName, layerName) {
  DvtBaseMapManager._processUnprocessedMaps();
  var layer = DvtBaseMapManager._GLOBAL_MAPS[baseMapName][layerName];
  if (layer) {
    var dimAr = layer[DvtBaseMapManager.TYPE_DIM];
    if (dimAr)
      return new dvt.Rectangle(dimAr[0], dimAr[1], dimAr[2], dimAr[3]);
  }
  return null;
};

/**
 * Returns area label info for a basemap layer
 * @param {string} baseMapName The basemap name
 * @param {string} layerName The layer name
 * @return {Array}
 */
DvtBaseMapManager.getAreaLabelInfo = function(baseMapName, layerName) {
  DvtBaseMapManager._processUnprocessedMaps();
  var layer = DvtBaseMapManager._GLOBAL_MAPS[baseMapName][layerName];
  if (layer)
    return layer[DvtBaseMapManager.TYPE_LABELINFO];
  else
    return null;
};

/**
 * Returns the array of area ids for the given base map and layer
 * @param {string} baseMapName The name of the basemap
 * @param {string} layerName The name of the layer
 * @return {Array}
 */
DvtBaseMapManager.getAreaIds = function(baseMapName, layerName) {
  var areanames = [];
  var paths = DvtBaseMapManager.getAreaPaths(baseMapName, layerName);
  for (var area in paths)
    areanames.push(area);
  return areanames;
};

/**
 * Returns a map of area id to long and short area labels for a given base map and layer
 * @param {string} baseMapName The name of the basemap
 * @param {string} layerName The name of the layer
 * @return {Object}
 */
DvtBaseMapManager.getAreaLabels = function(baseMapName, layerName) {
  DvtBaseMapManager._processUnprocessedMaps();
  var layer = DvtBaseMapManager._GLOBAL_MAPS[baseMapName][layerName];
  if (layer)
    return layer[DvtBaseMapManager.TYPE_LABELS];
  else
    return null;
};

/**
 * Returns the long area label for a particular area.
 * @param {string} baseMapName The basemap name
 * @param {string} layerName The layer name
 * @param {string} areaId The area id
 * @return {string}
 */
DvtBaseMapManager.getLongAreaLabel = function(baseMapName, layerName, areaId) {
  DvtBaseMapManager._processUnprocessedMaps();
  var layer = DvtBaseMapManager._GLOBAL_MAPS[baseMapName][layerName];
  var labels;
  if (layer)
    labels = layer[DvtBaseMapManager.TYPE_LABELS];
  if (labels && labels[areaId])
    return labels[areaId][1];
  else
    return null;
};

/**
 * Returns the city coordinates for a built-in city
 * @param {string} baseMapName The basemap name
 * @param {string} city The city id
 * @return {dvt.Point}
 */
DvtBaseMapManager.getCityCoordinates = function(baseMapName, city) {
  DvtBaseMapManager._processUnprocessedMaps();
  var basemap = DvtBaseMapManager._GLOBAL_MAPS[baseMapName];
  if (basemap) {
    var cityLayer = basemap['cities'];
    if (cityLayer) {
      var coords = cityLayer[DvtBaseMapManager.TYPE_PATH][city];
      if (coords)
        return new dvt.Point(coords[0], coords[1]);
    }
  }
  return null;
};

/**
 * Returns the city label for a built-in city
 * @param {string} baseMapName The basemap name
 * @param {string} city The city id
 * @return {string}
 */
DvtBaseMapManager.getCityLabel = function(baseMapName, city) {
  DvtBaseMapManager._processUnprocessedMaps();
  var basemap = DvtBaseMapManager._GLOBAL_MAPS[baseMapName];
  if (basemap) {
    var cityLayer = basemap['cities'];
    if (cityLayer) {
      var cityLabel = cityLayer[DvtBaseMapManager.TYPE_LABELS][city];
      if (cityLabel)
        return cityLabel[1];
    }
  }
  return null;
};

/**
 * Returns the center of an area
 * @param {string} baseMapName The basemap name
 * @param {string} layerName The layer name
 * @param {string} areaId The area id
 * @return {dvt.Point}
 */
DvtBaseMapManager.getAreaCenter = function(baseMapName, layerName, areaId) {
  DvtBaseMapManager._processUnprocessedMaps();
  var basemap = DvtBaseMapManager._GLOBAL_MAPS[baseMapName];
  if (basemap) {
    var layer = basemap[layerName];
    if (layer) {
      var labelInfo = layer[DvtBaseMapManager.TYPE_LABELINFO];
      if (labelInfo && labelInfo[areaId]) {
        var ar = labelInfo[areaId][0];
        var bounds = dvt.Rectangle.create(ar);
        return bounds.getCenter();
      }
    }
  }
  return null;
};

/**
 * Returns a map of area IDs and their paths for a given basemap layer
 * @param {string} baseMapName The basemap name
 * @param {string} layerName The layer name
 * @param {number} viewportW The map viewport width
 * @param {number} viewportH The map viewport height
 * @param {number} zoomFactor The max basemap zoom factor
 * @return {Object}
 */
DvtBaseMapManager.getAreaPaths = function(baseMapName, layerName, viewportW, viewportH, zoomFactor) {
  DvtBaseMapManager._processUnprocessedMaps();
  var layer = DvtBaseMapManager._GLOBAL_MAPS[baseMapName][layerName];
  var paths = layer[DvtBaseMapManager.TYPE_PATH];
  var dimAr = layer[DvtBaseMapManager.TYPE_DIM];
  if (dimAr)
    return DvtBaseMapManager._simplifyAreaPaths(paths, dimAr[2], dimAr[3], viewportW, viewportH, zoomFactor);
  return paths;
};

/**
 * Returns the path commands for an area
 * @param {string} baseMapName The basemap name
 * @param {string} layerName The layer name
 * @param {string} area The area
 * @return {string}
 */
DvtBaseMapManager.getPathForArea = function(baseMapName, layerName, area) {
  DvtBaseMapManager._processUnprocessedMaps();
  var layer = DvtBaseMapManager._GLOBAL_MAPS[baseMapName][layerName];
  if (layer)
    return layer[DvtBaseMapManager.TYPE_PATH][area];
  return null;
};

/**
 * Called at the end of the base map JS metadata files to register new base map layer metadata
 * @param {string} baseMapName The basemap name
 * @param {string} layerName The layer name
 * @param {Array} labelMetadata
 * @param {Array} pathMetadata
 * @param {Array} parentsRegionMetadata
 * @param {Array} labelInfoMetadata
 * @param {number} index
 * @param {Array} dim
 */
DvtBaseMapManager.registerBaseMapLayer = function(baseMapName, layerName, labelMetadata, pathMetadata, parentsRegionMetadata, labelInfoMetadata, index, dim) {
  // bootstrap global base map metadata
  // find or create basemap metadata
  var basemapMetadata = DvtBaseMapManager._GLOBAL_MAPS[baseMapName];
  if (!basemapMetadata) {
    basemapMetadata = new Object();
    basemapMetadata[DvtBaseMapManager._INDEX] = new Array();
    DvtBaseMapManager._GLOBAL_MAPS[baseMapName] = basemapMetadata;
  }

  // find or create layer metadata
  var layerMetadata = basemapMetadata[layerName];
  if (!layerMetadata) {
    layerMetadata = new Object();
    basemapMetadata[layerName] = layerMetadata;
    // custom area layers don't have indicies when registered
    if (index != null)
      basemapMetadata[DvtBaseMapManager._INDEX][index] = layerName;
  }

  // register layer metadata base on type
  layerMetadata[DvtBaseMapManager.TYPE_LABELS] = labelMetadata;
  layerMetadata[DvtBaseMapManager.TYPE_PATH] = pathMetadata;
  layerMetadata[DvtBaseMapManager.TYPE_PARENTREGION_CHILDREN] = parentsRegionMetadata;
  layerMetadata[DvtBaseMapManager.TYPE_LABELINFO] = labelInfoMetadata;
  layerMetadata[DvtBaseMapManager.TYPE_DIM] = dim;
  layerMetadata[DvtBaseMapManager._INDEX] = index;
};

/**
 * Register resource bundle
 * @param {string} baseMapName base map name
 * @param {string} layerName layer name
 * @param {string} labelMetadata label info
 */
DvtBaseMapManager.registerResourceBundle = function(baseMapName, layerName, labelMetadata) {
  var basemapMetadata = DvtBaseMapManager._GLOBAL_MAPS[baseMapName];
  if (!basemapMetadata) {
    basemapMetadata = new Object();
    DvtBaseMapManager._GLOBAL_MAPS[baseMapName] = basemapMetadata;
  }

  // find or create layer metadata
  var layerMetadata = basemapMetadata[layerName];
  if (!layerMetadata) {
    layerMetadata = new Object();
    basemapMetadata[layerName] = layerMetadata;
  }

  var layerMetadata = basemapMetadata[layerName];
  // Overwrite english labels with resource bundle language
  if (layerMetadata)
    layerMetadata[DvtBaseMapManager.TYPE_LABELS] = labelMetadata;
};

/**
 * Update resource bundle
 * @param {string} baseMapName base map name
 * @param {string} layerName layer name
 * @param {string} labelMetadata label info
 */
DvtBaseMapManager.updateResourceBundle = function(baseMapName, layerName, labelMetadata) {
  var basemapMetadata = DvtBaseMapManager._GLOBAL_MAPS[baseMapName];
  if (basemapMetadata) {
    var layerMetadata = basemapMetadata[layerName];
    // Overwrite english labels with resource bundle language
    if (layerMetadata) {
      for (var prop in labelMetadata) {
        layerMetadata[DvtBaseMapManager.TYPE_LABELS][prop] = labelMetadata[prop];
      }
    }
  }
};

/**
 * Processes registered maps
 * @private
 */
DvtBaseMapManager._processUnprocessedMaps = function() {
  var i;
  var args;
  var unprocessedMaps = DvtBaseMapManager['_UNPROCESSED_MAPS'];
  if (unprocessedMaps) {
    for (i = 0; i < unprocessedMaps[0].length; i++) { // registerBaseMapLayer
      args = unprocessedMaps[0][i];
      DvtBaseMapManager.registerBaseMapLayer(args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);
    }
    for (i = 0; i < unprocessedMaps[1].length; i++) { // registerResourceBundle
      args = unprocessedMaps[1][i];
      DvtBaseMapManager.registerResourceBundle(args[0], args[1], args[2]);
    }
    for (i = 0; i < unprocessedMaps[2].length; i++) { // updateResourceBundle
      args = unprocessedMaps[2][i];
      DvtBaseMapManager.updateResourceBundle(args[0], args[1], args[2]);
    }
    DvtBaseMapManager['_UNPROCESSED_MAPS'] = [[], [], []];
  }

  // update custom area layers and update hierarchy indicies
  var unprocessedParentUpdates = DvtBaseMapManager['_UNPROCESSED_PARENT_UPDATES'];
  if (unprocessedParentUpdates) {
    for (i = 0; i < unprocessedParentUpdates[0].length; i++) {
      args = unprocessedParentUpdates[0][i];
      // update extending layer parent mapping
      var basemapName = args[0];
      var extendedLayer = args[1];
      var layerName = args[2];
      var basemapMetadata = DvtBaseMapManager._GLOBAL_MAPS[basemapName];
      var basemapDim;
      var layerMetadata;
      if (basemapMetadata) {
        layerMetadata = basemapMetadata[extendedLayer];
        if (layerMetadata) {
          layerMetadata[DvtBaseMapManager.TYPE_PARENTREGION_CHILDREN] = args[3];
          basemapDim = layerMetadata[DvtBaseMapManager.TYPE_DIM];
          // get the index of the extended layer and update indicies for layers
          var index = layerMetadata[DvtBaseMapManager._INDEX];
          var indicies = basemapMetadata[DvtBaseMapManager._INDEX];
          indicies.splice(index, 0, layerName);
          basemapMetadata[layerName][DvtBaseMapManager._INDEX] = index;
          for (var i = (index + 1); i < indicies.length; i++) {
            var lowerLayer = basemapMetadata[indicies[i]];
            if (lowerLayer)
              lowerLayer[DvtBaseMapManager._INDEX]++;
          }
        }

        // update custom layer dimensions from extending layer
        layerMetadata = basemapMetadata[args[2]];
        if (layerMetadata) {
          layerMetadata[DvtBaseMapManager.TYPE_DIM] = basemapDim;
        }
      }
    }
    DvtBaseMapManager['_UNPROCESSED_PARENT_UPDATES'] = [[]];
  }
};

/**
 * Simplifies path commands based on max map zoom
 * @param {object} paths The map of area paths
 * @param {number} basemapW The width of the basemap
 * @param {number} basemapH The height of the basemap
 * @param {number} viewportW The map viewport width
 * @param {number} viewportH The map viewport height
 * @param {number} zoomFactor The max basemap zoom factor
 * @return {Object}
 * @private
 */
DvtBaseMapManager._simplifyAreaPaths = function(paths, basemapW, basemapH, viewportW, viewportH, zoomFactor) {
  // determine the scale factor for the map given the viewport
  if (zoomFactor > 0) {
    var dzx = viewportW / basemapW;
    var dzy = viewportH / basemapH;
    var dz = Math.min(dzx, dzy);
    var scale = 1 / (dz * zoomFactor); // 6 is the current max zoom
    if (scale <= 1)
      return paths;
    // If scale = 10 that means 10 pixels in the map coordinate space = 1 pixel in the current viewport
    // and any draw commands less than 10 pixels in the map coordinate space won't even show up in the viewport
    var simplifiedPaths = [];
    if (paths) {
      for (var path in paths) {
        var pathAr = paths[path];
        if (isNaN(pathAr))
          pathAr = dvt.PathUtils.createPathArray(paths[path]);
        simplifiedPaths[path] = dvt.PathUtils.simplifyPath(pathAr, scale);
      }
    }
    return simplifiedPaths;
  } else {
    return paths;
  }
};

/**
 * Returns a map of ids to area names for the given basemap and layer.
 * @param {string} baseMapName The name of the basemap
 * @param {string} layerName The name of the layer or 'cities' for the point data layer
 * @return {object}
 */
DvtBaseMapManager.getLayerIds = function(baseMapName, layerName) {
  DvtBaseMapManager._processUnprocessedMaps();
  var layer = DvtBaseMapManager._GLOBAL_MAPS[baseMapName][layerName];
  var map = {};
  if (layer) {
    var ids = layer[DvtBaseMapManager.TYPE_LABELS];
    for (var id in ids)
      map[id] = ids[id][1];
    if (layerName !== 'cities' && !ids) {
      // Handle MapProvider case where no labels are provided, but we still want to return the layer area ids
      var areas = DvtBaseMapManager.getAreaIds(baseMapName, layerName);
      for (var i = 0; i < areas.length; i++)
        map[areas[i]] = null;
    }
  }
  return map;
};

/**
 * Associates a displayable with a category
 * @constructor
 * @param {DvtDisplayable} displayable The displayable
 * @param {string} category The category to associate with the displayable
 */
var DvtThematicMapCategoryWrapper = function(displayable, category)
{
  this.Init(displayable, category);
};

dvt.Obj.createSubclass(DvtThematicMapCategoryWrapper, dvt.Obj);

/**
 * Helper method for initializing the wrapper
 * @param {DvtDisplayable} displayable The displayable
 * @param {string} category The category to associate with the displayable
 * @protected
 */
DvtThematicMapCategoryWrapper.prototype.Init = function(displayable, category) {
  this._displayable = displayable;
  this._category = category;
};

/**
 * Returns the categories for this category wrapper object.
 * @return {string}
 */
DvtThematicMapCategoryWrapper.prototype.getCategories = function() {
  return this._category;
};

/**
 * Returns the array of displayables for this category wrapper object.
 * @return {Array}
 */
DvtThematicMapCategoryWrapper.prototype.getDisplayables = function() {
  return [this._displayable];
};

/**
 * Map label class
 * @constructor
 * @param {dvt.Context} context The rendering context
 * @param {String} label Text for label
 * @param {Array} labelInfo Contains the label bounding box at different zoom levels and leader line info
 * @param {String} labelDisplay Specifies whether to display labels. "off", "on", or "auto"
 * @param {dvt.Container} parentContainer The container to add the label to
 * @param {boolean} bSupportsVectorEffects Whether the rendering platform supports vector effects
 */
var DvtMapLabel = function(context, label, labelInfo, labelDisplay, parentContainer, bSupportsVectorEffects) {
  this.Init(context, label, labelInfo, labelDisplay, parentContainer, bSupportsVectorEffects);
};

dvt.Obj.createSubclass(DvtMapLabel, dvt.OutputText);


/**
 * Initializes label.  Sets bounding rectangle for label and draws leaderlines if present.
 * @param {dvt.Context} context The rendering context
 * @param {String} label Text for label
 * @param {Array} labelInfo Contains the label bounding box at different zoom levels and leader line info
 * @param {String} labelDisplay Specifies whether to display labels. "off", "on", or "auto"
 * @param {dvt.Container} parentContainer The container to add the label to
 * @param {boolean} bSupportsVectorEffects Whether the rendering platform supports vector effects
 * @protected
 */
DvtMapLabel.prototype.Init = function(context, label, labelInfo, labelDisplay, parentContainer, bSupportsVectorEffects) {
  DvtMapLabel.superclass.Init.call(this, context, label, 0, 0);
  //IE10, Flash/XML toolkit do not support vector-effects=non-scaling-stroke so we still need to set stroke width based on zoom
  this._bSupportsVectorEffects = bSupportsVectorEffects;
  this._boundRectangle = new Array();
  this.setMouseEnabled(false);
  this.alignCenter();
  this.alignMiddle();
  this._center = null;
  this._labelDisplay = labelDisplay;
  this._parentContainer = parentContainer;

  if (labelInfo) {
    this._boundRectangle.push(dvt.Rectangle.create(labelInfo[0]));
    if (labelInfo.length > 1) {
      this._leaderLines = new Array();

      for (var i = 1; i < labelInfo.length; i++) {
        var line = labelInfo[i];
        this._boundRectangle.push(dvt.Rectangle.create(line[0]));

        var polyline = new dvt.Polyline(context, line[1]);
        polyline.setPixelHinting(true);
        var stroke = new dvt.SolidStroke('#000000');
        if (this._bSupportsVectorEffects)
          stroke.setFixedWidth(true);
        polyline.setStroke(stroke);
        this._leaderLines.push(polyline);
      }
    }
  }
};

/**
 * Adds bounds for a label
 * @param {Array} boundsRect
 */
DvtMapLabel.prototype.addBounds = function(boundsRect) {
  this._boundRectangle.push(boundsRect);
};

/**
 * Returns true if this label has bounding rectangle info
 * @return {boolean}
 */
DvtMapLabel.prototype.hasBounds = function() {
  return this._boundRectangle.length > 0;
};

/**
 * Updates this label's position, adding and
 * removing it as needed.
 * @param {dvt.Matrix} pzcMatrix zoom matrix
 */
DvtMapLabel.prototype.update = function(pzcMatrix) {
  var zoom = pzcMatrix.getA();
  var state = -1;
  var dimensions = this.getDimensions();
  for (var i = 0; i < this._boundRectangle.length; i++) {
    var zoomW = this._boundRectangle[i].w * zoom;
    var zoomH = this._boundRectangle[i].h * zoom;
    if (dimensions.h <= zoomH) {
      if (dimensions.w <= zoomW) {
        state = i;
        break;
      } 
    }
  }

  // if labels are always displayed, use the last available bounding box
  if (state == -1 && this._labelDisplay == 'on')
    state = this._boundRectangle.length - 1;

  if (this._currentState != state) {
    if (state == -1) {
      this.reset();
    } else {
      if (!this.getParent())
        this._parentContainer.addChild(this);
      var center = this._boundRectangle[state].getCenter();
      this.setCenter(center);
      if (this._leaderLines) {
        this._parentContainer.removeChild(this._leaderLine);
        this._leaderLine = null;
        if (state > 0) {
          this._leaderLine = this._leaderLines[state - 1];
          this._parentContainer.addChild(this._leaderLine);
          // when using leaderliners, change text to black
          var style = this.getCSSStyle();
          style.setStyle(dvt.CSSStyle.COLOR, '#000000');
          this.setCSSStyle(style);
          var labelBox = this._boundRectangle[state];
          var leaderLinePoints = this._leaderLine.getPoints();
          var numPoints = leaderLinePoints.length;
          if (labelBox.x > leaderLinePoints[numPoints - 2]) {
            // leaderline position: left
            this.alignLeft();
            this.alignMiddle();
            this.setCenter(new dvt.Point(labelBox.x, center.y));
          }
          else if (labelBox.y > leaderLinePoints[numPoints - 1]) {
            // leaderline position: top
            this.alignTop();
            this.alignCenter();
            this.setCenter(new dvt.Point(center.x, labelBox.y));
          }
          else if ((labelBox.x + labelBox.w) < leaderLinePoints[numPoints - 2]) {
            // leaderline position: right
            this.alignRight();
            this.alignMiddle();
            this.setCenter(new dvt.Point(labelBox.x + labelBox.w, center.y));
          }
          else if ((labelBox.y + labelBox.h) < leaderLinePoints[numPoints - 1]) {
            // leaderline position: bottom
            this.alignBottom();
            this.alignCenter();
            this.setCenter(new dvt.Point(center.x, labelBox.y + labelBox.h));
          }
        } else {
          // reset label alignment if label now fits without leader line
          this.alignCenter();
          this.alignMiddle();
          // reset label color
          var style = this.getCSSStyle();
          style.setStyle(dvt.CSSStyle.COLOR, this._labelColor);
          this.setCSSStyle(style);
        }
      }
    }
    this._currentState = state;
  }

  if (this._currentState != -1) {
    var mat = new dvt.Matrix();
    mat.translate(zoom * this._center.x - this._center.x, zoom * this._center.y - this._center.y);
    this.setMatrix(mat);
    if (this._leaderLine) {
      this._leaderLine.setMatrix(new dvt.Matrix(zoom, 0, 0, zoom));
      if (!this._bSupportsVectorEffects) {
        var stroke = this._leaderLine.getStroke().clone();
        stroke.setWidth(1 / zoom);
        this._leaderLine.setStroke(stroke);
      }
    }
  }

};

/**
 * Sets the center for this label
 * @param {dvt.Point} p
 */
DvtMapLabel.prototype.setCenter = function(p) {
  this._center = p;
  this.setX(p.x);
  this.setY(p.y);
};

/**
 * Returns the leaderline for this label
 * @return {DvtDisplayable}
 */
DvtMapLabel.prototype.getLeaderLine = function() {
  return this._leaderLine;
};

/**
 * Returns the center of this label
 * @return {dvt.Point}
 */
DvtMapLabel.prototype.getCenter = function() {
  return this._center;
};

/**
 * Sets the css style for this label
 * @param {dvt.CssStyle} cssStyle
 */
DvtMapLabel.prototype.setCSSStyle = function(cssStyle) {
  DvtMapLabel.superclass.setCSSStyle.call(this, cssStyle);
  if (!this._labelColor) // save the label color for leader lines
    this._labelColor = cssStyle.getStyle(dvt.CSSStyle.COLOR);
};

/**
 * Removes the label from the map and resets it current state
 */
DvtMapLabel.prototype.reset = function() {
  this._parentContainer.removeChild(this);
  this._currentState = -1;
  if (this._leaderLine) {
    this._parentContainer.removeChild(this._leaderLine);
    this._leaderLine = null;
  }
};

/**
 * Logical object for a map data object
 * @param {object} data The options for this data object
 * @param {DvtMapDataLayer} dataLayer The data layer this object belongs to
 * @param {dvt.Shape|DvtCustomDataItem} displayable The displayable representing this data object
 * @param {dvt.OutputText} label The label for this data object
 * @param {dvt.Point} center The center of this data object
 * @param {string} locationName The location name for this data object
 * @constructor
 */
var DvtMapObjPeer = function(data, dataLayer, displayable, label, center, locationName) {
  this.Init(data, dataLayer, displayable, label, center, locationName);
};

// Normally shouldn't set typeName unless we absolutely need it, but we do for the map obj peers
dvt.Obj.createSubclass(DvtMapObjPeer, dvt.Obj, 'DvtMapObjPeer');

/**
 * The order in which the delete animation occurs
 */
DvtMapObjPeer.ANIMATION_DELETE_PRIORITY = 0;
/**
 * The order in which the update animation occurs
 */
DvtMapObjPeer.ANIMATION_UPDATE_PRIORITY = 1;
/**
 * The order in which the insert animation occurs
 */
DvtMapObjPeer.ANIMATION_INSERT_PRIORITY = 2;

/**
 * @param {object} data The options for this data object
 * @param {DvtMapDataLayer} dataLayer The data layer this object belongs to
 * @param {dvt.Shape|DvtCustomDataItem} displayable The displayable representing this data object
 * @param {dvt.OutputText} label The label for this data object
 * @param {dvt.Point} center The center of this data object
 * @param {string} locationName The location name for this data object
 * @protected
 */
DvtMapObjPeer.prototype.Init = function(data, dataLayer, displayable, label, center, locationName) {
  this._data = data;
  this._itemData = this._data['_itemData'];
  this._dataLayer = dataLayer;
  this.Displayable = displayable;
  this._isSelected = false;
  this._isShowingHoverEffect = false;
  this._isShowingKeyboardFocusEffect = false;
  if (this.Displayable.setDataColor)
    this.Displayable.setDataColor(data['color']);
  this._label = label;
  this._center = center;
  this.Zoom = 1;
  this._view = dataLayer.getMap();
  this._locationName = locationName;


  if (!this._data['categories']) {
    if (this._label)
      this._data['categories'] = [this._label.getTextString()];
  }

  if (this._view.getDisplayTooltips() == 'auto' && locationName)
    this._data['shortDesc'] = (data['shortDesc'] ? locationName + ': ' + data['shortDesc'] : locationName);

  // WAI-ARIA
  if (this.Displayable) {
    var dataStyle = data['svgStyle'] || data['style'];
    var className = data['svgClassName'] || data['className'];
    this.Displayable.setStyle(dataStyle).setClassName(className);
    this.Displayable.setAriaRole('img');
  }
  this.UpdateAriaLabel();

  this.setSelectable(this.isSelectable());
};

/**
 * Returns the id of this data object
 * @return {string}
 */
DvtMapObjPeer.prototype.getId = function() {
  return this._data['id'];
};

/**
 * Returns the location of this data object
 * @return {string}
 */
DvtMapObjPeer.prototype.getLocation = function() {
  return this._data['location'];
};

/**
 * Returns the location of this data object
 * @return {string}
 */
DvtMapObjPeer.prototype.getLocationName = function() {
  return this._locationName;
};

/**
 * Returns the center of this data object
 * @return {dvt.Point}
 */
DvtMapObjPeer.prototype.getCenter = function() {
  return this._center;
};

/**
 * Sets the center of this data object
 * @param {dvt.Point} center The center
 * @private
 */
DvtMapObjPeer.prototype._setCenter = function(center) {
  this._center = center;
  this.__recenter();
};

/**
 * Returns the displayable of this data object
 * @return {dvt.Displayable}
 */
DvtMapObjPeer.prototype.getDisplayable = function() {
  return this.Displayable;
};

/**
 * Returns the label of this data object
 * @return {dvt.OutputText}
 */
DvtMapObjPeer.prototype.getLabel = function() {
  return this._label;
};

/**
 * Returns the data layer of this data object
 * @return {DvtMapDataLayer}
 */
DvtMapObjPeer.prototype.getDataLayer = function() {
  return this._dataLayer;
};

/**
 * Returns true if this data object has an action
 * @return {boolean}
 */
DvtMapObjPeer.prototype.hasAction = function() {
  return this.getAction() != null;
};

/**
 * Returns the action of this data object
 * @return {string}
 */
DvtMapObjPeer.prototype.getAction = function() {
  return this._data['action'];
};

/**
 * Sets the visibility of this data object
 * @param {boolean} bVisible True if this data object is visible and false otherwise
 */
DvtMapObjPeer.prototype.setVisible = function(bVisible) {
  this.Displayable.setVisible(bVisible);
  if (this._label)
    this._label.setVisible(bVisible);
};

/**
 * Returns the shortDesc of the data object
 * @return {string}
 */
DvtMapObjPeer.prototype.getShortDesc = function() {
  return this._data['shortDesc'];
};

/**
 * Removes the label on this data object
 */
DvtMapObjPeer.prototype.removeLabel = function() {
  this._label = null;
};

/**
 * Returns the size of this data object. Data object size is used for sorting.
 * @return {Number} The data object size which is its width * height.
 */
DvtMapObjPeer.prototype.getSize = function() {
  if (this.Displayable.getWidth)
    return this.Displayable.getWidth() * this.Displayable.getHeight();
  return 0;
};

/**
 * Implemented for DvtCategoricalObject
 * @override
 */
DvtMapObjPeer.prototype.getCategories = function() {
  var categories = this._data['categories'];
  return categories ? categories : [];
};

/**
 * Implemented for DvtTooltipSource
 * @override
 */
DvtMapObjPeer.prototype.getDatatip = function() {
  if (this._view.getDisplayTooltips() != 'none') {
    // Custom Tooltip from Function
    var tooltipObj = this._view.getOptions()['_tooltip'];
    if (tooltipObj)
      return this._view.getCtx().getTooltipManager().getCustomTooltip(tooltipObj['renderer'], this.getDataContext());

    // Custom Tooltip from ShortDesc
    return this.getShortDesc();
  }
  return null;
};

/**
 * Returns the data context that will be passed to the tooltip function.
 * @return {object}
 */
DvtMapObjPeer.prototype.getDataContext = function() {
  return {
    'color': this.getDatatipColor(),
    'component': this._view.getOptions()['_widgetConstructor'],
    'data': this._data,
    'id': this.getId(),
    'itemData': this._itemData,
    'label': this._label ? this._label.getTextString() : null,
    'location': this.getLocation(),
    'locationName': this.getLocationName(),
    'tooltip': this.getShortDesc(),
    'x': this._data['x'],
    'y': this._data['y']
  };
};

/**
 * Implemented for DvtTooltipSource
 * @override
 */
DvtMapObjPeer.prototype.getDatatipColor = function() {
  return this._data['color'] ? this._data['color'] : '#000000';
};

/**
 * Implemented for DvtLogicalObject
 * @override
 */
DvtMapObjPeer.prototype.getAriaLabel = function() {
  var states = [];
  if (this.isSelectable())
    states.push(dvt.Bundle.getTranslatedString(dvt.Bundle.UTIL_PREFIX, this.isSelected() ? 'STATE_SELECTED' : 'STATE_UNSELECTED'));
  return dvt.Displayable.generateAriaLabel(this.getShortDesc(), states);
};

/**
 * Implemented for DvtLogicalObject
 * @override
 */
DvtMapObjPeer.prototype.getDisplayables = function() {
  return [this.getDisplayable()];
};

/**
 * Updates the aria label for a map data object
 * @protected
 */
DvtMapObjPeer.prototype.UpdateAriaLabel = function() {
  if (!dvt.Agent.deferAriaCreation()) {
    var desc = this.getAriaLabel();
    if (desc)
      this.Displayable.setAriaProperty('label', desc);
  }
};

/**
 * Sets whether the data item is selectable
 * @param {boolean} bSelectable True if this object is selectable
 */
DvtMapObjPeer.prototype.setSelectable = function(bSelectable) {
  var label = this.getLabel();
  if (this.Displayable.setSelectable) {
    // DvtShapes setSelectable also sets selecting cursor
    this.Displayable.setSelectable(bSelectable);
    if (label && bSelectable)
      label.setCursor(dvt.SelectionEffectUtils.getSelectingCursor());
  }
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapObjPeer.prototype.isSelectable = function() {
  if (!this.Displayable.isSelectable)
    return false;
  else if (this._data['selectable'] !== 'off')
    return this._dataLayer.isSelectable();
  else
    return false;
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapObjPeer.prototype.isSelected = function() {
  return this._isSelected;
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapObjPeer.prototype.setSelected = function(selected) {
  if (this.isSelectable()) {
    var prevState = this._getState();
    this._isSelected = selected;
    if (this._dataLayer.getOptions()['selectionRenderer'])
      this._callCustomRenderer(this._dataLayer.getOptions()['selectionRenderer'], this._getState(), prevState);
    else
      this.processDefaultSelectionEffect(selected);
    this.UpdateAriaLabel();
  }
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapObjPeer.prototype.showHoverEffect = function() {
  if (this.IsHoverEffectShown())
    return;
  var prevState = this._getState();
  this._isShowingHoverEffect = true;
  if (this._dataLayer.getOptions()['hoverRenderer'])
    this._callCustomRenderer(this._dataLayer.getOptions()['hoverRenderer'], this._getState(), prevState);
  else
    this.processDefaultHoverEffect(true);
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapObjPeer.prototype.hideHoverEffect = function() {
  if (this.IsHoverEffectShown()) {
    var prevState = this._getState();
    this._isShowingHoverEffect = false;
    if (this._dataLayer.getOptions()['hoverRenderer'])
      this._callCustomRenderer(this._dataLayer.getOptions()['hoverRenderer'], this._getState(), prevState);
    else
      this.processDefaultHoverEffect(false);
  }
};

/**
 * Implemented for DvtPopupSource.
 * @override
 */
DvtMapObjPeer.prototype.setShowPopupBehaviors = function(behaviors) {
  this._showPopupBehaviors = behaviors;
};

/**
 * Implemented for DvtPopupSource.
 * @override
 */
DvtMapObjPeer.prototype.getShowPopupBehaviors = function() {
  return this._showPopupBehaviors;
};

/**
 * Implemented for DvtDraggable.
 * @override
 */
DvtMapObjPeer.prototype.isDragAvailable = function(clientIds) {
  var parentId = this._dataLayer.getClientId();
  for (var i = 0; i < clientIds.length; i++) {
    if (clientIds[i] == parentId)
      return parentId;
  }
  return parentId;
};

/**
 * Implemented for DvtDraggable.
 * @override
 */
DvtMapObjPeer.prototype.getDragTransferable = function(mouseX, mouseY) {
  return this._dataLayer.__getDragTransferable(this);
};

/**
 * Implemented for DvtDraggable.
 * @override
 */
DvtMapObjPeer.prototype.getDragFeedback = function(mouseX, mouseY) {
  return this._dataLayer.__getDragFeedback();
};

/**
 * Implemented for DvtKeyboardNavigable.
 * @override
 */
DvtMapObjPeer.prototype.getNextNavigable = function(event) {
  var next;
  if (event.type == dvt.MouseEvent.CLICK) {
    return this;
  } else if (event.keyCode == dvt.KeyboardEvent.SPACE && event.ctrlKey) {
    // multi-select node with current focus; so we navigate to ourself and then let the selection handler take
    // care of the selection
    return this;
  } else if ((event.keyCode == dvt.KeyboardEvent.OPEN_ANGLED_BRACKET || dvt.KeyboardEvent.CLOSE_ANGLED_BRACKET) &&
      event.altKey) {
    // get first navigable link if it exists
    var adjLinks = this.getDataLayer().getNavigableLinksForNodeId(this.getId());
    next = DvtThematicMapKeyboardHandler.getFirstNavigableLink(this, event, adjLinks);
  } else {
    next = dvt.KeyboardHandler.getNextAdjacentNavigable(this, event, this.GetNavigables());
  }
  this.getDataLayer().getMap().ensureObjInViewport(event, next);
  return next;
};

/**
 * Returns the possible keyboard navigables
 * @return {array} The array of DvtMapObjPeers that are possible candidates for keyboard navigation
 * @protected
 */
DvtMapObjPeer.prototype.GetNavigables = function() {
  return this.getDataLayer().getMap().getNavigableMarkers();
};

/**
 * Implemented for DvtKeyboardNavigable.
 * @override
 */
DvtMapObjPeer.prototype.getKeyboardBoundingBox = function(targetCoordinateSpace) {
  if (this.Displayable.getParent()) {
    return this.Displayable.getDimensions(targetCoordinateSpace ? targetCoordinateSpace : this.Displayable.getCtx().getStage());
  } else {
    return new dvt.Rectangle(0, 0, 0, 0);
  }
};

/**
 * Implemented for DvtKeyboardNavigable.
 * @override
 */
DvtMapObjPeer.prototype.getTargetElem = function() {
  return this.Displayable.getElem();
};

/**
 * Implemented for DvtKeyboardNavigable.
 * @override
 */
DvtMapObjPeer.prototype.showKeyboardFocusEffect = function() {
  if (this.isShowingKeyboardFocusEffect())
    return;
  var prevState = this._getState();
  this._isShowingKeyboardFocusEffect = true;
  if (this._dataLayer.getOptions()['focusRenderer'])
    this._callCustomRenderer(this._dataLayer.getOptions()['focusRenderer'], this._getState(), prevState);
  else
    this.processDefaultFocusEffect(true);
};

/**
 * Implemented for DvtKeyboardNavigable.
 * @override
 */
DvtMapObjPeer.prototype.hideKeyboardFocusEffect = function() {
  if (this.isShowingKeyboardFocusEffect()) {
    var prevState = this._getState();
    this._isShowingKeyboardFocusEffect = false;
    if (this._dataLayer.getOptions()['focusRenderer'])
      this._callCustomRenderer(this._dataLayer.getOptions()['focusRenderer'], this._getState(), prevState);
    else
      this.processDefaultFocusEffect(false);
  }
};

/**
 * Implemented for DvtKeyboardNavigable.
 * @override
 */
DvtMapObjPeer.prototype.isShowingKeyboardFocusEffect = function() {
  return this._isShowingKeyboardFocusEffect;
};

/**
 * Rescale and translate this data object
 * @param {dvt.Matrix} pzcMatrix The current transform of the pan zoom canvas
 * @protected
 */
DvtMapObjPeer.prototype.HandleZoomEvent = function(pzcMatrix) {
  if (!this.Displayable.getParent())
    return;
  this.Zoom = pzcMatrix.getA();
  this.__recenter();
};

/**
 * Positions the label of this data object
 */
DvtMapObjPeer.prototype.positionLabel = function() {
  if (this._label) {
    this._label.alignCenter();
    var x = this.Displayable.getCx() * this.Zoom;
    var markerY = this.Displayable.getCy() * this.Zoom;
    var markerH = this.Displayable.getHeight();
    var markerType = this.Displayable instanceof dvt.SimpleMarker ? this.Displayable.getType() : 'image';

    var y;
    var position = this._data['labelPosition'];
    if (position == 'top') {
      y = markerY - markerH / 2 - 4;
      this._label.alignBottom();
    } else if (position == 'bottom') {
      y = markerY + markerH / 2;
      this._label.alignTop();
    } else if (markerType == dvt.SimpleMarker.TRIANGLE_UP) {
      // we need to move center of the label to the center of gravity, it looks much better
      y = markerY + markerH / 6;
      // in this special case we need special alignment since standard baseline has to be higher than
      // in other cases to be preciesly in the center of gravity
      this._label.alignMiddle();
    } else if (markerType == dvt.SimpleMarker.TRIANGLE_DOWN) {
      // we need to move center of the label to the center of gravity, it looks much better
      y = markerY - markerH / 6;
      this._label.alignMiddle();
    } else {
      y = markerY;
      this._label.alignMiddle();
    }

    this._label.setX(x).setY(y);
  }
};

/**
 * Recenters this data object
 * @protected
 */
DvtMapObjPeer.prototype.__recenter = function() {
  var width = this.Displayable.getWidth();
  var height = this.Displayable.getHeight();
  if (width != null && height != null && this.Displayable.getParent()) {
    // Calculate the current (transformed) center point
    var rotation = 0;
    var shapeX = this._center.x;
    var shapeY = this._center.y;
    if (this.Displayable.getRotation) {
      rotation = this.Displayable.getRotation();
      shapeX = this._center.x * Math.cos(rotation) - this._center.y * Math.sin(rotation);
      shapeY = this._center.x * Math.sin(rotation) + this._center.y * Math.cos(rotation);
    }
    shapeX = this._center.x * this.Zoom - shapeX;
    shapeY = this._center.y * this.Zoom - shapeY;
    // account for x/y if displayable doesn't have setters for x/y
    if (this.Displayable instanceof DvtCustomDataItem) {
      shapeX += (this._center.x - width / 2);
      shapeY += (this._center.y - height / 2);
    }
    this.Displayable.setTranslate(shapeX, shapeY);
    dvt.Agent.workaroundFirefoxRepaint(this.Displayable);

    this.positionLabel();
  }
};

/**
 * Creates the update animation for this data object.
 * @param {dvt.DataAnimationHandler} handler The animation handler, which can be used to chain animations.
 * @param {DvtMapObjPeer} oldObj The old data object state to animate from.
 */
DvtMapObjPeer.prototype.animateUpdate = function(handler, oldObj) {
  var anim = new dvt.CustomAnimation(this._view.getCtx(), this.Displayable, this.getDataLayer().getAnimationDuration());

  var oldDisplayable = oldObj.getDisplayable();
  // Color change
  if (this.Displayable.getFill) {
    var startFill = oldDisplayable.getFill();
    var endFill = this.Displayable.getFill();
    if (endFill instanceof dvt.SolidFill && !endFill.equals(startFill)) {
      this.Displayable.setFill(startFill);
      if (oldObj.getLabel() && this._label) {
        var endLabelFill = this._label.getFill();
        this._label.setFill(oldObj.getLabel().getFill().clone());
        if (!endLabelFill.equals(this._label.getFill()))
          anim.getAnimator().addProp(dvt.Animator.TYPE_FILL, this._label, this._label.getFill, this._label.setFill, endLabelFill);
      }
      anim.getAnimator().addProp(dvt.Animator.TYPE_FILL, this.Displayable, this.Displayable.getFill, this.Displayable.setFill, endFill);
    }
  }

  // Position change for markers
  if (this.Displayable.getCenterDimensions) {
    var startRect = oldObj.getDisplayable().getCenterDimensions();
    var endRect = this.Displayable.getCenterDimensions();

    if (startRect.x != endRect.x || startRect.y != endRect.y || startRect.w != endRect.w || startRect.h != endRect.h) {
      this.Displayable.setCenterDimensions(startRect);
      anim.getAnimator().addProp(dvt.Animator.TYPE_RECTANGLE, this.Displayable, this.Displayable.getCenterDimensions, this.Displayable.setCenterDimensions, endRect);
    }
  }

  // Rotation
  var startRotation = oldDisplayable.getRotation();
  var endRotation = this.Displayable.getRotation();
  if (startRotation != endRotation) {
    var diffRotation = startRotation - endRotation;
    if (diffRotation > Math.PI)
      startRotation -= Math.PI * 2;
    else if (diffRotation < -Math.PI)
      startRotation += Math.PI * 2;
    this.Displayable.setRotation(startRotation);
    anim.getAnimator().addProp(dvt.Animator.TYPE_NUMBER, this.Displayable, this.Displayable.getRotation, this.Displayable.setRotation, endRotation);
  }

  // Recenter based on new x, y, rotation
  var startCenter = oldObj.getCenter();
  var endCenter = this.getCenter();
  if (startCenter && endCenter) {
    if (startCenter.x != endCenter.x || startCenter.y != endCenter.y || startRotation != endRotation) {
      this._setCenter(new dvt.Point(startCenter.x, startCenter.y));
      anim.getAnimator().addProp(dvt.Animator.TYPE_POINT, this, this.getCenter, this._setCenter, new dvt.Point(endCenter.x, endCenter.y));
    }
  }

  // Animate Labels
  if (this._label && oldObj.getLabel()) {
    var startLabelX = oldObj.getLabel().getX();
    var endLabelX = this._label.getX();
    if (startLabelX != endLabelX) {
      this._label.setX(startLabelX);
      anim.getAnimator().addProp(dvt.Animator.TYPE_NUMBER, this._label, this._label.getX, this._label.setX, endLabelX);
    }
    var startLabelY = oldObj.getLabel().getY();
    var endLabelY = this._label.getY();
    if (startLabelY != endLabelY) {
      this._label.setY(startLabelY);
      anim.getAnimator().addProp(dvt.Animator.TYPE_NUMBER, this._label, this._label.getY, this._label.setY, endLabelY);
    }
    // Hide old label
    oldObj.getLabel().setAlpha(0);
  }
  else if (oldObj.getLabel()) {
    oldObj.getLabel().setAlpha(0);
  }

  // Hide old marker
  oldDisplayable.setAlpha(0);

  handler.add(anim, DvtMapObjPeer.ANIMATION_UPDATE_PRIORITY);
};

/**
 * Creates the delete animation for this data object.
 * @param {dvt.DataAnimationHandler} handler The animation handler, which can be used to chain animations.
 * @param {dvt.Container} container The container where deletes should be moved for animation.
 */
DvtMapObjPeer.prototype.animateDelete = function(handler, container) {
  var fadeObjs = [this.Displayable];
  var label = this.getLabel();
  if (label)
    fadeObjs.push(label);
  var anim = new dvt.AnimFadeOut(this._view.getCtx(), fadeObjs, this.getDataLayer().getAnimationDuration());
  handler.add(anim, DvtMapObjPeer.ANIMATION_DELETE_PRIORITY);
};

/**
 * Creates the insert animation for this data object.
 * @param {dvt.DataAnimationHandler} handler The animation handler, which can be used to chain animations.
 */
DvtMapObjPeer.prototype.animateInsert = function(handler) {
  var fadeObjs = [this.Displayable];
  this.Displayable.setAlpha(0);
  var label = this.getLabel();
  if (label) {
    label.setAlpha(0);
    fadeObjs.push(label);
  }
  var anim = new dvt.AnimFadeIn(this._view.getCtx(), fadeObjs, this.getDataLayer().getAnimationDuration());
  handler.add(anim, DvtMapObjPeer.ANIMATION_INSERT_PRIORITY);
};

/**
 * Hide or show selection effect on the node
 * @param {boolean} selected true to show selected effect
 */
DvtMapObjPeer.prototype.processDefaultSelectionEffect = function(selected) {
  if (this.Displayable.setSelected)
    this.Displayable.setSelected(selected);
};

/**
 * Hides or shows default keyboard focus effect
 * @param {boolean} focused true to show keyboard focus effect
 */
DvtMapObjPeer.prototype.processDefaultFocusEffect = function(focused) {
  this.processDefaultHoverEffect(focused);
};

/**
 * Hides or shows default hover effect
 * @param {boolean} hovered true to show hover effect
 */
DvtMapObjPeer.prototype.processDefaultHoverEffect = function(hovered) {
  if (hovered) {
    if (this.Displayable.showHoverEffect)
      this.Displayable.showHoverEffect();
  } else {
    if (this.Displayable.hideHoverEffect && !this.isShowingKeyboardFocusEffect())
      this.Displayable.hideHoverEffect();
  }
};

/**
 * Calls the specified renderer, adds, removes or updates content of the data item
 * @param {function} renderer Custom renderer for the data item state
 * @param {Object} state Object that contains current data item state
 * @param {Object} prevState Object that contains previous data item state
 * @private
 */
DvtMapObjPeer.prototype._callCustomRenderer = function(renderer, state, prevState) {
  if (!(this.Displayable instanceof DvtCustomDataItem))
    return;

  var contextHandler = this._view.getOptions()['_contextHandler'];
  if (!contextHandler)
    return;

  var rootElem = this.Displayable.getRootElement();
  var context = contextHandler(this.Displayable.getElem(), rootElem, this._data, this._itemData, state, prevState);
  var newRootElem = renderer(context);
  //   - support null case on updates for custom elements
  if (!newRootElem && rootElem && this._view.getCtx().isCustomElement()) {
    return;
  }
  this.Displayable.updateRootElement(newRootElem);
};

/**
 * Returns true if the hover effect is currently shown.
 * @protected
 * @return {boolean}
 */
DvtMapObjPeer.prototype.IsHoverEffectShown = function() {
  return this._isShowingHoverEffect;
};

/**
 * Retrieves current state for the data item
 * @return {Object} object that contains current hovered, selected, focused states for the data item
 * @private
 */
DvtMapObjPeer.prototype._getState = function() {
  return {
    'hovered': this.IsHoverEffectShown(),
    'selected': this.isSelected(),
    'focused': this.isShowingKeyboardFocusEffect()
  };
};

/**
 * Logical object for a map data area
 * @param {object} data The options for this data object
 * @param {DvtMapDataLayer} dataLayer The data layer this object belongs to
 * @param {dvt.Displayable} displayable The displayable representing this data object
 * @param {dvt.OutputText} label The label for this data object
 * @param {string} locationName The location name for this data object
 * @constructor
 */
var DvtMapAreaPeer = function(data, dataLayer, displayable, label, locationName) {
  this.Init(data, dataLayer, displayable, label, locationName);
};

// Normally shouldn't set typeName unless we absolutely need it, but we do for the map obj peers
dvt.Obj.createSubclass(DvtMapAreaPeer, DvtMapObjPeer, 'DvtMapAreaPeer');

/**
 * @param {object} data The options for this data object
 * @param {DvtMapDataLayer} dataLayer The data layer this object belongs to
 * @param {dvt.Displayable} displayable The displayable representing this data object
 * @param {dvt.OutputText} label The label for this data object
 * @param {string} locationName The location name for this data object
 * @protected
 */
DvtMapAreaPeer.prototype.Init = function(data, dataLayer, displayable, label, locationName) {
  DvtMapAreaPeer.superclass.Init.call(this, data, dataLayer, displayable, label, null, locationName);
};

/**
 * Sets the area container for this component
 * @param  {dvt.Container} layer The container for this component's map areas
 */
DvtMapAreaPeer.prototype.setAreaLayer = function(layer) {
  this._dataAreaLayer = layer;
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapAreaPeer.prototype.setSelected = function(selected) {
  if (this.isSelectable()) {
    // for initial selection where hover effect isn't shown on selection
    if (selected && !this.IsHoverEffectShown())
      this._dataAreaLayer.addChild(this.Displayable);
    DvtMapAreaPeer.superclass.setSelected.call(this, selected);
  }
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapAreaPeer.prototype.showHoverEffect = function() {
  this._dataAreaLayer.addChild(this.Displayable);
  DvtMapAreaPeer.superclass.showHoverEffect.call(this);
};

/**
 * Implemented for DvtSelectable
 * @override
 */
DvtMapAreaPeer.prototype.hideHoverEffect = function() {
  if (this.isSelected())
    this._dataAreaLayer.addChild(this.Displayable);
  else
    this._dataAreaLayer.addChildAt(this.Displayable, 0);
  DvtMapAreaPeer.superclass.hideHoverEffect.call(this);
};

/**
 * @override
 */
DvtMapAreaPeer.prototype.HandleZoomEvent = function(pzcMatrix) {
  DvtMapAreaPeer.superclass.HandleZoomEvent.call(this, pzcMatrix);
  if (!this.Displayable.getParent())
    return;
  this.Displayable.handleZoomEvent(pzcMatrix);
  this.positionLabel(pzcMatrix);
};

/**
 * @override
 */
DvtMapAreaPeer.prototype.positionLabel = function(pzcMatrix) {
  if (this.getLabel())
    this.getLabel().update(pzcMatrix);
};

/**
 * @override
 */
DvtMapAreaPeer.prototype.GetNavigables = function() {
  return this.getDataLayer().getMap().getNavigableAreas();
};

/**
 * @override
 */
DvtMapAreaPeer.prototype.animateUpdate = function(handler, oldObj) {
  DvtMapAreaPeer.superclass.animateUpdate.call(this, handler, oldObj);
  this.getDataLayer().getMapLayer().setAreaRendered(this.getLocation(), false);
};

/**
 * @override
 */
DvtMapAreaPeer.prototype.__recenter = function() {
  // no-op
};

/**
 * Logical object for a map data area
 * @param {object} data The options for this data object
 * @param {DvtMapDataLayer} dataLayer The data layer this object belongs to
 * @param {dvt.Displayable} displayable The displayable representing this data object
 * @param {dvt.Point} startPt The start coordinate of this link object
 * @param {dvt.Point} endPt The end coordinate of this link object
 * @param {string=} startMarker The optional id of the start location marker associated with this link
 * @param {string=} endMarker The optional id of the end location marker associated with this link
 * @constructor
 */
var DvtMapLinkPeer = function(data, dataLayer, displayable, startPt, endPt, startMarker, endMarker) {
  this.Init(data, dataLayer, displayable, startPt, endPt, startMarker, endMarker);
};

// Normally shouldn't set typeName unless we absolutely need it, but we do for the map obj peers
dvt.Obj.createSubclass(DvtMapLinkPeer, DvtMapObjPeer, 'DvtMapLinkPeer');

/**
 * Initializiation method for subclassing
 * @param {object} data The options for this data object
 * @param {DvtMapDataLayer} dataLayer The data layer this object belongs to
 * @param {dvt.Displayable} displayable The displayable representing this data object
 * @param {dvt.Point} startPt The start coordinate of this link object
 * @param {dvt.Point} endPt The end coordinate of this link object
 * @param {dvt.SimpleMarker=} startMarker The optional id of the start location marker associated with this link
 * @param {dvt.SimpleMarker=} endMarker The optional id of the end location marker associated with this link
 * @protected
 */
DvtMapLinkPeer.prototype.Init = function(data, dataLayer, displayable, startPt, endPt, startMarker, endMarker) {
  DvtMapLinkPeer.superclass.Init.call(this, data, dataLayer, displayable);
  this._startPt = startPt;
  this._endPt = endPt;
  this._startMarker = startMarker;
  this._endMarker = endMarker;
};

/**
 * Returns the start location marker if this link is associated with one or null.
 * @return {DvtMapObjPeer} Thee start marker
 */
DvtMapLinkPeer.prototype.getStartMarker = function() {
  return this._startMarker;
};

/**
 * Returns the end location marker if one exists or null.
 * @return {DvtMapObjPeer} The end marker
 */
DvtMapLinkPeer.prototype.getEndMarker = function() {
  return this._endMarker;
};

/**
 * Returns the start point of this link
 * @return {dvt.Point} The start point
 */
DvtMapLinkPeer.prototype.getStartPoint = function() {
  return this._startPt;
};

/**
 * Returns the end point of this link
 * @return {dvt.Point} The end point
 */
DvtMapLinkPeer.prototype.getEndPoint = function() {
  return this._endPt;
};

/**
 * Implemented for DvtKeyboardNavigable.
 * @override
 */
DvtMapLinkPeer.prototype.getNextNavigable = function(event) {
  var keyboardHandler = this._dataLayer.getMap().EventManager.getKeyboardHandler();
  var next;
  if (event.type == dvt.MouseEvent.CLICK) {
    return this;
  } else if (event.keyCode == dvt.KeyboardEvent.SPACE && event.ctrlKey) {
    // multi-select node with current focus; so we navigate to ourself and then let the selection handler take
    // care of the selection
    return this;
  } else if (keyboardHandler.getLinkNavigationType() === DvtThematicMapKeyboardHandler.LINK_NODE_NAV) {
    if (event.keyCode === dvt.KeyboardEvent.UP_ARROW) {
      // Get the marker that was used to traverse to this link and traverse its other links
      var markerId = keyboardHandler.getLinkMarker().getId();
      var adjLinks = this.getDataLayer().getNavigableLinksForNodeId(markerId);
      var idx = adjLinks.indexOf(this);
      idx++;
      if (idx === adjLinks.length)
        idx = 0;
      next = adjLinks[idx];
    } else if (event.keyCode === dvt.KeyboardEvent.DOWN_ARROW) {
      // Get the marker that was used to traverse to this link and traverse its other links
      var markerId = keyboardHandler.getLinkMarker().getId();
      var adjLinks = this.getDataLayer().getNavigableLinksForNodeId(markerId);
      var idx = adjLinks.indexOf(this);
      idx--;
      if (idx === -1)
        idx = adjLinks.length - 1;
      next = adjLinks[idx];
    } else if (event.keyCode === dvt.KeyboardEvent.LEFT_ARROW) {
      next = this.getStartPoint().x <= this.getEndPoint().x ? this.getStartMarker() : this.getEndMarker();
    } else if (event.keyCode === dvt.KeyboardEvent.RIGHT_ARROW) {
      next = this.getStartPoint().x >= this.getEndPoint().x ? this.getStartMarker() : this.getEndMarker();
    } else {
      // invalid navigation key, do nothing
      return this;
    }
  } else {
    next = dvt.KeyboardHandler.getNextAdjacentNavigable(this, event, this.GetNavigables());
  }
  this.getDataLayer().getMap().ensureObjInViewport(event, next);
  return next;
};

/**
 * Returns the possible keyboard navigables which are its start and end markers if they exist or the other
 * links in the data layer.
 * @return {array} The array of DvtMapObjPeers that are possible candidates for keyboard navigation
 * @protected
 */
DvtMapLinkPeer.prototype.GetNavigables = function() {
  return this.getDataLayer().getMap().getNavigableLinks();
};

/**
 * @override
 */
DvtMapLinkPeer.prototype.__recenter = function() {
  if (this.Displayable.getParent()) {
    // Calculate the current (transformed) start/end coordinates
    var startPt = new dvt.Point(this._startPt.x * this.Zoom, this._startPt.y * this.Zoom);
    var endPt = new dvt.Point(this._endPt.x * this.Zoom, this._endPt.y * this.Zoom);
    var curve = DvtThematicMapJsonParser.calcCurve(this._dataLayer, this._startPt, this._endPt, startPt, endPt);
    this.Displayable.setCmds(curve);
    dvt.Agent.workaroundFirefoxRepaint(this.Displayable);
  }
};


/**
 * @override
 */
DvtMapLinkPeer.prototype.animateUpdate = function(handler, oldObj) {
  var anim = new dvt.CustomAnimation(this._view.getCtx(), this.Displayable, this.getDataLayer().getAnimationDuration());

  var oldDisplayable = oldObj.getDisplayable();
  // Color change
  var startStroke = oldDisplayable.getStroke();
  var endStroke = this.Displayable.getStroke();
  if (endStroke.getColor() != startStroke.getColor()) {
    this.Displayable.setStroke(startStroke);
    anim.getAnimator().addProp(dvt.Animator.TYPE_STROKE, this.Displayable, this.Displayable.getStroke, this.Displayable.setStroke, endStroke);
  }

  // If start or end points change, fade in new link
  var origStart = oldObj.getStartPoint();
  var origEnd = oldObj.getEndPoint();
  var start = this.getStartPoint();
  var end = this.getEndPoint();
  var fadeOld = true;
  if (!origStart.equals(start) || !origEnd.equals(end)) {
    fadeOld = false;
    this.Displayable.setAlpha(0);
    anim.getAnimator().addProp(dvt.Animator.TYPE_NUMBER, this.Displayable, this.Displayable.getAlpha, this.Displayable.setAlpha, 1);
    anim.getAnimator().addProp(dvt.Animator.TYPE_NUMBER, oldDisplayable, oldDisplayable.getAlpha, oldDisplayable.setAlpha, 0);
  }

  // Hide old link
  if (fadeOld)
    oldDisplayable.setAlpha(0);

  handler.add(anim, DvtMapObjPeer.ANIMATION_UPDATE_PRIORITY);
};

/**
 * Displayable representing a non data map area
 * @extends {dvt.Container}
 * @constructor
 * @param {dvt.Context} context The rendering context
 * @param {dvt.ThematicMap} view The owning component
 * @param {dvt.Shape} dvtShape The shape representing the map area
 * @param {string} areaId The area id
 * @param {string} areaName The area name
 * @param {boolean} bSupportsVectorEffects True if the rendering browser supports vector effects
 */
var DvtMapArea = function(context, view, dvtShape, areaId, areaName, bSupportsVectorEffects) {
  this.Init(context, view, dvtShape, areaId, areaName, bSupportsVectorEffects);
};

dvt.Obj.createSubclass(DvtMapArea, dvt.Container);

/** @const @private */
DvtMapArea._DEFAULT_STROKE_WIDTH = 1;

/**
 * Helper class to instantiate a map area
 * @param {dvt.Context} context The rendering context
 * @param {dvt.ThematicMap} view The owning component
 * @param {dvt.Shape} dvtShape The shape representing the map area
 * @param {string} areaId The area id
 * @param {string} areaName The area name
 * @param {boolean} bSupportsVectorEffects True if the rendering browser supports vector effects
 * @protected
 */
DvtMapArea.prototype.Init = function(context, view, dvtShape, areaId, areaName, bSupportsVectorEffects) {
  DvtMapArea.superclass.Init.call(this, context);
  this._areaId = areaId;
  this._areaName = areaName;
  this._shape = dvtShape;
  this.addChild(this._shape);
  this._view = view;

  //IE10, Flash/XML toolkit do not support vector-effects=non-scaling-stroke so we still need to set stroke width based on zoom
  this._bSupportsVectorEffects = bSupportsVectorEffects;
  var stroke = dvtShape.getStroke();
  if (stroke)
    this._areaStrokeWidth = stroke.getWidth();
};

/**
 * Returns the area id for this map area
 * @return {string}
 */
DvtMapArea.prototype.getAreaId = function() {
  return this._areaId;
};

/**
 * Implemented for DvtTooltipSource.
 * DvtMapAreas use datatips even though there's no data associated with them so that when you hover over
 * data and non data areas, there's not a 500ms delay between showing the two types since tooltips have the built in delay
 * and was meant for things like truncated text.
 * @override
 */
DvtMapArea.prototype.getDatatip = function() {
  if (this._view.getDisplayTooltips() != 'none') {
    // Custom Tooltip from Function
    var tooltipObj = this._view.getOptions()['_tooltip'];
    if (tooltipObj)
      return this._view.getCtx().getTooltipManager().getCustomTooltip(tooltipObj['renderer'], this.getDataContext());
    return this._tooltip;
  }
  return null;
};

/**
 * Implemented for DvtTooltipSource
 * @override
 */
DvtMapArea.prototype.setDatatip = function(tooltip) {
  this._tooltip = tooltip;
};

/**
 * Returns the data context that will be passed to the tooltip function.
 * @return {object}
 */
DvtMapArea.prototype.getDataContext = function() {
  return {
    'color': null,
    'component': this._view.getOptions()['_widgetConstructor'],
    'data': null,
    'id': null,
    'label': null,
    'location': this.getAreaId(),
    'locationName': this._areaName,
    'tooltip': this._tooltip,
    'x': null,
    'y': null
  };
};

/**
 * Returns the stroke for this map area
 * @return {dvt.Stroke}
 */
DvtMapArea.prototype.getStroke = function() {
  if (this._shape instanceof dvt.Shape)
    return this._shape.getStroke();
  return null;
};

/**
 * Sets the stroke for this map area
 * @param {dvt.Stroke} stroke The area stroke
 */
DvtMapArea.prototype.setStroke = function(stroke) {
  if (this._shape instanceof dvt.Shape)
    this._shape.setStroke(stroke);
};

/**
 * Sets the fill for this map area
 * @param {dvt.Fill} fill The area fill
 */
DvtMapArea.prototype.setFill = function(fill) {
  if (this._shape instanceof dvt.Shape) {
    this._shape.setFill(fill);
  }
};

/**
 * Returns the fill for this map area
 * @return {dvt.Fill}
 */
DvtMapArea.prototype.getFill = function() {
  if (this._shape instanceof dvt.Shape) {
    return this._shape.getFill();
  }
  return null;
};

/**
 * Returns the path commands for this map area
 * @return {string}
 */
DvtMapArea.prototype.getCmds = function() {
  if (this._shape instanceof dvt.Path) {
    return this._shape.getCmds();
  }
  return null;
};

/**
 * Sets the path commands for this map area
 * @param {string} cmds The path commands
 */
DvtMapArea.prototype.setCmds = function(cmds) {
  if (this._shape instanceof dvt.Path) {
    this._shape.setCmds(cmds);
  }
};

/**
 * Sets the source if this map area is an image
 * @param {string} src The image source
 */
DvtMapArea.prototype.setSrc = function(src) {
  if (this._shape instanceof dvt.Image) {
    this._shape.setSrc(src);
  }
};

/**
 * @override
 */
DvtMapArea.prototype.getDropSiteFeedback = function() {
  return this._shape.copyShape();
};

/**
 * @override
 */
DvtMapArea.prototype.contains = function(x, y) {
  var dims = this.getDimensions();
  return x >= dims.x && x <= dims.x + dims.w &&
         y >= dims.y && y <= dims.y + dims.h;
};

/**
 * Updates the zoom for this map area
 * @param {dvt.Matrix} pzcMatrix The pan zoom canvas updated transform
 * @protected
 */
DvtMapArea.prototype.HandleZoomEvent = function(pzcMatrix) {
  if (!this._bSupportsVectorEffects && this._shape && this._areaStrokeWidth) {
    var zoomStroke = this._shape.getStroke().clone();
    zoomStroke.setWidth(this._areaStrokeWidth / pzcMatrix.getA());
    this._shape.setStroke(zoomStroke);
  }
};

/**
 * Thematic Map map layer
 * @param {dvt.ThematicMap} tmap The thematic map this map layer belongs to
 * @param {String} layerName The name of map layer
 * @param {dvt.EventManager} eventHandler The thematic map event manager
 * @constructor
 */
var DvtMapLayer = function(tmap, layerName, eventHandler) {
  this.Init(tmap, layerName, eventHandler);
};

dvt.Obj.createSubclass(DvtMapLayer, dvt.Obj);

/**
 * Initializes this map layera
 * @param {dvt.ThematicMap} tmap The thematic map this map layer belongs to
 * @param {String} layerName The name of map layer
 * @param {dvt.EventManager} eventHandler The thematic map event manager
 * @protected
 */
DvtMapLayer.prototype.Init = function(tmap, layerName, eventHandler) {
  this._tmap = tmap;
  this.LayerName = layerName;
  this.EventHandler = eventHandler;
  this.DataLayers = {};
  this.PzcMatrix = new dvt.Matrix();
};


/**
 * Registers a data layer to this map layer
 * @param {DvtMapDataLayer} dataLayer The data layer to add to this map layer
 */
DvtMapLayer.prototype.addDataLayer = function(dataLayer) {
  this.DataLayers[dataLayer.getClientId()] = dataLayer;
};

/**
 * Method for running logic before a data layer update.
 * @protected
 */
DvtMapLayer.prototype.PreDataLayerUpdate = function() {
  //subclasses to override
};

/**
 * Method for running logic after a data layer update.
 * @protected
 */
DvtMapLayer.prototype.PostDataLayerUpdate = function() {
  //subclasses to override
};

/**
 * Renders a data layer on ppr with new data if currently visible.
 * @param {DvtMapDataLayer} dataLayer The data layer to add and render for this DvtMapLayer
 * @param {dvt.Matrix} pzcMatrix The current map transform
 * @param {String} topLayerName The layer name of the current top layer
 */
DvtMapLayer.prototype.updateDataLayer = function(dataLayer, pzcMatrix, topLayerName) {
  // stop previous animation
  if (this._animation) {
    this._animation.stop(true);
  }

  this.PzcMatrix = pzcMatrix;
  // Get old data layer
  this._oldDataLayer = this.getDataLayer(dataLayer.getClientId());
  this.addDataLayer(dataLayer);
  dataLayer.render(this.PzcMatrix);
  // create a zoom event so we can update the data objects with the current zoom
  dataLayer.HandleZoomEvent(new dvt.ZoomEvent(dvt.ZoomEvent.SUBTYPE_ZOOMED), this.PzcMatrix);

  if (this._oldDataLayer) {
    var anim = dataLayer.getAnimation();
    var animDur = dataLayer.getAnimationDuration();
    if (anim == 'auto') { // data change animation
      var animHandler = new dvt.DataAnimationHandler(this._tmap.getCtx());
      animHandler.constructAnimation(this._oldDataLayer.getAllObjects(), dataLayer.getAllObjects());
      this._animation = animHandler.getAnimation();
    }
    else if (dvt.BlackBoxAnimationHandler.isSupported(anim)) { // black box animation
      // since certain animations like zoom and cubeToLeft/Right will use the bounding box of the object we need to
      // ensure all animated objects are the same dimensions by adding an invisible rect to all of them during animation
      this._removeAnimRect = true;
      var bounds1 = new dvt.Rectangle(0, 0, this._tmap.getWidth(), this._tmap.getHeight());
      var oldNonScaledContainers = this._oldDataLayer.getNonScaledContainers();
      for (var i = 0; i < oldNonScaledContainers.length; i++) {
        var rect = new dvt.Rect(this._tmap.getCtx(), 0, 0, this._tmap.getWidth(), this._tmap.getHeight());
        rect.setFill(null);
        oldNonScaledContainers[i].addChild(rect);
      }
      var newNonScaledContainers = dataLayer.getNonScaledContainers();
      for (var i = 0; i < newNonScaledContainers.length; i++) {
        var rect = new dvt.Rect(this._tmap.getCtx(), 0, 0, this._tmap.getWidth(), this._tmap.getHeight());
        rect.setFill(null);
        newNonScaledContainers[i].addChild(rect);
      }
      var anim1 = dvt.BlackBoxAnimationHandler.getCombinedAnimation(this._tmap.getCtx(), anim,
          oldNonScaledContainers,
          newNonScaledContainers, bounds1, animDur);

      var bounds2 = new dvt.Rectangle(0, 0, this._tmap.getWidth() / this.PzcMatrix.getA(), this._tmap.getHeight() / this.PzcMatrix.getA());
      var oldScaledContainers = this._oldDataLayer.getScaledContainers();
      for (var i = 0; i < oldScaledContainers.length; i++) {
        var rect = new dvt.Rect(this._tmap.getCtx(), 0, 0, this._tmap.getWidth() / this.PzcMatrix.getA(), this._tmap.getHeight() / this.PzcMatrix.getA());
        rect.setFill(null);
        oldScaledContainers[i].addChild(rect);
      }
      var newScaledContainers = dataLayer.getScaledContainers();
      for (var i = 0; i < newScaledContainers.length; i++) {
        var rect = new dvt.Rect(this._tmap.getCtx(), 0, 0, this._tmap.getWidth() / this.PzcMatrix.getA(), this._tmap.getHeight() / this.PzcMatrix.getA());
        rect.setFill(null);
        newScaledContainers[i].addChild(rect);
      }

      var anim2 = dvt.BlackBoxAnimationHandler.getCombinedAnimation(this._tmap.getCtx(), anim,
          oldScaledContainers,
          newScaledContainers, bounds2, animDur);
      this._animation = new dvt.ParallelPlayable(this._tmap.getCtx(), [anim1, anim2]);
    }
    else { // no animation
      var oldContainers = this._oldDataLayer.getContainers();
      for (var i = 0; i < oldContainers.length; i++) {
        var parent = oldContainers[i].getParent();
        parent.removeChild(oldContainers[i]);
      }
    }

    this.PreDataLayerUpdate();

    // If an animation was created, play it
    if (this._animation) {

      // Disable event listeners temporarily
      this.EventHandler.removeListeners(this._callbackObj);

      // Start the animation
      var thisRef = this;
      this._animation.setOnEnd(function() {thisRef.OnAnimationEnd(dataLayer)}, this);
      this._animation.play();
    }
  } else {
    this.PostDataLayerUpdate();
    this._tmap.OnUpdateLayerEnd();
  }
};

/**
 * Returns all the data layers for this map layer.
 * @return {Array}
 */
DvtMapLayer.prototype.getDataLayers = function() {
  return this.DataLayers;
};

/**
 * Returns the data layer for the given id.
 * @param {string} id
 * @return {DvtMapDataLayer}
 */
DvtMapLayer.prototype.getDataLayer = function(id) {
  return this.DataLayers ? this.DataLayers[id] : null;
};

/**
 * Returns the name of this map layer i.e. continents, countries, states for built-in basemaps
 * @return {String} The name of this map layer
 */
DvtMapLayer.prototype.getLayerName = function() {
  return this.LayerName;
};

/**
 * Renders a map layer and its children
 * @param {dvt.Matrix} pzcMatrix The current pan zoom canvas pan and zoom state
 */
DvtMapLayer.prototype.render = function(pzcMatrix) {
  this.PzcMatrix = pzcMatrix;
  for (var id in this.DataLayers)
    this.DataLayers[id].render(pzcMatrix);
};

/**
 * Handles a zoom event for this map layer
 * @param {dvt.ZoomEvent} event The zoom event
 * @param {dvt.Matrix} pzcMatrix The current pan zoom canvas pan and zoom state
 * @protected
 */
DvtMapLayer.prototype.HandleZoomEvent = function(event, pzcMatrix) {
  this.PzcMatrix = pzcMatrix;
  for (var id in this.DataLayers)
    this.DataLayers[id].HandleZoomEvent(event, pzcMatrix);
};

/**
 * Handles a pan event for this map layer
 * @param {dvt.Matrix} pzcMatrix The current pan zoom canvas pan and zoom state
 * @protected
 */
DvtMapLayer.prototype.HandlePanEvent = function(pzcMatrix) {
  this.PzcMatrix = pzcMatrix;
  for (var id in this.DataLayers)
    this.DataLayers[id].HandlePanEvent(pzcMatrix);
};


/**
 * Cleans up animated objects after animation finishes
 * @param {DvtMapDataLayer} dataLayer The animated data layere
 * @protected
 */
DvtMapLayer.prototype.OnAnimationEnd = function(dataLayer) {
  // Clean up the old container used by black box updates
  if (this._oldDataLayer) {
    var oldContainers = this._oldDataLayer.getContainers();
    for (var i = 0; i < oldContainers.length; i++) {
      var parent = oldContainers[i].getParent();
      if (parent)
        parent.removeChild(oldContainers[i]);
    }
  }

  // remove invisible rect added for animation
  if (this._removeAnimRect) {
    this._removeAnimRect = false;
    var newNonScaledContainers = dataLayer.getNonScaledContainers();
    for (var i = 0; i < newNonScaledContainers.length; i++)
      newNonScaledContainers[i].removeChildAt(newNonScaledContainers[i].getNumChildren() - 1);
    var newScaledContainers = dataLayer.getScaledContainers();
    for (var i = 0; i < newScaledContainers.length; i++)
      newScaledContainers[i].removeChildAt(newScaledContainers[i].getNumChildren() - 1);
  }

  this.PostDataLayerUpdate();

  this._tmap.OnUpdateLayerEnd();
  // Reset the animation stopped flag
  // Remove the animation reference
  this._animation = null;
  // Restore event listeners
  this.EventHandler.addListeners(this._callbackObj);
};

/**
 * Releases all component resources to prevent memory leaks.
 */
DvtMapLayer.prototype.destroy = function() {
  var dataLayers = this.getDataLayers();
  for (var layer in dataLayers)
    dataLayers[layer].destroy();
};

/**
 * Thematic Map area layer
 * @param {dvt.ThematicMap} tmap The thematic map this map layer belongs to
 * @param {String} layerName The name of map area layer
 * @param {String} labelDisplay Whether to display the labels for this map layer
 * @param {String} labelType The type of labels to display for this map layer (short or long)
 * @param {dvt.EventManager} eventHandler The thematic map event manager
 * @constructor
 */
var DvtMapAreaLayer = function(tmap, layerName, labelDisplay, labelType, eventHandler) {
  this.Init(tmap, layerName, labelDisplay, labelType, eventHandler);
};

dvt.Obj.createSubclass(DvtMapAreaLayer, DvtMapLayer);

/**
 * @const
 * @private
 */
DvtMapAreaLayer._SHORT_NAME = 0;
/**
 * @const
 * @private
 */
DvtMapAreaLayer._LONG_NAME = 1;

/**
 * Helper method to initialize this DvtMapAreaLayer object
 * @param {dvt.ThematicMap} tmap The thematic map this map layer belongs to
 * @param {String} layerName The name of map area layer
 * @param {String} labelDisplay Whether to display the labels for this map layer
 * @param {String} labelType The type of labels to display for this map layer (short or long)
 * @param {dvt.EventManager} eventHandler The thematic map event manager
 * @protected
 */
DvtMapAreaLayer.prototype.Init = function(tmap, layerName, labelDisplay, labelType, eventHandler) {
  DvtMapAreaLayer.superclass.Init.call(this, tmap, layerName, eventHandler);
  this._labelDisplay = labelDisplay;
  this._labelType = labelType;
  this._areaLabels = new Object();
  this.Areas = new Object();
  this.AreaShapes = {};
  this.AreaLabels = null;
  this._labelInfo = null;
  this._renderArea = {}; // keep track of whether or not to render an area
  this._renderLabel = {}; // keep track of whether or not to render a label
  this._renderedLabels = {}; // keep track of the labels that are actually added to the DOM

  this.AreaContainer = new dvt.Container(this._tmap.getCtx());
  this.LabelContainer = new dvt.Container(this._tmap.getCtx());
  this._tmap.getAreaLayerContainer().addChildAt(this.AreaContainer, 0);
  this._tmap.getLabelContainer().addChildAt(this.LabelContainer, 0);

  this._dropTarget = new DvtThematicMapDropTarget(this, this._tmap.getMapName());
};

DvtMapAreaLayer.prototype.getDropTarget = function() {
  return this._dropTarget;
};

DvtMapAreaLayer.prototype.getLabelType = function() {
  return this._labelType;
};

DvtMapAreaLayer.prototype.setAreaShapes = function(shapes) {
  this.AreaShapes = shapes;
  for (var area in shapes) {
    this.setAreaRendered(area, true);
  }
};

/**
 * Sets the area labels for this map layer
 * @param {Object} labels The short and long area labels for this map layer
 */
DvtMapAreaLayer.prototype.setAreaLabels = function(labels) {
  this.AreaLabels = labels;
  for (var area in labels) {
    this.setLabelRendered(area, true);
  }
};

DvtMapAreaLayer.prototype.getShortAreaName = function(area) {
  if (this.AreaLabels && this.AreaLabels[area])
    return this.AreaLabels[area][DvtMapAreaLayer._SHORT_NAME];
  return null;
};

DvtMapAreaLayer.prototype.getLongAreaName = function(area) {
  if (this.AreaLabels && this.AreaLabels[area])
    return this.AreaLabels[area][DvtMapAreaLayer._LONG_NAME];
  return null;
};

DvtMapAreaLayer.prototype.setAreaLabelInfo = function(values) {
  this._labelInfo = values;
};

DvtMapAreaLayer.prototype.getLabelInfoForArea = function(area) {
  if (!this._labelInfo)
    return null;
  return this._labelInfo[area];
};

DvtMapAreaLayer.prototype.getArea = function(id) {
  return this.Areas[id];
};

DvtMapAreaLayer.prototype.getAreaShape = function(id) {
  return this.AreaShapes[id];
};

DvtMapAreaLayer.prototype.getLabelDisplay = function() {
  return this._labelDisplay;
};

DvtMapAreaLayer.prototype.setDropSiteCSSStyle = function(style) {
  this._dropSiteCSSStyle = style;
};

/**
 * Sets the CSSStyle for this area layer.
 * @param {dvt.CSSStyle} style The style object for this area layer.
 */
DvtMapAreaLayer.prototype.setLayerCSSStyle = function(style) {
  this._layerCSSStyle = style;
};

/**
 * Retruns the CSSStyle for this area layer.
 * @return {dvt.CSSStyle}
 */
DvtMapAreaLayer.prototype.getLayerCSSStyle = function() {
  return this._layerCSSStyle;
};

/**
 * Sets whether an area in the area layer should be rendered.  Areas that contain a DvtMapAreaPeer do not need to
 * render its associated DvtMapArea since the data layer will handle the rendering.
 * @param {String} area The name of the area to update
 * @param {boolean} bRender True if the area should be drawn by the area layer
 */
DvtMapAreaLayer.prototype.setAreaRendered = function(area, bRender) {
  this._renderArea[area] = bRender;
};

/**
 * Sets whether a label for an area should be rendered.
 * @param {String} area The name of the area to update
 * @param {boolean} bRender True if the label should be drawn by the area layer
 */
DvtMapAreaLayer.prototype.setLabelRendered = function(area, bRender) {
  this._renderLabel[area] = bRender;
};

/**
 * Sets the currently isolated area for this area layer
 * @param {String} isolatedArea The id of the isolated area for this area layer
 */
DvtMapAreaLayer.prototype.setIsolatedArea = function(isolatedArea) {
  this._isolatedArea = isolatedArea;
  // reset the layer dimensions in case of data layer update
  this._layerDim = null;
  for (var area in this.AreaShapes) {
    if (area != isolatedArea)
      this._renderArea[area] = false;
  }
};

/**
 * returns the currently isolated area id for this area layer
 * @return {String}
 */
DvtMapAreaLayer.prototype.getIsolatedArea = function() {
  return this._isolatedArea;
};

/**
 * Returns the dimensions for this area layer.  Used for retrieving saved layer dimensions from built-in basemaps
 * and caching the layer dimensions
 * @return {dvt.Rectangle} The bounding box for this area layer
 */
DvtMapAreaLayer.prototype.getLayerDim = function() {
  if (!this._layerDim) {
    var basemap = this._tmap.getMapName();
    if (this._isolatedArea) {
      // TODO: PathUtils.getDimensions is slightly faster than DOM getDimensions, but
      // there's a bug in the method where the complicated paths found for areas aren't
      // returning the correct bounds
      if (!basemap)
        this._layerDim = dvt.DisplayableUtils.getDimensionsForced(this._tmap.getCtx(), this.getAreaShape(this._isolatedArea));
      else
        this._layerDim = dvt.PathUtils.getDimensions(dvt.PathUtils.createPathArray(DvtBaseMapManager.getPathForArea(this._tmap.getMapName(), this.LayerName, this._isolatedArea)));
    } else {
      if (basemap && basemap != 'world' && basemap != 'worldRegions')
        this._layerDim = DvtBaseMapManager.getBaseMapDim(this._tmap.getMapName(), this.LayerName);
      if (!this._layerDim) {
        // all layers for a basemap should have the same dimensions
        // need to combine area and data layer dimensions bc they are in separate containers
        var dim = this.AreaContainer.getDimensions().getUnion(this._tmap.getDataAreaContainer().getDimensions());
        // if we don't have cached dims and no objects have been rendered yet, dim will have 0 dimensions
        if (dim.w > 0 && dim.h > 0)
          this._layerDim = dim;
      }
    }
  }
  return this._layerDim;
};

DvtMapAreaLayer.prototype._createAreaAndLabel = function(area) {
  var areaShape = this.AreaShapes[area];
  if (areaShape) {
    if (!this.Areas[area]) {
      var context = this._tmap.getCtx();
      var areaName = (this.AreaLabels && this.AreaLabels[area]) ? this.AreaLabels[area][DvtMapAreaLayer._LONG_NAME] : null;
      var mapArea = new DvtMapArea(context, this._tmap, areaShape, area, areaName, this._tmap.supportsVectorEffects());
      this.Areas[area] = mapArea;
      this.EventHandler.associate(areaShape, mapArea);
      mapArea.setDatatip(areaName);
    }

    if (this._renderLabel[area]) {
      var label = this._areaLabels[area];
      if (!label) {
        if (this._labelDisplay != 'off' && this.AreaLabels) {
          var labelText = (this._labelType == 'short') ? this.AreaLabels[area][DvtMapAreaLayer._SHORT_NAME] :
                                                         this.AreaLabels[area][DvtMapAreaLayer._LONG_NAME];
          if (labelText) {
            if (this._labelInfo && this._labelInfo[area])
              label = new DvtMapLabel(this._tmap.getCtx(), labelText, this._labelInfo[area], this._labelDisplay,
                                      this.LabelContainer, this._tmap.supportsVectorEffects());
            else {
              var areaDim = dvt.DisplayableUtils.getDimensionsForced(this._tmap.getCtx(), areaShape);
              label = new DvtMapLabel(this._tmap.getCtx(), labelText, [[areaDim.x, areaDim.y, areaDim.w, areaDim.h]],
                                      this._labelDisplay, this.LabelContainer, this._tmap.supportsVectorEffects());
            }
            this._areaLabels[area] = label;
            if (this._layerCSSStyle)
              label.setCSSStyle(this._layerCSSStyle);
          }
        }
      }
    }
  }
};


/**
 * Adds and area and its label.  Can be used for data layer animations to draw
 * @param {String} area The area to be added.
 * @param {Array} fadeInObjs If provided, the array of objects that will be faded out
 * @private
 */
DvtMapAreaLayer.prototype._addAreaAndLabel = function(area, fadeInObjs) {
  if (this.AreaShapes[area]) {
    this.AreaContainer.addChild(this.Areas[area]);

    var label = this._areaLabels[area];
    if (label) {
      if (this._renderLabel[area])
        label.update(this.PzcMatrix);
      else
        label.reset();
      this._renderedLabels[area] = this._renderLabel[area];
    }

    if (fadeInObjs) {
      fadeInObjs.push(this.Areas[area]);
      if (label) {
        fadeInObjs.push(label);
        fadeInObjs.push(label.getLeaderLine());
      }
    }
  }
};

/**
 * Resets which areas and labels within this area layer are rendered
 */
DvtMapAreaLayer.prototype.resetRenderedAreas = function() {
  // reset rendered areas on data layer update
  for (var area in this.AreaLabels) {
    this.setAreaRendered(area, true);
    this.setLabelRendered(area, true);
  }
};

/**
 * @override
 */
DvtMapAreaLayer.prototype.updateDataLayer = function(dataLayer, pzcMatrix, topLayerName) {
  DvtMapAreaLayer.superclass.updateDataLayer.call(this, dataLayer, pzcMatrix, topLayerName);
  if (topLayerName == this.getLayerName()) {
    for (var area in this.AreaShapes) {
      this._createAreaAndLabel(area);
      if (this._renderArea[area])
        this._addAreaAndLabel(area);
    }
  }
};

/**
 * @override
 */
DvtMapAreaLayer.prototype.render = function(pzcMatrix) {
  // create areashapes and then create the DvtMapArea object for all areas
  for (var area in this.AreaShapes) {
    this._createAreaAndLabel(area);
    if (this._renderArea[area])
      this._addAreaAndLabel(area);
  }
  DvtMapAreaLayer.superclass.render.call(this, pzcMatrix);
};


/**
 * @override
 */
DvtMapAreaLayer.prototype.PreDataLayerUpdate = function() {
  // Create and render areas that were originally not created because the area was already created in the data layer
  for (var area in this._renderArea) {
    if (!this._renderArea[area]) {
      this._createAreaAndLabel(area);
      this._addAreaAndLabel(area);
    }
  }
};


/**
 * @override
 */
DvtMapAreaLayer.prototype.PostDataLayerUpdate = function() {
  // remove areas that were rendered in the data layer or created for the animation
  for (var area in this._renderArea) {
    if (!this._renderArea[area]) {
      this.AreaContainer.removeChild(this.Areas[area]);
      var label = this._areaLabels[area];
      if (label) {
        this._renderedLabels[area] = false;
        this.LabelContainer.removeChild(label);
        var leaderLine = label.getLeaderLine();
        if (leaderLine)
          this.LabelContainer.removeChild(leaderLine);
      }
    }
  }
};

/**
 * Renders a set of the areas within this area layer
 * @param {Array} areas List of areas to render
 * @param {Array} fadeInObjs Array of objects that will be animated into the view
 */
DvtMapAreaLayer.prototype._renderSelectedAreasAndLabels = function(areas, fadeInObjs) {
  for (var i = 0; i < areas.length; i++) {
    this._createAreaAndLabel(areas[i]);
    // Do not render areas that were rendered in the data layer
    if (this._renderArea[areas[i]])
      this._addAreaAndLabel(areas[i], fadeInObjs);
  }
};

/**
 * Returns the node under the specified coordinates.
 * @param {number} x
 * @param {number} y
 * @return {DvtMapArea}
 */
DvtMapAreaLayer.prototype.__getObjectUnderPoint = function(x, y) {
  for (var id in this.Areas) {
    if (this.Areas[id].contains(x, y))
      return this.Areas[id];
  }
  // No object found, return null
  return null;
};


/**
 * Displays drop site feedback for the specified node.
 * @param {DvtMapArea} obj The object for which to show drop feedback, or null to remove drop feedback.
 * @return {dvt.Displayable} The drop site feedback, if any.
 */
DvtMapAreaLayer.prototype.__showDropSiteFeedback = function(obj) {
  // Remove any existing drop site feedback
  if (this._dropSiteFeedback) {
    this.AreaContainer.removeChild(this._dropSiteFeedback);
    this._dropSiteFeedback = null;
  }

  // Create feedback for the node
  if (obj) {
    this._dropSiteFeedback = obj.getDropSiteFeedback();
    if (this._dropSiteFeedback) {
      this._dropSiteFeedback.setFill(new dvt.SolidFill(this._dropSiteCSSStyle.getStyle(dvt.CSSStyle.BACKGROUND_COLOR)));
      var strokeWidth = this._dropSiteCSSStyle.getStyle(dvt.CSSStyle.BORDER_WIDTH) ?
          this._dropSiteCSSStyle.getStyle(dvt.CSSStyle.BORDER_WIDTH).substring(0, this._dropSiteCSSStyle.getStyle(dvt.CSSStyle.BORDER_WIDTH).indexOf('px')) : 1;
      if (!this._tmap.supportsVectorEffects())
        strokeWidth /= this.PzcMatrix.getA();
      var stroke = new dvt.SolidStroke(this._dropSiteCSSStyle.getStyle(dvt.CSSStyle.BORDER_COLOR), 1, strokeWidth);
      if (this._tmap.supportsVectorEffects())
        stroke.setFixedWidth(true);

      this._dropSiteFeedback.setStroke(stroke);
      this.AreaContainer.addChild(this._dropSiteFeedback);
    }
  }

  return this._dropSiteFeedback;
};

/**
 * @override
 */
DvtMapAreaLayer.prototype.HandleZoomEvent = function(event, pzcMatrix) {
  DvtMapAreaLayer.superclass.HandleZoomEvent.call(this, event, pzcMatrix);
  if (!this._tmap.supportsVectorEffects()) {
    for (var area in this.Areas)
      this.Areas[area].HandleZoomEvent(pzcMatrix);
  }

  for (var area in this._renderedLabels) {
    if (this._renderedLabels[area]) {
      var label = this._areaLabels[area];
      if (label)
        label.update(pzcMatrix);
    }
  }
};

var DvtMapDataLayer = function(tmap, parentLayer, clientId, eventHandler, options) {
  this.Init(tmap, parentLayer, clientId, eventHandler, options);
};

dvt.Obj.createSubclass(DvtMapDataLayer, dvt.Obj);

/**
 * @param {string} layerId The client ID of the layer
 */
DvtMapDataLayer.prototype.Init = function(tmap, parentLayer, clientId, eventHandler, options) {
  this._tmap = tmap;
  this._clientId = clientId;
  this._options = options;
  this._areaObjs = [];
  this._markerObjs = [];
  this._linkObjs = [];
  this._dataAreaCollection = [];
  this._dataMarkerCollection = [];
  this._dataLinkCollection = [];

  this._eventHandler = eventHandler;

  this._linkMap = {};

  // Drag and drop support
  this._dragSource = new dvt.DragSource(tmap.getCtx());
  this._eventHandler.setDragSource(this._dragSource);

  this._dataAreaLayer = new dvt.Container(this._tmap.getCtx());
  this._dataPointLayer = new dvt.Container(this._tmap.getCtx());
  this._dataLabelLayer = new dvt.Container(this._tmap.getCtx());
  this._dataLinkLayer = new dvt.Container(this._tmap.getCtx());
  // Add containers to head of parent container so parent layer objects are always drawn first
  this._tmap.getDataAreaContainer().addChildAt(this._dataAreaLayer, 0);
  this._tmap.getDataPointContainer().addChildAt(this._dataPointLayer, 0);
  this._tmap.getLabelContainer().addChildAt(this._dataLabelLayer, 0);
  this._tmap.getLinkContainer().addChildAt(this._dataLinkLayer, 0);

  this._parentLayer = parentLayer;
};

/**
 * Returns the options object for this data layer
 * @return {object}
 */
DvtMapDataLayer.prototype.getOptions = function() {
  return this._options;
};

DvtMapDataLayer.prototype.getDragSource = function() {
  return this._dragSource;
};


/**
 * Returns the DvtContainers for this data layer
 * @return {Array} Array of DvtContainers
 */
DvtMapDataLayer.prototype.getContainers = function() {
  var containers = [this._dataAreaLayer, this._dataPointLayer, this._dataLabelLayer, this._dataLinkLayer];
  return containers;
};


/**
 * Returns an array of scaled containers for data layer animation
 * @return {array} The array of scaled containers
 */
DvtMapDataLayer.prototype.getScaledContainers = function() {
  return [this._dataAreaLayer];
};


/**
 * Returns an array of non scaled containers for data layer animation
 * @return {array} The array of non scaled containers
 */
DvtMapDataLayer.prototype.getNonScaledContainers = function() {
  var containers = [this._dataLabelLayer, this._dataLinkLayer];
  if (this._tmap.isMarkerZoomBehaviorFixed())
    containers.push(this._dataPointLayer);
  return containers;
};


/**
 * Returns the label container for this data layer
 * @return {dvt.Container} container for labels
 */
DvtMapDataLayer.prototype.getDataLabelContainer = function() {
  return this._dataLabelLayer;
};

DvtMapDataLayer.prototype.getMapLayer = function() {
  return this._parentLayer;
};

DvtMapDataLayer.prototype.getMap = function() {
  return this._tmap;
};

DvtMapDataLayer.prototype.getAllObjects = function() {
  return this._markerObjs.concat(this._areaObjs).concat(this._linkObjs);
};

/**
 * Returns the area data objects in a data layer
 * @return {Array} The array of area object peers
 */
DvtMapDataLayer.prototype.getAreaObjects = function() {
  return this._areaObjs;
};

/**
 * Returns the marker and image data objects in a data layer
 * @return {Array} The array of marker and image object peers
 */
DvtMapDataLayer.prototype.getMarkerObjects = function() {
  return this._markerObjs;
};

/**
 * Returns the marker and image data objects in a data layer
 * @return {Array} The array of link object peers
 */
DvtMapDataLayer.prototype.getLinkObjects = function() {
  return this._linkObjs;
};

DvtMapDataLayer.prototype.getNavigableAreaObjects = function() {
  var navigables = [];
  for (var i = 0; i < this._areaObjs.length; i++) {
    navigables.push(this._areaObjs[i]);
  }
  return navigables;
};

/**
 * Adds an data object to this data layer
 * @param {DvtMapObjPeer} obj The map data marker or image to add
 */
DvtMapDataLayer.prototype.addMarkerObject = function(obj) {
  this._dataMarkerCollection.push(obj);
  if (obj) {
    this._markerObjs.push(obj);
    this._eventHandler.associate(obj.getDisplayable(), obj);
    var label = obj.getLabel();
    if (label)
      this._eventHandler.associate(label, obj);
  }
};

/**
 * Adds a data area to this data layer
 * @param {DvtMapAreaPeer} obj The map data area to add
 */
DvtMapDataLayer.prototype.addAreaObject = function(obj) {
  this._dataAreaCollection.push(obj);
  if (obj) {
    this._areaObjs.push(obj);
    this._eventHandler.associate(obj.getDisplayable(), obj);
    obj.setAreaLayer(this._dataAreaLayer);
  }
};

/**
 * Adds a data area to this data layer
 * @param {DvtMapLinkPeer} obj The map data link to add
 */
DvtMapDataLayer.prototype.addLinkObject = function(obj) {
  this._dataLinkCollection.push(obj);
  if (obj) {
    this._linkObjs.push(obj);
    this._eventHandler.associate(obj.getDisplayable(), obj);
  }
};

/**
 * Tracks the number of links going between the same set of start and end points. Used for overlap detection.
 * @param {dvt.Point} start The start point of the link
 * @param {dvt.Point} end The end point of the link
 * @return {number} The current number of links going between that set of points
 */
DvtMapDataLayer.prototype.trackLink = function(start, end) {
  // Store the link in a map using start/end points as key so we can track overlap
  var key = DvtMapDataLayer._getLinkKey(start, end);
  if (!this._linkMap[key])
    this._linkMap[key] = 1;
  else
    this._linkMap[key]++;
  return this._linkMap[key];
};

/**
 * Generates a key using the start/end points.  Used for link tracking.
 * @param {dvt.Point} start The start point of the link
 * @param {dvt.Point} end The end point of the link
 * @return {string} The link key
 * @private
 */
DvtMapDataLayer._getLinkKey = function(start, end) {
  if (start.x < end.x)
    return start.x.toString() + start.y.toString() + end.x.toString() + end.y.toString();
  else
    return end.x.toString() + end.y.toString() + start.x.toString() + start.y.toString();
};

/**
 * Returns the array of data areas for this data layer.
 * Used for automation and may contain nulls if items are hidden.
 * @return {Array}
 */
DvtMapDataLayer.prototype.getDataAreaCollection = function() {
  return this._dataAreaCollection;
};

/**
 * Returns the array of data markers for this data layer.
 * Used for automation and may contain nulls if items are hidden.
 * @return {Array}
 */
DvtMapDataLayer.prototype.getDataMarkerCollection = function() {
  return this._dataMarkerCollection;
};

/**
 * Returns the array of data links for this data layer.
 * Used for automation and may contain nulls if items are hidden.
 * @return {Array}
 */
DvtMapDataLayer.prototype.getDataLinkCollection = function() {
  return this._dataLinkCollection;
};

/**
 * Removes an area object from this data layer
 * @param {DvtMapAreaPeer} obj The map area to remove
 * @private
 */
DvtMapDataLayer.prototype._removeAreaObject = function(obj) {
  var idx = this._areaObjs.indexOf(obj);
  if (idx !== -1)
    this._areaObjs.splice(idx, 1);
};

DvtMapDataLayer.prototype.getClientId = function() {
  return this._clientId;
};

DvtMapDataLayer.prototype.setAnimation = function(animType) {
  this._animType = animType;
};

DvtMapDataLayer.prototype.getAnimation = function() {
  return this._animType;
};

DvtMapDataLayer.prototype.setAnimationDuration = function(animDur) {
  this._animDur = animDur;
};

DvtMapDataLayer.prototype.getAnimationDuration = function() {
  return this._animDur;
};


/**
 * Sets the selection mode for this data layer
 * @param {String} mode The selection mode. Valid values are 's' and 'm'
 */
DvtMapDataLayer.prototype.setSelectionMode = function(mode) {
  this._selectionMode = mode;
  if (this._selectionMode) {
    this._selectionHandler = new dvt.SelectionHandler(this._tmap.getCtx(), this._selectionMode);
    this._eventHandler.setSelectionHandler(this._clientId, this._selectionHandler);
  }
};

DvtMapDataLayer.prototype.isSelectable = function() {
  return this._selectionMode != null;
};

DvtMapDataLayer.prototype.setIsolatedAreaRowKey = function(isolated) {
  this._isolatedAreaRowKey = isolated;
};


/**
 * Since we don't set the area path commands until render time, we create an empty DvtSelectablePath when parsing the xml
 * so we can still set the area color and other info.  This path with no commands needs to be updated before adding to DOM.
 */
DvtMapDataLayer.prototype._updateAreaShape = function(areaObj) {
  var displayable = areaObj.getDisplayable();
  var pathToCopy = this._parentLayer.getAreaShape(areaObj.getLocation());
  if (!pathToCopy) {
    this._removeAreaObject(areaObj);
    return false;
  } else {
    displayable.setCmds(pathToCopy.getCmds());
    return true;
  }
};


/**
 * Renders a specific DvtMapAreaPeer and updates the label
 * @param {number} areaIndex index of the area to be rendered
 * @return {boolean} Whether the area was successfully rendered
 * @private
 */
DvtMapDataLayer.prototype._renderAreaAndLabel = function(areaIndex) {
  if (this._updateAreaShape(this._areaObjs[areaIndex])) {
    var displayable = this._areaObjs[areaIndex].getDisplayable();
    this._dataAreaLayer.addChild(displayable);
    var label = this._areaObjs[areaIndex].getLabel();
    if (label) {
      if (!label.hasBounds()) {
        var areaDim = displayable.getDimensions();
        label.addBounds(areaDim);
      }
      label.update(this._pzcMatrix);
    }
    return true;
  }
  return false;
};


/**
 * Render the data layer objects
 * @param {dvt.Matrix} pzcMatrix The matrix to use when rendering the data layer
 */
DvtMapDataLayer.prototype.render = function(pzcMatrix) {
  this._pzcMatrix = pzcMatrix;
  var areaLabelsToRemove = {};
  // first make a copy of markers and then sort by size to prevent overlapping
  // original order should be kept for automation purposes
  var dataObjs = this._markerObjs.slice();
  dataObjs.sort(function compare(a,b) {if (a.getSize() < b.getSize()) return 1; else if (a.getSize() > b.getSize()) return -1; else return 0;});
  for (var i = 0; i < dataObjs.length; i++) {
    var dataObj = dataObjs[i];
    var displayable = dataObj.getDisplayable();
    var label = dataObj.getLabel();
    if (label) {
      var container = new dvt.Container(displayable.getCtx());
      this._dataPointLayer.addChild(container);
      container.addChild(displayable);
      container.addChild(label);
      dataObj.positionLabel();
    } else {
      this._dataPointLayer.addChild(displayable);
    }
    // if area marker, do not display area label
    var regionId = dataObj.getLocation();
    if (regionId)
      areaLabelsToRemove[regionId] = true;
  }
  for (var i = 0; i < this._areaObjs.length; i++) {
    if (areaLabelsToRemove[this._areaObjs[i].getLocation()])
      this._areaObjs[i].removeLabel();
    // areaObjs array can be modified by _renderAreaAndLabel if area has
    // been removed from parent area layer due to path simplification routine
    if (!this._renderAreaAndLabel(i))
      i--;
  }
  for (var i = 0; i < this._linkObjs.length; i++) {
    this._dataLinkLayer.addChild(this._linkObjs[i].getDisplayable());
  }

  if (this._initSelections)
    this._processInitialSelections();
};

/**
 * Handles zoom events for the data layer objects
 * @param {dvt.ZoomEvent} event The zoom event sent by the pan zoom canvas
 * @param {dvt.Matrix} pzcMatrix The pan zoom canvas matrix
 * @protected
 */
DvtMapDataLayer.prototype.HandleZoomEvent = function(event, pzcMatrix) {
  this._pzcMatrix = pzcMatrix;

  var areaObjs = this.getAreaObjects();
  for (var i = 0; i < areaObjs.length; i++)
    areaObjs[i].HandleZoomEvent(pzcMatrix);

  if (this._tmap.isMarkerZoomBehaviorFixed()) {
    var markerObjs = this.getMarkerObjects();
    for (var i = 0; i < markerObjs.length; i++)
      markerObjs[i].HandleZoomEvent(pzcMatrix);
  }

  // reset link map so we can recalculate curve heights correctly
  this._linkMap = {};
  var linkObjs = this.getLinkObjects();
  for (var i = 0; i < linkObjs.length; i++)
    linkObjs[i].HandleZoomEvent(pzcMatrix);
};


/**
 * Processes a pan event for this data layer and updates the locations of its data objects
 * @param {dvt.Matrix} pzcMatrix The matrix to use for updating data object locations
 * @protected
 */
DvtMapDataLayer.prototype.HandlePanEvent = function(pzcMatrix) {
  this._pzcMatrix = pzcMatrix;
};


DvtMapDataLayer.prototype.setInitialSelections = function(selections) {
  this._initSelections = selections;
};


/**
 * Update the selection handler with the initial selections.
 */
DvtMapDataLayer.prototype._processInitialSelections = function() {
  if (this._selectionHandler) {
    this._selectionHandler.processInitialSelections(this._initSelections, this.getAllObjects());
    this._initSelections = null;
  }
};


/**
 * Returns the row keys for the current drag.
 * @param {DvtMapObjPeer} obj The object where the drag was initiated.
 * @return {array} The row keys for the current drag.
 */
DvtMapDataLayer.prototype.__getDragTransferable = function(obj) {
  if (this._selectionHandler) {
    // Select the node if not already selected
    if (!obj.isSelected()) {
      this._selectionHandler.processClick(obj, false);
      this._eventHandler.fireSelectionEvent(obj);
    }

    // Gather the rowKeys for the selected objects
    var rowKeys = [];
    var selection = this._selectionHandler.getSelection();
    for (var i = 0; i < selection.length; i++) {
      rowKeys.push(selection[i].getId());
    }

    return rowKeys;
  } else {
    return null;
  }
};


/**
 * Returns the displayables to use for drag feedback for the current drag.
 * @return {array} The displayables for the current drag.
 */
DvtMapDataLayer.prototype.__getDragFeedback = function() {
  // This is called after __getDragTransferable, so the selection has been updated already.
  // Gather the displayables for the selected objects
  var displayables = [];
  var selection = this._selectionHandler.getSelection();
  for (var i = 0; i < selection.length; i++) {
    displayables.push(selection[i].getDisplayable());
  }

  return displayables;
};


/**
 * Given a list of area row keys, looks up and returns a list of their area ids
 * @param {Array} selectedObjs keys of areas to retrieve area ids for
 * @return {Array} Area ids
 */
DvtMapDataLayer.prototype.getSelectedAreas = function(selectedObjs) {
  var selectedAreas = [];
  var areaObjs = this.getAreaObjects();
  var ctx = this._tmap.getCtx();
  var selectionSet = new ctx.KeySetImpl(selectedObjs);
  for (var j = 0; j < areaObjs.length; j++) {
    if (selectionSet.has(areaObjs[j].getId())) {
      selectedAreas.push(areaObjs[j].getLocation());
      break;
    }
  }
  return selectedAreas;
};

/**
 * Releases all component resources to prevent memory leaks.
 */
DvtMapDataLayer.prototype.destroy = function() {
  var dataObjs = this.getAllObjects();
  for (var i = 0; i < dataObjs.length; i++) {
    var disp = dataObjs[i].getDisplayable();
    if (disp instanceof DvtCustomDataItem) {
      var rootObj = disp.getRootElement();
      if (rootObj.destroy)
        rootObj.destroy();
    }
  }
  // Null out reference to event handler which is just a reference to DvtThematicMap's which will
  // be cleanedup in its destroy
  this._eventHandler = null;
};

/**
 * Gets an array of navigable links for the specified marker
 * @param {string} markerId The marker id
 * @return {array} array of navigable links for the specified node
 */
DvtMapDataLayer.prototype.getNavigableLinksForNodeId = function(markerId) {
  var links = [];
  var ctx = this._tmap.getCtx();
  for (var i = 0; i < this._dataLinkCollection.length; i++) {
    var link = this._dataLinkCollection[i];
    var startMarker = link.getStartMarker();
    var endMarker = link.getEndMarker();
    if (startMarker && dvt.Obj.compareValues(ctx, startMarker.getId(), markerId))
      links.push(link);
    else if (endMarker && dvt.Obj.compareValues(ctx, endMarker.getId(), markerId))
      links.push(link);
  }
  return links;
};

/**
 * @param {dvt.ThematicMap} tmap The owning component
 * @param {dvt.EventManager} manager The owning dvt.EventManager
 * @class DvtThematicMapKeyboardHandler
 * @extends {dvt.KeyboardHandler}
 * @constructor
 */
var DvtThematicMapKeyboardHandler = function(tmap, manager) {
  this.Init(tmap, manager);
};

dvt.Obj.createSubclass(DvtThematicMapKeyboardHandler, dvt.PanZoomCanvasKeyboardHandler);


/**
 * Constant for link to node keyboard navigation mode.
 * @const
 */
DvtThematicMapKeyboardHandler.LINK_NODE_NAV = 'linkNode';
/**
 * Constant for link only keyboard navigation mode.
 * @const
 */
DvtThematicMapKeyboardHandler.LINK_NAV = 'link';

/**
 * @override
 */
DvtThematicMapKeyboardHandler.prototype.Init = function(tmap, manager) {
  DvtThematicMapKeyboardHandler.superclass.Init.call(this, tmap, manager);
  this._tmap = tmap;
  this._linkNavType = DvtThematicMapKeyboardHandler.LINK_NAV;
};


/**
 * @override
 */
DvtThematicMapKeyboardHandler.prototype.isSelectionEvent = function(event) {
  return this.isNavigationEvent(event) && !event.ctrlKey;
};


/**
 * @override
 */
DvtThematicMapKeyboardHandler.prototype.processKeyDown = function(event) {
  var keyCode = event.keyCode;
  var focusObj = this._eventManager.getFocus();
  if (keyCode == dvt.KeyboardEvent.CLOSE_BRACKET) {
    // Set the data layer link navigation type
    this._linkNavType = DvtThematicMapKeyboardHandler.LINK_NAV;
    // Traverse data objects in order of areas ] markers ] links
    var navigables = [];
    if (focusObj instanceof DvtMapAreaPeer)
      navigables = this._tmap.getNavigableMarkers();
    // DvtMapLinkPeer and DvtMapAreaPeer are subclasses of DvtMapObjPeer so we need to check type name instead of instanceof
    if (focusObj.getTypeName() === 'DvtMapObjPeer' || navigables.length === 0) {
      navigables = this._tmap.getNavigableLinks();
    }
    if (navigables.length > 0) {
      focusObj = dvt.KeyboardHandler.getNextAdjacentNavigable(focusObj, event, navigables);
      this._tmap.ensureObjInViewport(event, focusObj);
    }
    this._eventManager.SetClickInfo(focusObj);
  }
  else if (keyCode == dvt.KeyboardEvent.OPEN_BRACKET) {
    // Set the data layer link navigation type
    this._linkNavType = DvtThematicMapKeyboardHandler.LINK_NAV;
    // Traverse data objects in order of links [ markers [ areas
    var navigables = [];
    if (focusObj instanceof DvtMapLinkPeer)
      navigables = this._tmap.getNavigableMarkers();
    // DvtMapLinkPeer and DvtMapAreaPeer are subclasses of DvtMapObjPeer so we need to check type name instead of instanceof
    if (focusObj.getTypeName() === 'DvtMapObjPeer' || navigables.length === 0)
      navigables = this._tmap.getNavigableAreas();
    if (navigables.length > 0) {
      focusObj = dvt.KeyboardHandler.getNextAdjacentNavigable(focusObj, event, navigables);
      this._tmap.ensureObjInViewport(event, focusObj);
    }
    this._eventManager.SetClickInfo(focusObj);
  }
  else {
    if ((event.keyCode == dvt.KeyboardEvent.OPEN_ANGLED_BRACKET || dvt.KeyboardEvent.CLOSE_ANGLED_BRACKET) && event.altKey) {
      // save a reference to the marker
      this._linkMarker = focusObj;
      this._linkNavType = DvtThematicMapKeyboardHandler.LINK_NODE_NAV;
    }
    focusObj = DvtThematicMapKeyboardHandler.superclass.processKeyDown.call(this, event);
    // update the clicked object for a navigation and selection event
    if (this.isNavigationEvent(event) && !event.ctrlKey) {
      this._eventManager.SetClickInfo(focusObj);
    }
  }
  return focusObj;

};

/**
 * Returns whether the keyboard link navigation is amonst links or from link to markers
 * @return {string} The link navigation type
 */
DvtThematicMapKeyboardHandler.prototype.getLinkNavigationType = function() {
  return this._linkNavType;
};

/**
 * Returns the marker that was used to navigate to the current link
 * @return {dvt.SimpleMarker} The marker that was used to navigate to the current link
 */
DvtThematicMapKeyboardHandler.prototype.getLinkMarker = function() {
  return this._linkMarker;
};

/**
 * @override
 */
DvtThematicMapKeyboardHandler.prototype.isMultiSelectEvent = function(event) {
  return event.keyCode == dvt.KeyboardEvent.SPACE && event.ctrlKey;
};


/**
 * @override
 */
DvtThematicMapKeyboardHandler.prototype.isNavigationEvent = function(event) {
  var isNavigable = DvtThematicMapKeyboardHandler.superclass.isNavigationEvent.call(this, event);

  switch (event.keyCode) {
    case dvt.KeyboardEvent.OPEN_BRACKET:
    case dvt.KeyboardEvent.CLOSE_BRACKET:
      isNavigable = true;
      break;
    case dvt.KeyboardEvent.OPEN_ANGLED_BRACKET:
    case dvt.KeyboardEvent.CLOSE_ANGLED_BRACKET:
      isNavigable = event.altKey ? true : false;
      break;
    default:
      isNavigable = DvtThematicMapKeyboardHandler.superclass.isNavigationEvent.call(this, event);
  }

  return isNavigable;
};

/**
 * Returns first navigable link.
 * @param {DvtMapObjPeer} marker The marker for which links are analyzed
 * @param {dvt.KeyboardEvent} event The keyboard event
 * @param {array} listOfLinks The array of links for the marker
 * @return {DvtMapLinkPeer} The first navigable link
 */
DvtThematicMapKeyboardHandler.getFirstNavigableLink = function(marker, event, listOfLinks) {
  var direction = event.keyCode;
  if (!listOfLinks || listOfLinks.length < 1 || !marker)
    return null;
  var markerPt = marker.getCenter();

  var ctx = marker.getDisplayable().getCtx();
  for (var i = 0; i < listOfLinks.length; i++)
  {
    var link = listOfLinks[i];
    var linkPt;
    if (dvt.Obj.compareValues(ctx, marker.getId(), link.getStartMarker().getId()))
      linkPt = link.getEndPoint();
    else
      linkPt = link.getStartPoint();
    if ((direction == dvt.KeyboardEvent.OPEN_ANGLED_BRACKET && linkPt.x <= markerPt.x) ||
        (direction == dvt.KeyboardEvent.CLOSE_ANGLED_BRACKET && linkPt.x >= markerPt.x)) {
      break;
    }
  }
  return link;
};

// Copyright (c) 2011, 2017, Oracle and/or its affiliates. All rights reserved.

/**
 * @param {dvt.Context} context The rendering context.
 * @param {function} callback The function that should be called to dispatch component events.
 * @param {DvtThematicMap} callbackObj The object to dispatch component events to
 * @constructor
 */
var DvtThematicMapEventManager = function(context, callback, callbackObj) {
  this.Init(context, callback, callbackObj);
};

dvt.Obj.createSubclass(DvtThematicMapEventManager, dvt.EventManager);

/**
 * Helper class to initialize an event manager for a thematic map.
 * @param {dvt.Context} context The rendering context.
 * @param {function} callback The function that should be called to dispatch component events.
 * @param {DvtThematicMap} callbackObj The object to dispatch component events to
 * @protected
 */
DvtThematicMapEventManager.prototype.Init = function(context, callback, callbackObj) {
  DvtThematicMapEventManager.superclass.Init.call(this, context, callback, callbackObj);
  this._selectionHandlers = new Object();
  this._tmap = callbackObj;
  this._bPassOnEvent = false;
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.getSelectionHandler = function(logicalObj) {
  if (logicalObj && logicalObj.getDataLayer) {
    var clientId = logicalObj.getDataLayer().getClientId();
    return this._selectionHandlers[clientId];
  }
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.setSelectionHandler = function(dataLayerId, handler) {
  this._selectionHandlers[dataLayerId] = handler;
};

/**
 * Sets the initial focus for the map.
 * @param {DvtMapObjPeer} navigable
 */
DvtThematicMapEventManager.prototype.setInitialFocus = function(navigable) {
  //focus object will be set on child layers
  if (navigable) {
    DvtThematicMapEventManager.superclass.setFocus.call(this, navigable);
  }
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.OnClick = function(event) {
  var obj = this.GetLogicalObject(event.target);
  this.SetClickInfo(obj);

  // Clear all selection handlers if something not selectable is clicked
  if (!(obj && obj.isSelectable && obj.isSelectable())) {
    for (var clientId in this._selectionHandlers) {
      var bSelectionChanged = this._selectionHandlers[clientId].processClick(null, event.ctrlKey);
      // If the selection has changed, fire an event
      if (bSelectionChanged) {
        var selectionEvent = dvt.EventFactory.newSelectionEvent([]);
        selectionEvent['clientId'] = clientId;
        this._callback.call(this._callbackObj, selectionEvent);
      }
    }
  }

  DvtThematicMapEventManager.superclass.OnClick.call(this, event);
};

/**
 * Sets the dtaa layer information for the last clicked item.
 * @param {DvtMapObjPeer} obj
 */
DvtThematicMapEventManager.prototype.SetClickInfo = function(obj) {
  var clientId = null;
  var mapLayer = null;
  var clickedObj = null;
  if (obj) {
    if (obj instanceof DvtMapObjPeer)
      clickedObj = obj.getDisplayable();
    else if (obj instanceof DvtMapArea)
      clickedObj = obj;
    if (obj.getDataLayer) {
      var dataLayer = obj.getDataLayer();
      clientId = dataLayer.getClientId();
      mapLayer = dataLayer.getMapLayer().getLayerName();
    }
  }
  this._tmap.setClickInfo(clientId, mapLayer, clickedObj);
};

/**
 * Keyboard event handler. Handles keyboard navigation and triggering of context menus
 * @param {dvt.KeyboardEvent} event
 * @return {boolean} true if this event manager has consumed the event
 */
DvtThematicMapEventManager.prototype.ProcessKeyboardEvent = function(event) {
  var eventConsumed = true;
  var keyCode = event.keyCode;
  var focusObj = this.getFocus();
  var focusDisp = focusObj.getDisplayable();

  // Mashup
  if (keyCode != dvt.KeyboardEvent.TAB && this._bPassOnEvent) {
    focusDisp.fireKeyboardListener(event);
    event.preventDefault();
  }
  // Selection
  else if (keyCode == dvt.KeyboardEvent.SPACE && event.ctrlKey) {
    this.SetClickInfo(focusObj);
    this.ProcessSelectionEventHelper(focusObj, true);
    event.preventDefault();
  }
  // Zoom to fit
  else if ((keyCode == dvt.KeyboardEvent.ZERO || keyCode == dvt.KeyboardEvent.NUMPAD_ZERO) && event.ctrlKey) {
    if (event.altKey)
      this._tmap.fitRegion(focusDisp);
    else
      this._tmap.fitSelectedRegions();
    event.preventDefault();
  }
  // Mashups
  else if (keyCode == dvt.KeyboardEvent.TAB && focusDisp instanceof DvtCustomDataItem) {
    // If displayable is already focused, then tab enters stamp and all future events pass to stamp until shift+tab
    // or tab out
    if (!event.shiftKey && focusObj.isShowingKeyboardFocusEffect()) {
      focusObj.hideKeyboardFocusEffect();
      focusDisp.fireKeyboardListener(event);
      event.preventDefault();
      this._bPassOnEvent = true;
    }
    // If stamp is focused, shift+tab will move focus back to thematic map
    else if (event.shiftKey && this._bPassOnEvent) {
      this.ShowFocusEffect(event, focusObj);
      event.preventDefault();
      this._bPassOnEvent = false;
    }
    // All other tab cases should be handled by superclass and will move focus out of component
    else {
      if (this._bPassOnEvent)
        focusObj.showKeyboardFocusEffect(); // checked by superclass to tab out of component
      eventConsumed = DvtThematicMapEventManager.superclass.ProcessKeyboardEvent.call(this, event);
      this._bPassOnEvent = false;
    }
  } else {
    if (keyCode == dvt.KeyboardEvent.TAB && focusObj) {//make sure focused obj in on screen
      this._tmap.ensureObjInViewport(event, focusObj);
    }
    eventConsumed = DvtThematicMapEventManager.superclass.ProcessKeyboardEvent.call(this, event);
  }

  return eventConsumed;
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.OnComponentTouchClick = function(event) {
  var consumed = this.GetEventInfo(event, dvt.PanZoomCanvasEventManager.EVENT_INFO_PANNED_KEY);
  if (consumed)
    return;

  var obj = this.GetLogicalObject(event.target);
  this.SetClickInfo(obj);

  // If logical object is dvt.ThematicMap, then background was tapped and we should call data layer
  // selection handlers to clear selection
  if (obj instanceof dvt.ThematicMap) {
    for (var clientId in this._selectionHandlers) {
      var bSelectionChanged = this._selectionHandlers[clientId].processClick(null, event.ctrlKey);
      // If the selection has changed, fire an event
      if (bSelectionChanged) {
        var selectedObjs = this._selectionHandlers[clientId].getSelection();
        var selectedIds = [];
        for (var i = 0; i < selectedObjs.length; i++)
          selectedIds.push(selectedObjs[i].getId());
        var selectionEvent = dvt.EventFactory.newSelectionEvent(selectedIds);
        this._callback.call(this._callbackObj, selectionEvent);
      }
    }
  }

  DvtThematicMapEventManager.superclass.OnComponentTouchClick.call(this, event);
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.HandleTouchActionsEnd = function(event, touch) {
  // Set click info before superclass so we have the area and data layer info before firing selection event
  var obj = this.GetLogicalObject(event.target);
  this.SetClickInfo(obj);
  DvtThematicMapEventManager.superclass.HandleTouchActionsEnd.call(this, event, touch);
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.ProcessRolloverEvent = function(event, obj, bOver) {
  // Don't continue if not enabled
  var options = this._tmap.getOptions();
  if (options['hoverBehavior'] != 'dim')
    return;

  // Compute the new highlighted categories and update the options
  var categories = obj.getCategories ? obj.getCategories() : [];
  options['highlightedCategories'] = bOver ? categories.slice() : null;

  // Fire the event to the rollover handler, who will fire to the component callback.
  var rolloverEvent = dvt.EventFactory.newCategoryHighlightEvent(options['highlightedCategories'], bOver);
  var hoverBehaviorDelay = dvt.StyleUtils.getTimeMilliseconds(options['styleDefaults']['hoverBehaviorDelay']);
  this.RolloverHandler.processEvent(rolloverEvent,
      this._tmap.getNavigableAreas().concat(this._tmap.getNavigableMarkers()).concat(this._tmap.getNavigableLinks()),
      hoverBehaviorDelay, options['highlightMatch'] == 'any');
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.GetTouchResponse = function() {
  var options = this._tmap.getOptions();
  if (options['panning'] !== 'none' || options['zooming'] !== 'none')
    return dvt.EventManager.TOUCH_RESPONSE_TOUCH_HOLD;
  else if (options['touchResponse'] === dvt.EventManager.TOUCH_RESPONSE_TOUCH_START)
    return dvt.EventManager.TOUCH_RESPONSE_TOUCH_START;
  return dvt.EventManager.TOUCH_RESPONSE_AUTO;
};

/**
 * @override
 */
DvtThematicMapEventManager.prototype.StoreInfoByEventType = function(key) {
  if (key == dvt.PanZoomCanvasEventManager.EVENT_INFO_PANNED_KEY) {
    return false;
  }
  return DvtThematicMapEventManager.superclass.StoreInfoByEventType.call(this, key);
};

/**
 * Shows the keyboard focus effects wich includes tooltip, for a keyboard navigable object.
 * @param {dvt.KeyboardEvent} event The keyboard event
 * @param {DvtKeyboardNavigable} navigable The keyboard navigable to show focus effect for
 */
DvtThematicMapEventManager.prototype.showFocusEffect = function(event, navigable) {
  this.ShowFocusEffect(event, navigable);
};
/**
 * @override
 */
DvtThematicMapEventManager.prototype.ShowFocusEffect = function(event, obj) {
  if (!this._tmap.isPanning())
    DvtThematicMapEventManager.superclass.ShowFocusEffect.call(this, event, obj);
};

// Copyright (c) 2011, 2018, Oracle and/or its affiliates. All rights reserved.
/**
 * Thematic Map JSON parser
 * @param {dvt.ThematicMap} tmap The thematic map to update
 * @constructor
 */
var DvtThematicMapJsonParser = function(tmap) {
  this.Init(tmap);
};

dvt.Obj.createSubclass(DvtThematicMapJsonParser, dvt.Obj);

/** @private */
DvtThematicMapJsonParser._MIN_MARKER_SIZE = 6;

/** @private */
DvtThematicMapJsonParser._MAX_MARKER_SIZE_RATIO = 0.5;

/**
 * Hard coded pan zoom canvas padding snce we don't render pzc until render call, but we also don't adjust the
 * padding for TMap so we can hard code value for marker bubble sizing algorithm.
 * @private
 */
DvtThematicMapJsonParser._PZC_PADDING = 20;

/**
 * Initializes this thematic map JSON parser
 * @param {dvt.ThematicMap} tmap The thematic map to update
 */
DvtThematicMapJsonParser.prototype.Init = function(tmap) {
  this._tmap = tmap;
  this._areaLayerStyle = null;
  this._areaLayerStyleObject = null;
};

/**
 * Parses a JSON object containing map attributes and data
 * @param {Object} options The JSON object to parse
 */
DvtThematicMapJsonParser.prototype.parse = function(options) {
  var mapProvider = options['mapProvider'];
  if (DvtMapProviderUtils.containsGeoJson(mapProvider))
    this._mapProvider = mapProvider;
  this._parseMapProperties(options);
  this._parseStyles(options['styleDefaults']);
  this._parseAreaLayer(options['areaLayers']);
  this.ParseDataLayers(options['pointDataLayers'], null, null, false);
};

/**
 * Parses a JSON object containing map attributes
 * @param {Object} options The JSON object to parse
 * @private
 */
DvtThematicMapJsonParser.prototype._parseMapProperties = function(options) {
  var animDur = options['animationDuration'];
  if (typeof animDur == 'string') {
    if (animDur.slice(-2) == 'ms')
      animDur = parseInt((animDur.slice(0, -2))) / 1000;
    else if (animDur.slice(-1) == 's')
      animDur = parseFloat(animDur.slice(0, -1));
  } else {
    // default unit is milliseconds
    animDur /= 1000;
  }
  this._tmap.setAnimationDuration(animDur);

  if (!this._mapProvider)
    this._tmap.setMapName(options['basemap']);

  // zooming attributes
  this._tmap.setInitialZooming(options['initialZooming'] == 'auto');
  this._tmap.setPanning(options['panning'] == 'auto');
  this._tmap.setZooming(options['zooming'] == 'auto');
};

/**
 * Parses a JSON object containing map area layer attributes and data
 * @param {Array} areaLayers The JSON object to parse
 * @private
 */
DvtThematicMapJsonParser.prototype._parseAreaLayer = function(areaLayers) {
  // Legacy code supports an array of area layers, but this code just handles the JET case where
  // we only ever render the first area layer
  var context = this._tmap.getCtx();
  var areaLayer = this._tmap.Defaults.calcAreaLayerOptions(areaLayers[0], context.isCustomElement());
  var layer = areaLayer['layer'];
  // layer and basemap names not required when using mapProvider
  if (!layer && !this._mapProvider)
    return;

  var mapLayer;
  var areaStyle = areaLayer['areaSvgStyle'] || areaLayer['areaStyle'];
  if (areaStyle) {
    //If the areaStyle is a string convert it to object
    if (!(areaStyle instanceof Object))
      areaStyle = dvt.CSSStyle.cssStringToObject(areaStyle);
    var areaCSSStyle = DvtThematicMapJsonParser._getAreaCSSStyle(areaStyle);
    this._areaLayerStyleObject = dvt.JsonUtils.merge(areaStyle, this._areaLayerStyleObject);
    this._areaLayerStyle.merge(areaCSSStyle);
  }

  // styleDefaults.labelStyle is a dvt.CSSStyle
  var areaLabelStyle = this._tmap.getStyleDefaults()['labelStyle'];
  if (areaLabelStyle)
    this._areaLayerStyle.merge(areaLabelStyle);
  // areaLayers.labelStyle is a string or object
  areaLabelStyle = areaLayer['labelStyle'];
  if (areaLabelStyle)
    this._areaLayerStyle.parseInlineStyle(areaLabelStyle);

  mapLayer = new DvtMapAreaLayer(this._tmap, layer, areaLayer['labelDisplay'], areaLayer['labelType'],
      this._tmap.getEventManager());

  var basemap = this._tmap.getMapName();
  var paths, labels, labelsInfo;
  if (this._mapProvider) {
    var mapInfo = DvtMapProviderUtils.parseMapInfo(context, this._mapProvider);
    paths = mapInfo.areas;
    labels = mapInfo.labels;
  } else {
    paths = DvtBaseMapManager.getAreaPaths(basemap, layer, this._tmap.getWidth(), this._tmap.getHeight(),
        this._tmap.getMaxZoomFactor());
    labels = DvtBaseMapManager.getAreaLabels(basemap, layer);
    labelsInfo = DvtBaseMapManager.getAreaLabelInfo(basemap, layer);
  }
  mapLayer.setAreaShapes(this._createPathShapes(paths));
  mapLayer.setAreaLabels(labels);
  mapLayer.setAreaLabelInfo(labelsInfo);

  mapLayer.setLayerCSSStyle(this._areaLayerStyle);
  mapLayer.setDropSiteCSSStyle(this._areaDropSiteStyle);

  this._tmap.addLayer(mapLayer);
  // parse data layers
  if (areaLayer['areaDataLayer'])
    this.ParseDataLayers([areaLayer['areaDataLayer']], mapLayer, null, true);
  if (areaLayer['pointDataLayers'])
    this.ParseDataLayers(areaLayer['pointDataLayers'], mapLayer, null, false);
};


/**
 * Parses JSON objects containing map data layer attributes and data
 * @param {Array} dataLayers An array of data layer JSON objects to parse
 * @param {DvtMapLayer} parentLayer The parent map layer this data layer belongs to
 * @param {String} topLayerName The name of the top area layer passed in for data layer updates
 * @param {boolean} isAreaDataLayer True if we are parsing an area data layer
 * @protected
 */
DvtThematicMapJsonParser.prototype.ParseDataLayers = function(dataLayers, parentLayer, topLayerName, isAreaDataLayer) {
  if (!dataLayers)
    return;

  var ctx = this._tmap.getCtx();
  for (var i = 0; i < dataLayers.length; i++) {
    var dataLayerOptions = this._tmap.Defaults.calcDataLayerOptions(dataLayers[i]);

    if (parentLayer) {
      if (parentLayer instanceof DvtMapAreaLayer && isAreaDataLayer)
        parentLayer.resetRenderedAreas();
    } else {
      parentLayer = new DvtMapLayer(this._tmap, dataLayerOptions['id'], this._tmap.getEventManager());
      this._tmap.addLayer(parentLayer);
    }
    var dataLayer = new DvtMapDataLayer(this._tmap, parentLayer, dataLayerOptions['id'], this._tmap.getEventManager(), dataLayerOptions);

    var selectionMode = dataLayerOptions['selectionMode'];
    if (selectionMode == 'single')
      dataLayer.setSelectionMode(dvt.SelectionHandler.TYPE_SINGLE);
    else if (selectionMode == 'multiple')
      dataLayer.setSelectionMode(dvt.SelectionHandler.TYPE_MULTIPLE);

    dataLayer.setAnimation(dataLayerOptions['animationOnDataChange']);
    dataLayer.setAnimationDuration(this._tmap.getAnimationDuration());

    //Add initially isolated area
    var isolatedRowKey = null;
    if (parentLayer instanceof DvtMapAreaLayer)
      isolatedRowKey = dataLayerOptions['isolatedItem'];

    var isolatedAreaId;
    var isAreaDataLayer = parentLayer instanceof DvtMapAreaLayer;
    // Parse data objects
    var hiddenCategories = this._tmap.getOptions()['hiddenCategories'];

    var areas = dataLayerOptions['areas'];
    if (areas) {
      for (var j = 0; j < areas.length; j++) {
        if (hiddenCategories && dvt.ArrayUtils.hasAnyItem(hiddenCategories, areas[j]['categories'])) {
          // placeholder null object for automation
          dataLayer.addAreaObject(null);
          continue;
        }

        var areaId = areas[j]['location'];

        if (isolatedRowKey) {
          if (!dvt.Obj.compareValues(ctx, isolatedRowKey, areas[j]['id']))
            continue;
          else
            isolatedAreaId = areaId;
        }

        var dataObj = this._createArea(parentLayer, dataLayer, areas[j]);
        if (dataObj) {
          dataLayer.addAreaObject(dataObj);
        }
      }
    }

    var renderer = dataLayerOptions['renderer'];
    var markers = dataLayerOptions['markers'];
    if (markers) {
      if (!renderer)
        DvtThematicMapJsonParser._calcBubbleSizes(this._tmap, markers);

      for (var j = 0; j < markers.length; j++) {
        if (hiddenCategories && dvt.ArrayUtils.hasAnyItem(hiddenCategories, markers[j]['categories'])) {
          // placeholder null object for automation
          dataLayer.addMarkerObject(null);
          continue;
        }

        var areaId = markers[j]['location'];

        if (isolatedRowKey) {
          if (!dvt.Obj.compareValues(ctx, isolatedRowKey, markers[j]['id']))
            continue;
          else
            isolatedAreaId = areaId;
        }

        var dataObj;
        if (renderer) {
          var initState = {'hovered': false, 'selected': false, 'focused': false};
          var data = markers[j];
          var context = this._tmap.getOptions()['_contextHandler'](this._tmap.getElem(), null, data, data['_itemData'], initState, null);
          var svgElem = renderer(context);
          dataObj = this._createCustomDataItem(parentLayer, dataLayer, markers[j], svgElem, isAreaDataLayer);
        } else {
          dataObj = this._createMarker(parentLayer, dataLayer, markers[j], isAreaDataLayer);
        }

        if (dataObj) {
          dataLayer.addMarkerObject(dataObj);
        }
      }
    }

    var images = dataLayerOptions['images'];
    if (images) {
      for (var j = 0; j < images.length; j++) {
        var areaId = images[j]['location'];

        if (isolatedRowKey) {
          if (!dvt.Obj.compareValues(ctx, isolatedRowKey, images[j]['id']))
            continue;
          else
            isolatedAreaId = areaId;
        }

        var dataObj = this._createImage(parentLayer, dataLayer, images[j], isAreaDataLayer);
        if (dataObj) {
          dataLayer.addMarkerObject(dataObj);
        }
      }
    }

    var links = dataLayerOptions['links'];
    if (links) {
      for (var j = 0; j < links.length; j++) {
        if (hiddenCategories && dvt.ArrayUtils.hasAnyItem(hiddenCategories, links[j]['categories'])) {
          // placeholder null object for automation
          dataLayer.addAreaObject(null);
          continue;
        }

        var dataObj = this._createLink(dataLayer, links[j]);
        if (dataObj) {
          dataLayer.addLinkObject(dataObj);
        }

      }
    }

    // After processing all data objects we should have the area ID of the isolated area
    if (isolatedAreaId) {
      dataLayer.setIsolatedAreaRowKey(isolatedRowKey);
      parentLayer.setIsolatedArea(isolatedAreaId);
    }

    // Process initial data layer selections
    var initSelections = dataLayerOptions['selection'];
    if (initSelections && initSelections.length > 0)
      dataLayer.setInitialSelections(initSelections);

    if (topLayerName)
      parentLayer.updateDataLayer(dataLayer, this._tmap.getPanZoomCanvas().getContentPane().getMatrix(), topLayerName);
    else
      parentLayer.addDataLayer(dataLayer);
  }
};

/**
 * Parses a JSON object containing style defaults
 * @param {Object} styles The style default JSON object
 * @private
 */
DvtThematicMapJsonParser.prototype._parseStyles = function(styles) {
  this._tmap.parseComponentJson(styles);
  //If the areaStyle is a string convert it to object
  var areaStyle = styles['areaSvgStyle'] || styles['areaStyle'];
  if (areaStyle && !(areaStyle instanceof Object))
    areaStyle = dvt.CSSStyle.cssStringToObject(areaStyle);
  //Merge the areaStyle from public defaults with areaStyle from ThematicMap defaults
  areaStyle = dvt.JsonUtils.merge(areaStyle, styles['_areaStyle']);
  this._areaLayerStyle = DvtThematicMapJsonParser._getAreaCSSStyle(areaStyle);
  this._areaLayerStyleObject = areaStyle;
  this._areaLayerStyle.parseInlineStyle(styles['labelStyle']);
  this._areaDropSiteStyle = new dvt.CSSStyle(styles['dropTargetStyle']);
  this._tmap.setStyleDefaults(styles);
};

/**
 * Get the Area CSS Style from the area style object
 * @param {object} styleObj  style object from options
 * @return {dvt.CSSStyle} The dvt.CSSStyle object to be applied to Area
 * @private
 */
DvtThematicMapJsonParser._getAreaCSSStyle = function(styleObj) {
  var style = new dvt.CSSStyle();
  //Area CSS Style supports only border-color and background-color attributes
  dvt.ArrayUtils.forEach([dvt.CSSStyle.BORDER_COLOR, dvt.CSSStyle.BACKGROUND_COLOR], function(entry) {
    var value = null;
    //convert CSS string property to object attribute
    var attribute = dvt.CSSStyle.cssStringToObjectProperty(entry);
    if (styleObj && styleObj[attribute] != null) {
      value = styleObj[attribute];
      delete styleObj[attribute];
    }
    style.setStyle(entry, value);
  });
  return style;
};

/**
 * Creates a map of area displayables for an area layer
 * @param {Object} paths A map of area name to path commands
 * @return {Object}
 * @private
 */
DvtThematicMapJsonParser.prototype._createPathShapes = function(paths) {
  // create empty dvt.Path objects as placeholders
  var shapes = {};
  var context = this._tmap.getCtx();
  for (var area in paths) {
    var path = new dvt.Path(context);
    path.setCmds(paths[area]);

    // Style area layer border and background colors
    var borderColor = this._areaLayerStyle.getStyle(dvt.CSSStyle.BORDER_COLOR);
    if (borderColor && borderColor != 'transparent') {
      var stroke = new dvt.SolidStroke(borderColor);
      if (this._tmap.supportsVectorEffects())
        stroke.setFixedWidth(true);
      path.setStroke(stroke);
    }

    var backgroundColor = this._areaLayerStyle.getStyle(dvt.CSSStyle.BACKGROUND_COLOR);
    if (backgroundColor != 'transparent')
      path.setSolidFill(backgroundColor);
    else //TODO set on area layer instead
      path.setFill(null);

    if (this._areaLayerStyleObject)
      path.setStyle(this._areaLayerStyleObject);

    shapes[area] = path;
  }
  return shapes;
};

/**
 * Creates a logical object for a map data area item.
 * @param {DvtMapLayer} layer The map layer this data object belongs to
 * @param {DvtMapDataLayer} dataLayer The data layer this data object belongs to
 * @param {Object} data The JSON object containing data object attributes
 * @return {DvtMapAreaPeer} The logical object
 * @private
 */
DvtThematicMapJsonParser.prototype._createArea = function(layer, dataLayer, data) {
  var areaId = data['location'];
  var areaShape = layer.getAreaShape(areaId);
  // only render data area if we have the path info for it and if it has a data color
  if (areaShape) {
    // create an empty dvt.Path for now and will set the cmd at render time
    layer.setAreaRendered(areaId, false);
    var context = this._tmap.getCtx();
    var path = new DvtSelectablePath(context, this._tmap.supportsVectorEffects());

    data = dvt.JsonUtils.merge(data, this._tmap.getStyleDefaults()['dataAreaDefaults']);
    if (!data['labelStyle'])
      data['labelStyle'] = this._tmap.getStyleDefaults()['labelStyle'];

    var hs = new dvt.SolidStroke(data['hoverColor'], 1, DvtSelectablePath.HOVER_STROKE_WIDTH);
    var sis = new dvt.SolidStroke(data['selectedInnerColor'], 1, DvtSelectablePath.SELECTED_INNER_STROKE_WIDTH);
    var sos = new dvt.SolidStroke(data['selectedOuterColor'], 1, DvtSelectablePath.SELECTED_OUTER_STROKE_WIDTH);
    path.setHoverStroke(hs, null).setSelectedStroke(sis, sos);

    // disable labels in area layer if data layer exists and has label
    layer.setLabelRendered(data['location'], false);
    this._styleDisplayable(data, path);
    var label = this._createLabel(layer, dataLayer, data, path, true);
    var locationName = DvtThematicMapJsonParser._getLocationName(this._tmap.getMapName(), dataLayer, data);
    return new DvtMapAreaPeer(data, dataLayer, path, label, locationName);
  }
  return null;
};

/**
 * Creates a logical object for a map data marker item.
 * @param {DvtMapLayer} layer The map layer this data object belongs to
 * @param {DvtMapDataLayer} dataLayer The data layer this data object belongs to
 * @param {Object} data The JSON object containing data object attributes
 * @param {boolean} isParentAreaDataLayer True if the parent is an area data layer
 * @return {DvtMapObjPeer} The logical object
 * @private
 */
DvtThematicMapJsonParser.prototype._createMarker = function(layer, dataLayer, data, isParentAreaDataLayer) {
  var size = data['_size'];

  var center;
  // MapProvider coordinates are already projected, but need to flip the y coordinate for svg
  // because 0,0 is top left instead of bottom left
  if (this._mapProvider && !data['location'])
    center = new dvt.Point(data['x'], -data['y']);
  else
    center = DvtThematicMapJsonParser.getCenter(dataLayer, data['location'], data['x'], data['y']);

  // Skip over data where no marker center was determined or values resulted in a calculated size of 0 pixels
  if (!center || size === 0)
    return null;

  // merge data marker default styles, need to handle label style differently because we want to merge the two css strings
  var markerDefaults = this._tmap.getStyleDefaults()['dataMarkerDefaults'];
  var markerLabelStyle = markerDefaults['labelStyle'];
  markerLabelStyle.parseInlineStyle(data['labelStyle']);
  data = dvt.JsonUtils.merge(data, markerDefaults);
  data['labelStyle'] = markerLabelStyle;

  // Parse data object scales. Save original scale to maintain size despite zoom.
  var width;
  var height;
  if (size != null) {
    width = size;
    height = size;
  } else {
    var sx = data['scaleX'];
    if (sx == null)
      sx = 1;
    var sy = data['scaleY'];
    if (sy == null)
      sy = 1;

    var w = data['width'];
    if (w == null)
      w = this._tmap.getOptions()['styleDefaults']['dataMarkerDefaults']['width'];
    var h = data['height'];
    if (h == null)
      h = this._tmap.getOptions()['styleDefaults']['dataMarkerDefaults']['height'];

    width = w * sx;
    height = h * sy;
  }

  var br = data['borderRadius'];

  // id is used for custom marker definition lookup
  var marker;
  if (data['source']) {
    marker = new dvt.ImageMarker(this._tmap.getCtx(), center.x, center.y, width, height, br,
        data['source'], data['sourceSelected'], data['sourceHover'], data['sourceHoverSelected']);
  }
  else {
    var shapeType = data['shape'] ? data['shape'] : this._tmap.getOptions()['styleDefaults']['dataMarkerDefaults']['shape'];
    marker = new dvt.SimpleMarker(this._tmap.getCtx(), shapeType, this._tmap.getSkinName(), center.x, center.y, width, height, br);
  }
  var rotation = data['rotation'];
  if (rotation) {
    var radianRot = rotation * Math.PI / 180;
    marker.setRotation(radianRot);
  }
  // disable labels in area layer if data layer exists and has label
  if (isParentAreaDataLayer)
    layer.setLabelRendered(data['location'], false);

  this._styleDisplayable(data, marker);
  var label = this._createLabel(layer, dataLayer, data, marker, isParentAreaDataLayer);
  var locationName = DvtThematicMapJsonParser._getLocationName(this._tmap.getMapName(), dataLayer, data);
  return new DvtMapObjPeer(data, dataLayer, marker, label, center, locationName);
};

/**
 * Creates a logical object for a map data image item.
 * @param {DvtMapLayer} layer The map layer this data object belongs to
 * @param {DvtMapDataLayer} dataLayer The data layer this data object belongs to
 * @param {Object} data The JSON object containing data object attributes
 * @param {boolean} isParentAreaDataLayer True if the parent is an area data layer
 * @return {DvtMapObjPeer} The logical object
 * @private
 */
DvtThematicMapJsonParser.prototype._createImage = function(layer, dataLayer, data, isParentAreaDataLayer) {
  var center = DvtThematicMapJsonParser.getCenter(dataLayer, data['location'], data['x'], data['y']);
  if (!center) // no matching city
    return null;

  var image = new dvt.Image(this._tmap.getCtx(), data['url']);
  var width = data['width'];
  var height = data['height'];
  // set x/y only if both width and height are set, otherwise x/y will be set in the callback
  if (width != null && height != null) {
    image.setX(center.x - width / 2);
    image.setY(center.y - height / 2);
    image.setWidth(width);
    image.setHeight(height);
  }

  // disable labels in area layer if data layer exists and has label
  if (isParentAreaDataLayer)
    layer.setLabelRendered(data['location'], false);

  var locationName = DvtThematicMapJsonParser._getLocationName(this._tmap.getMapName(), dataLayer, data);
  var peer = new DvtMapObjPeer(data, dataLayer, image, null, center, locationName);
  if (!width || !height) {
    var callback = function(imageInfo) {
      if (imageInfo && imageInfo.width && imageInfo.height) {
        image.setWidth(imageInfo.width);
        image.setHeight(imageInfo.height);
        image.setX(center.x - imageInfo.width / 2);
        image.setY(center.y - imageInfo.height / 2);
        peer.__recenter();
      }
    };
    dvt.ImageLoader.loadImage(this._tmap.getCtx(), data['url'], callback);
  }
  return peer;
};

/**
 * Creates a logical object for a map data custom svg item.
 * @param {DvtMapLayer} layer The map layer this data object belongs to
 * @param {DvtMapDataLayer} dataLayer The data layer this data object belongs to
 * @param {Object} data The JSON object containing data object attributes
 * @param {SVGElement} svgElem The custom svg DOM element
 * @param {boolean} isParentAreaDataLayer True if the parent is an area data layer
 * @return {DvtMapObjPeer} The logical object
 * @private
 */
DvtThematicMapJsonParser.prototype._createCustomDataItem = function(layer, dataLayer, data, svgElem, isParentAreaDataLayer) {
  var center;
  // MapProvider coordinates are already projected, but need to flip the y coordinate for svg
  // because 0,0 is top left instead of bottom left
  if (this._mapProvider && !data['location'])
    center = new dvt.Point(data['x'], -data['y']);
  else
    center = DvtThematicMapJsonParser.getCenter(dataLayer, data['location'], data['x'], data['y']);

  if (!center) // no matching city
    return null;

  // disable labels in area layer if data layer exists and has label
  if (isParentAreaDataLayer)
    layer.setLabelRendered(data['location'], false);

  var dataItem = new DvtCustomDataItem(this._tmap.getCtx(), svgElem, this._tmap.getStyleDefaults()['dataAreaDefaults']);
  var locationName = DvtThematicMapJsonParser._getLocationName(this._tmap.getMapName(), dataLayer, data);
  return new DvtMapObjPeer(data, dataLayer, dataItem, null, center, locationName);
};

/**
 * Creates a logical object for a map data link item.
 * @param {DvtMapDataLayer} dataLayer The data layer this data object belongs to
 * @param {Object} data The JSON object containing data object attributes
 * @return {DvtMapObjPeer} The logical object
 * @private
 */
DvtThematicMapJsonParser.prototype._createLink = function(dataLayer, data) {
  var startLoc = data['startLocation'];
  var endLoc = data['endLocation'];
  var ctx = this._tmap.getCtx();

  var startPt;
  var startMarker;
  if (startLoc['id']) {
    // Get x/y from marker. Markers are created before links.
    var markers = dataLayer.getDataMarkerCollection();
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      // Account for filtered data items
      if (marker && dvt.Obj.compareValues(ctx, marker.getId(), startLoc['id'])) {
        startMarker = marker;
        startPt = marker.getCenter();
        break;
      }
    }
    // Check areas if no marker with id matches
    if (!startMarker) {
      var areas = dataLayer.getDataAreaCollection();
      for (var i = 0; i < areas.length; i++) {
        var area = areas[i];
        // Account for filtered data items
        if (area && dvt.Obj.compareValues(ctx, area.getId(), startLoc['id'])) {
          startMarker = area;
          startPt = this._getPtFromLocation(dataLayer, {'location': area.getLocation()});
          break;
        }
      }
    }
  } else {
    startPt = this._getPtFromLocation(dataLayer, startLoc);
  }

  var endPt;
  var endMarker;
  if (endLoc['id']) {
    // Get x/y from marker. Markers are created before links.
    var markers = dataLayer.getDataMarkerCollection();
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i];
      // Account for filtered data items
      if (marker && dvt.Obj.compareValues(ctx, marker.getId(), endLoc['id'])) {
        endMarker = marker;
        endPt = marker.getCenter();
        break;
      }
    }
    // Check areas if no marker with id matches
    if (!endMarker) {
      var areas = dataLayer.getDataAreaCollection();
      for (var i = 0; i < areas.length; i++) {
        var area = areas[i];
        // Account for filtered data items
        if (area && dvt.Obj.compareValues(ctx, area.getId(), endLoc['id'])) {
          endMarker = area;
          endPt = this._getPtFromLocation(dataLayer, {'location': area.getLocation()});
          break;
        }
      }
    }
  } else {
    endPt = this._getPtFromLocation(dataLayer, endLoc);
  }

  // Return null if both a start and end point are not determined
  if (!endPt || !startPt)
    return null;

  var curve = new dvt.Path(this._tmap.getCtx(), DvtThematicMapJsonParser.calcCurve(dataLayer, startPt, endPt, startPt, endPt));
  curve.setFill(null);

  var linkDefaults = this._tmap.getStyleDefaults()['linkDefaults'];
  var strokeColor = data['color'];
  if (!strokeColor)
    strokeColor = linkDefaults['color'];
  var strokeWidth = data['width'];
  if (!strokeWidth)
    strokeWidth = linkDefaults['width'];
  var stroke = new dvt.SolidStroke(strokeColor, 1, strokeWidth);

  stroke.setFixedWidth(true);
  curve.setStroke(stroke);

  var hoverColor = linkDefaults['_hoverColor'];
  var selectedColor = linkDefaults['_selectedColor'];

  var his = new dvt.SolidStroke(hoverColor, 1, strokeWidth);
  var hos = new dvt.SolidStroke(strokeColor, 1, strokeWidth + 2);
  var sis = new dvt.SolidStroke(strokeColor, 1, strokeWidth);
  var sos = new dvt.SolidStroke(selectedColor, 1, strokeWidth + 2);
  var shis = new dvt.SolidStroke(hoverColor, 1, strokeWidth);
  var shos = new dvt.SolidStroke(selectedColor, 1, strokeWidth + 2);
  curve.setHoverStroke(his, hos).setSelectedStroke(sis, sos).setSelectedHoverStroke(shis, shos);

  return new DvtMapLinkPeer(data, dataLayer, curve, startPt, endPt, startMarker, endMarker);
};


/**
 * Creates a dvt.Point from the link location object which can contain x/y coordinates,
 * a location name or marker id.
 * @param {DvtMapDataLayer} dataLayer The data layer the link belongs to
 * @param {Object} loc The link start or end location object
 * @return {dvt.Point} The point associated with the location object
 * @private
 */
DvtThematicMapJsonParser.prototype._getPtFromLocation = function(dataLayer, loc) {
  // Ensure mapProvider object is declared and not empty
  if (this._mapProvider) {
    return new dvt.Point(loc['x'], -loc['y']);
  } else {
    return DvtThematicMapJsonParser.getCenter(dataLayer, loc['location'], loc['x'], loc['y']);
  }
};

/**
 * Sets a label for a map data object
 * @param {DvtMapLayer} layer The map layer the data object belongs to
 * @param {DvtMapDataLayer} dataLayer The data layer the data object belongs to
 * @param {Object} data The JSON object containing label attributes
 * @param {dvt.Displayable} displayable The data object to set the label on
 * @param {boolean} isParentAreaDataLayer True if the parent is an area data layer
 * @return {dvt.Displayable} The label
 * @private
 */
DvtThematicMapJsonParser.prototype._createLabel = function(layer, dataLayer, data, displayable, isParentAreaDataLayer) {
  var areaId = data['location'];
  var labelText = data['label'];
  // if data label is provided, assume label display is on and if is from an area data layer, use area layer's label display
  var labelDisplay = labelText ? 'on' : 'off';
  if (isParentAreaDataLayer)
    labelDisplay = layer.getLabelDisplay();

  var isArea = displayable instanceof dvt.Path;
  // If object is in an areaDataLayer see if label is provided, if not, use the default area label
  if (!labelText && isParentAreaDataLayer && ((isArea && labelDisplay != 'off') ||
                                              (!isArea && labelDisplay == 'on'))) {
    labelText = (layer.getLabelType() == 'long' ? layer.getLongAreaName(areaId) : layer.getShortAreaName(areaId));
  }

  // Labels
  if (labelText) {
    var context = this._tmap.getCtx();
    var label;
    if (isArea)
      label = new DvtMapLabel(context, labelText, layer.getLabelInfoForArea ? layer.getLabelInfoForArea(areaId) : null,
                              labelDisplay, dataLayer.getDataLabelContainer(), this._tmap.supportsVectorEffects());
    else
      label = new dvt.OutputText(context, labelText, 0, 0);

    // Label styling
    var labelStyle = isArea ? layer.getLayerCSSStyle() : new dvt.CSSStyle();
    // add label style by merging styles sent from skin and tag
    if (data['labelStyle']) {
      labelStyle.merge(data['labelStyle']);
    }
    var fillColor = labelStyle.getStyle(dvt.CSSStyle.COLOR);
    labelStyle.setStyle(dvt.CSSStyle.COLOR, null);
    label.setCSSStyle(labelStyle);
    // color label to contrast with data color if none provided or in high contrast mode
    if (data['color'] && (label instanceof DvtMapLabel && (dvt.Agent.isHighContrast() || !fillColor))) {
      fillColor = dvt.ColorUtils.getContrastingTextColor(data['color']);
    }
    if (fillColor)
      label.setSolidFill(fillColor);
  }

  return label;
};

/**
 * Styles a map data object's displayable
 * @param {Object} style The css style object to style the displayable with
 * @param {dvt.Displayable} displayable The displayable to style
 * @private
 */
DvtThematicMapJsonParser.prototype._styleDisplayable = function(style, displayable) {
  var backgroundColor = style['color'];
  var gradient = (dvt.Agent.isTouchDevice() || this._tmap.getSkinName() == dvt.CSSStyle.SKIN_ALTA) ? 'none' : style['visualEffects'];

  // handle custom svg where color is set by user
  if (displayable instanceof dvt.SimpleMarker) {
    if (style['borderStyle'] != 'none') {
      var borderWidth = style['borderWidth'];
      if (typeof borderWidth == 'string') {
        if (borderWidth.slice(-2) == 'px')
          borderWidth = parseFloat(style['borderWidth'].slice(0, -2));
        else
          borderWidth = parseFloat(style['borderWidth']);
      }
      var stroke = new dvt.SolidStroke(style['borderColor'], 1, borderWidth);
      if (!this._tmap.isMarkerZoomBehaviorFixed())
        stroke.setFixedWidth(true);
      stroke.setType(dvt.Stroke.convertTypeString(style['borderStyle']));
      displayable.setStroke(stroke);
    }

    var opacity = style['opacity'];
    if (gradient != 'none')
      displayable.setFill(new dvt.MarkerGradient.createMarkerGradient(backgroundColor, displayable, opacity));
    else if (backgroundColor)
      displayable.setSolidFill(backgroundColor, opacity);
  }
  else if (displayable instanceof dvt.Path) {
    var borderColor = style['borderColor'];
    if (borderColor) {
      var stroke = new dvt.SolidStroke(borderColor);
      if (this._tmap.supportsVectorEffects())
        stroke.setFixedWidth(true);
      displayable.setStroke(stroke);
    }

    displayable.setSolidFill(backgroundColor, opacity);
  }
};


/**
 * Retrieves the center coordinates for this data object if they exist
 * @param {DvtMapDataLayer} dataLayer The map data layer to look up coordinate data from
 * @param {string=} location The named city or area
 * @param {number=} x The x coordinate
 * @param {number=} y The y coordinate
 * @return {dvt.Point}
 */
DvtThematicMapJsonParser.getCenter = function(dataLayer, location, x, y) {
  // We can get the coordiantes for a marker if they are:
  // 1) Passed in the xml
  // 2) A supported city
  // 3) A supported Area
  var map = dataLayer.getMap();
  var mapName = map.getMapName();
  var layer = dataLayer.getMapLayer();
  var layerName = layer.getLayerName();
  if (location) {
    var cityCoords = DvtBaseMapManager.getCityCoordinates(mapName, location);
    if (cityCoords) {
      return cityCoords;
    }
    var areaCenter = DvtBaseMapManager.getAreaCenter(mapName, layerName, location);
    if (areaCenter) {
      return areaCenter;
    } else {
      // manually calculate the area path center
      var dim;
      // TODO: PathUtils.getDimensions is slightly faster than DOM getDimensions, but
      // there's a bug in the method where the complicated paths found for areas aren't
      // returning the correct bounds
      if (!mapName && layer.getAreaShape) {
        var mapArea = layer.getAreaShape(location);
        if (!mapArea)
          return null;
        dim = dvt.DisplayableUtils.getDimensionsForced(map.getCtx(), mapArea);
      } else {
        var path = DvtBaseMapManager.getPathForArea(mapName, layerName, location);
        if (!path)
          return null;
        var arPath = dvt.PathUtils.createPathArray(path);
        dim = dvt.PathUtils.getDimensions(arPath);
      }
      return dim.getCenter();
    }
  } else {
    return DvtThematicMapProjections.project(x, y, mapName);
  }
};

/**
 * Calculates the bubble sizes for the thematic map.
 * @param {dvt.ThematicMap} tmap The owning component
 * @param {Array} markers The array of markers to caclulate sizes for
 * @private
 */
DvtThematicMapJsonParser._calcBubbleSizes = function(tmap, markers) {
  // Run thru markers and calc min/max values, skipping markers that don't have value option
  var maxValue = -Infinity;
  var minValue = Infinity;
  var valKey = 'value';
  for (var i = 0; i < markers.length; i++) {
    var value = markers[i][valKey];
    // Negative and zero marker values don't correlate to a marker radius size so we skip them when determining range
    if (value == null || value <= 0)
      continue;
    maxValue = Math.max(maxValue, value);
    minValue = Math.min(minValue, value);
  }

  // No marker values provided value option, skip marker sizing calculation
  if (minValue === Infinity)
    return;

  // Min/max allowed marker sizes
  var zoomMargins = 2 * DvtThematicMapJsonParser._PZC_PADDING;
  var mapWidth = tmap.getWidth() - zoomMargins;
  var mapHeight = tmap.getHeight() - zoomMargins;
  // Adjust maxSize by limiting basemap aspect ratio so that 1.3 < w/h < 1.7. Temporary heuristical approach
  // to fixing map aspct ratio issue which we can't determine until render time.
  var ratio = mapWidth / mapHeight;
  if (ratio < 1.3)
    mapHeight = mapWidth * 2 / 3;
  else if (ratio > 1.7)
    mapWidth = mapHeight * 1.5;
  var maxSize = DvtThematicMapJsonParser._MAX_MARKER_SIZE_RATIO * Math.min(mapWidth, mapHeight);

  // Loop through the data and update the sizes
  for (var i = 0; i < markers.length; i++) {
    var value = markers[i][valKey];
    // Treat markers with missing values the same as we treat negative/zero valued markers and set size to 0 so we skip rendering them
    markers[i]['_size'] = (value == null || value <= 0) ? 0 : dvt.LayoutUtils.getBubbleSize(value, minValue, maxValue, DvtThematicMapJsonParser._MIN_MARKER_SIZE, maxSize);
  }
};

/**
 * Calculates the curve for a link
 * @param {DvtMapDataLayer} dataLayer The data layer this link belongs to
 * @param {dvt.Point} origStartPt The original start point of the link
 * @param {dvt.Point} origEndPt The original end point of the link
 * @param {dvt.Point} startPt The current start point of the link
 * @param {dvt.Point} endPt The current end point of the link
 * @return {string}
 */
DvtThematicMapJsonParser.calcCurve = function(dataLayer, origStartPt, origEndPt, startPt, endPt) {
  var x1 = startPt.x;
  var y1 = startPt.y;
  var x2 = endPt.x;
  var y2 = endPt.y;
  var tmap = dataLayer.getMap();
  var curve = dvt.PathUtils.moveTo(x1, y1);
  var numLinks = dataLayer.trackLink(origStartPt, origEndPt);
  // Heuristic to find a fixed arc increment for overlapping links based on map size
  var arcIncr = Math.min(tmap.getWidth(), tmap.getHeight()) / 35;

  // Check for straight lines
  if ((x2 - x1) === 0 || (y2 - y1) === 0) {
    var controlX1, controlY1, controlX2, controlY2;
    if (numLinks > 1) {
      arcIncr *= (numLinks - 1);
      // Vertical
      if ((x2 - x1) === 0) {
        var dist = Math.abs(y1 - y2) * 0.3;
        // Calculate the 1st control point
        controlX1 = x1 + arcIncr;
        controlY1 = (y1 > y2) ? y1 - dist : y1 + dist;
        // Calculate the 2nd control point
        controlX2 = controlX1;
        controlY2 = (y2 > y1) ? y2 - dist : y2 + dist;
      } else {
        // Horizontal, render overlap curve above
        var dist = Math.abs(x1 - x2) * 0.3;
        // Calculate the 1st control point
        controlX1 = (x1 > x2) ? x1 - dist : x1 + dist;
        controlY1 = y1 - arcIncr;
        // Calculate the 2nd control point
        controlX2 = (x2 > x1) ? x2 - dist : x2 + dist;
        controlY2 = controlY1;
      }
      curve += dvt.PathUtils.cubicTo(controlX1, controlY1, controlX2, controlY2, x2, y2);
    } else {
      curve += dvt.PathUtils.lineTo(x2, y2);
    }
  } else {
    var dist = Math.sqrt(Math.pow(x2 - x1, 2), Math.pow(y2 - y1, 2));
    // Start arc height at 1/4 of height of circle btwn the start/end points if no other links
    // at the same points. Otherwise, raise height of arc slightly for each additional overlap
    var arcHeight = dist / 4;
    if (numLinks > 1) {
      arcHeight += ((numLinks - 1) * arcIncr);
    }

    // Calculate the slope of the line perpendicular to the line thru the start/end points
    var slope = (y2 - y1) / (x2 - x1);
    var perpSlope = -1 / slope;
    // Force arc to always point up
    if (perpSlope > 0)
      arcHeight *= -1;

    // d / sqrt(1 + m^2)
    var distVal = dist * 0.3 / Math.sqrt(1 + Math.pow(slope, 2));
    var isX2AfterX1 = (x2 - x1) > 0;
    // Find point on original line to calculate 1st control point that is approx 30% of the way from the start point
    var xc1 = x1 + (isX2AfterX1 ? 1 : -1) * distVal;
    var yc1 = slope * (xc1 - x1) + y1;
    // Find point on original line to calculate 2nd control point that is approx 30% of the way from the end point
    var xc2 = x2 + (isX2AfterX1 ? -1 : 1) * distVal;
    var yc2 = slope * (xc2 - x2) + y2;

    // d / sqrt(1 + m^2)
    var controlDistVal = arcHeight / Math.sqrt(1 + Math.pow(perpSlope, 2));
    // Calculate the 1st control point
    var controlX1 = xc1 + controlDistVal;
    var controlY1 = perpSlope * (controlX1 - xc1) + yc1;
    // Calculate the 2nd control point
    var controlX2 = xc2 + controlDistVal;
    var controlY2 = perpSlope * (controlX2 - xc2) + yc2;

    curve += dvt.PathUtils.cubicTo(controlX1, controlY1, controlX2, controlY2, x2, y2);
  }
  return curve;
};

/**
 * Adds the locationName to a data item
 * @param {string} basemap
 * @param {DvtMapDataLayer} dataLayer
 * @param {object} data
 * @return {string}
 * @private
 */
DvtThematicMapJsonParser._getLocationName = function(basemap, dataLayer, data) {
  var location = data['location'];
  if (location) {
    var mapLayer = dataLayer.getMapLayer();
    // For data objects associated with supported areas or cities we prepend the area/city name before the datatip
    if (!(mapLayer instanceof DvtMapAreaLayer))
      return DvtBaseMapManager.getCityLabel(basemap, location);
    else
      return mapLayer.getLongAreaName(location);
  }
  return null;
};

/**
 * Utility class for built-in map projections
 * @constructor
 */
var DvtThematicMapProjections = {};

dvt.Obj.createSubclass(DvtThematicMapProjections, dvt.Obj);
/**  @const  @private */
DvtThematicMapProjections._VIEWPORT_BOUNDS = new dvt.Rectangle(0, 0, 800, 500);
/**  @const  @private */
DvtThematicMapProjections._RADIUS = 6378206.4;
/**  @const  @private */
DvtThematicMapProjections._NEW_ZEALAND_RECT = new dvt.Rectangle(500, 200, 200, 200);
/**  @const  @private */
DvtThematicMapProjections._NEW_ZEALAND_BOUNDS = new dvt.Rectangle(163, - 49, 17, 17);
/**  @const  @private */
DvtThematicMapProjections._AFRICA_BOUNDS = new dvt.Rectangle(- 17.379205428479874, - 37.201510854305546, 68.66391442808313, 77.50071544582713);
/**  @const  @private */
DvtThematicMapProjections._ASIA_BOUNDS = new dvt.Rectangle(- 0.8436866097568272, - 0.7626456732012923, 1.8336308036296942, 1.5748427214611724);
/**  @const  @private */
DvtThematicMapProjections._AUSTRALIA_BOUNDS = new dvt.Rectangle(113.29667079927977, - 52.89550592498755, 65.25257389065216, 42.123114617504626);
/**  @const  @private */
DvtThematicMapProjections._EUROPE_BOUNDS = new dvt.Rectangle(- 0.47944476148667076, - 0.0014669405958800579, 0.7364925893845453, 0.6293972741802124);
/**  @const  @private */
DvtThematicMapProjections._N_AMERICA_BOUNDS = new dvt.Rectangle(- 0.6154469465354344, - 0.24589767758847714, 1.2448236795108683, 1.2631535127174947);
/**  @const  @private */
DvtThematicMapProjections._S_AMERICA_BOUNDS = new dvt.Rectangle(- 80.60817722658722, - 60.796273249672765, 46.608687602908056, 66.96595767361796);
/**  @const  @private */
DvtThematicMapProjections._APAC_BOUNDS = new dvt.Rectangle(68.20516856593524, - 52.89892708045518, 111.65739821771903, 116.55460214469134);
/**  @const  @private */
DvtThematicMapProjections._EMEA_BOUNDS = new dvt.Rectangle(- 24.543831069368586, - 37.202500659225905, 204.54283106936856, 164.9634493690208);
/**  @const  @private */
DvtThematicMapProjections._L_AMERICA_BOUNDS = new dvt.Rectangle(- 117.12451221229134, - 54.95921623126266, 82.33223251442891, 87.67786623127876);
/**  @const  @private */
DvtThematicMapProjections._USA_CANADA_BOUNDS = new dvt.Rectangle(- 0.6154656300926513, 0.0507209798775865, 1.0153104799231851, 0.966537441082997);
/**  @const  @private */
DvtThematicMapProjections._WORLD_BOUNDS = new dvt.Rectangle(- 171.9, - 62.6, 349.8, 150.8);
/**  @const  @private */
DvtThematicMapProjections._ALASKA1_RECT = new dvt.Rectangle(172, 51, 8, 3);
/**  @const  @private */
DvtThematicMapProjections._ALASKA2_RECT = new dvt.Rectangle(- 180, 51, 51, 21);
/**  @const  @private */
DvtThematicMapProjections._HAWAII_RECT = new dvt.Rectangle(- 178.5, 18.9, 35, 11);
/**  @const  @private */
DvtThematicMapProjections._USA_RECT = new dvt.Rectangle(- 124.8, 24.4, 58, 25.5);
/**  @const  @private */
DvtThematicMapProjections._ALASKA_BOUNDS = new dvt.Rectangle(- 187.5517578125, 59.82610321044922, 57.562225341796875, 43.83738708496094);
/**  @const  @private */
DvtThematicMapProjections._HAWAII_BOUNDS = new dvt.Rectangle(- 160.23606872558594, 18.91549301147461, 5.4374847412109375, 3.3189010620117188);
/**  @const  @private */
DvtThematicMapProjections._USA_BOUNDS = new dvt.Rectangle(- 2386803.25, - 1183550.5, 4514111, 2908402);
/**  @const  @private */
DvtThematicMapProjections._HAWAII_WINDOW = new dvt.Rectangle(165.0, 400.0, 100.0, 100.0);
/**  @const  @private */
DvtThematicMapProjections._ALASKA_WINDOW = new dvt.Rectangle(-75.0, 350.0, 240.0, 150.0);
/**  @const  @private */
DvtThematicMapProjections._ROBINSON_COORDINATES = [[1, 0], [0.9986, 0.0314], [0.9954, 0.0629], [0.9900, 0.0943], [0.9822, 0.1258], [0.9730, 0.1572], [0.9600, 0.1887], [0.9427, 0.2201], [0.9216, 0.2515], [0.8962, 0.2826], [0.8679, 0.3132], [0.8350, 0.3433], [0.7986, 0.3726], [0.7597, 0.4008], [0.6732, 0.4532], [0.6213, 0.4765], [0.5722, 0.4951], [0.5322, 0.5072]];


/**
 * Gets the projection for built-in basemaps to be used for JET/AMX
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @param {String} basemap The basemap name
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps, or null if the point is outside of the basemap bounds.
 */
DvtThematicMapProjections.project = function(x, y, basemap) {
  var point;
  switch (basemap) {
    case 'africa':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._AFRICA_BOUNDS,
                                                             DvtThematicMapProjections._getMercatorProjection(x, y));
      break;
    case 'asia':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._ASIA_BOUNDS,
                                                             DvtThematicMapProjections._getAlbersEqualAreaConicProjection(40, 95, 20, 60, x, y),
                                                             DvtThematicMapProjections.toRadians(5));
      break;
    case 'australia':
      point = DvtThematicMapProjections._getAustraliaProjection(x, y);
      break;
    case 'europe':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._EUROPE_BOUNDS,
                                                             DvtThematicMapProjections._getAlbersEqualAreaConicProjection(35, 25, 40, 65, x, y),
                                                             DvtThematicMapProjections.toRadians(10));
      break;
    case 'northAmerica':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._N_AMERICA_BOUNDS,
                                                             DvtThematicMapProjections._getAlbersEqualAreaConicProjection(23, - 96, 20, 60, x, y));
      break;
    case 'southAmerica':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._S_AMERICA_BOUNDS,
                                                             new dvt.Point(x, y),
                                                             DvtThematicMapProjections.toRadians(5));
      break;
    case 'apac':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._APAC_BOUNDS,
                                                             DvtThematicMapProjections._getMercatorProjection(x, y));
      break;
    case 'emea':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._EMEA_BOUNDS,
                                                             DvtThematicMapProjections._getMercatorProjection(x, y));
      break;
    case 'latinAmerica':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._L_AMERICA_BOUNDS,
          new dvt.Point(x, y));
      break;
    case 'usaAndCanada':
      point = DvtThematicMapProjections._getAffineProjection(DvtThematicMapProjections._USA_CANADA_BOUNDS,
                                                             DvtThematicMapProjections._getAlbersEqualAreaConicProjection(23, - 96, 20, 60, x, y));
      break;
    case 'worldRegions':
      point = DvtThematicMapProjections._getWorldProjection(x, y);
      break;
    case 'usa':
      point = DvtThematicMapProjections._getUSAProjection(x, y);
      break;
    case 'world':
      point = DvtThematicMapProjections._getWorldProjection(x, y);
      break;
    default :
      break;
  }
  if (point)
    return new dvt.Point(point.x * 10, point.y * 10);// multiply by 10 because basemaps are 10x bigger
  else
    return null;
};

/**
 * Returns the projected long/lat point in the usa basemap coordinate system
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps, or null if the point is outside of the basemap bounds.
 * @private
 */
DvtThematicMapProjections._getUSAProjection = function(x, y) {
  var viewPortTransform;
  var transformedPoint;
  if (DvtThematicMapProjections._ALASKA1_RECT.containsPoint(x, y) || DvtThematicMapProjections._ALASKA2_RECT.containsPoint(x, y)) {
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._ALASKA_BOUNDS, DvtThematicMapProjections._ALASKA_WINDOW);
    transformedPoint = DvtThematicMapProjections._applyAffineTransform(viewPortTransform, DvtThematicMapProjections._getMercatorProjection(x, y));
  }
  else if (DvtThematicMapProjections._HAWAII_RECT.containsPoint(x, y)) {
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._HAWAII_BOUNDS, DvtThematicMapProjections._HAWAII_WINDOW);
    transformedPoint = DvtThematicMapProjections._applyAffineTransform(viewPortTransform, new dvt.Point(x, y));
  }
  else if (DvtThematicMapProjections._USA_RECT.containsPoint(x, y)) {
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._USA_BOUNDS, DvtThematicMapProjections._VIEWPORT_BOUNDS);
    transformedPoint = DvtThematicMapProjections._applyAffineTransform(viewPortTransform, DvtThematicMapProjections._getOrthographicProjection(new dvt.Point(- 95, 36), x, y));
  }

  return DvtThematicMapProjections._getBoundedTransformedPoint(DvtThematicMapProjections._VIEWPORT_BOUNDS, transformedPoint);
};

/**
 * Returns the projected long/lat point in the world basemap coordinate system
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps, or null if the point is outside of the basemap bounds.
 * @private
 */
DvtThematicMapProjections._getWorldProjection = function(x, y) {
  var viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._WORLD_BOUNDS, DvtThematicMapProjections._VIEWPORT_BOUNDS);

  var transformedPoint = DvtThematicMapProjections._applyAffineTransform(viewPortTransform, DvtThematicMapProjections._getRobinsonProjection(x, y));
  return DvtThematicMapProjections._getBoundedTransformedPoint(DvtThematicMapProjections._VIEWPORT_BOUNDS, transformedPoint);
};

/**
 * Returns the projected long/lat point in the australia basemap coordinate system
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps, or null if the point is outside of the basemap bounds.
 * @private
 */
DvtThematicMapProjections._getAustraliaProjection = function(x, y) {
  var viewPortTransform;
  if (DvtThematicMapProjections._NEW_ZEALAND_BOUNDS.containsPoint(x, y))
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._NEW_ZEALAND_BOUNDS, DvtThematicMapProjections._NEW_ZEALAND_RECT);
  else
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._AUSTRALIA_BOUNDS, DvtThematicMapProjections._VIEWPORT_BOUNDS);

  var transformedPoint = DvtThematicMapProjections._applyAffineTransform(viewPortTransform, DvtThematicMapProjections._getMercatorProjection(x, y));
  return DvtThematicMapProjections._getBoundedTransformedPoint(DvtThematicMapProjections._VIEWPORT_BOUNDS, transformedPoint);
};

/**
 * Applies an affine transform to a point
 * @param {dvt.Rectangle} mapBounds The map bounds
 * @param {dvt.Point} point The point to apply the transform to
 * @param {number} rotRadians The rotation to apply to the transform matrix in radians
 * @return {dvt.Point}
 * @private
 */
DvtThematicMapProjections._getAffineProjection = function(mapBounds, point, rotRadians) {
  var viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(mapBounds, DvtThematicMapProjections._VIEWPORT_BOUNDS);
  if (rotRadians) {
    var rotMatrix = new dvt.Matrix();
    rotMatrix.rotate(rotRadians);
    viewPortTransform = DvtThematicMapProjections._concatAffineTransforms(viewPortTransform, rotMatrix);
  }
  var transformedPoint = viewPortTransform.transformPoint(point);
  return DvtThematicMapProjections._getBoundedTransformedPoint(DvtThematicMapProjections._VIEWPORT_BOUNDS, transformedPoint);
};

/**
 * Returns the given point if it is contained within the given bounds, or null if it is outside of the bounds
 * @param {dvt.Rectangle} bounds The map bounds
 * @param {dvt.Point} point The point
 * @return {dvt.Point} The original point or null if it is outside of the projection bounds
 * @private
 */
DvtThematicMapProjections._getBoundedTransformedPoint = function(bounds, point) {
  if (!point || !(bounds.containsPoint(point.x, point.y)))
    return null;

  return point;
};

/**
 * Returns the projected long/lat point using the albers equal area conic projection
 * @param {number} latOfOrigin latitude for the origin, in degrees
 * @param {number} lonOfOrigin longitude for the origin, in degrees
 * @param {number} sP1 standard parallel 1, in degrees
 * @param {number} sP2 standard parallel 2, in degrees
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps or the original point
 * @private
 */
DvtThematicMapProjections._getAlbersEqualAreaConicProjection = function(latOfOrigin, lonOfOrigin, sP1, sP2, x, y) {
  var lambda0 = DvtThematicMapProjections.toRadians(lonOfOrigin);
  var phi0 = DvtThematicMapProjections.toRadians(latOfOrigin);
  sP1 = DvtThematicMapProjections.toRadians(sP1);
  sP2 = DvtThematicMapProjections.toRadians(sP2);

  var n = 0.5 * (Math.sin(sP1) + Math.sin(sP2));
  var c = Math.pow((Math.cos(sP1)), 2) + (2 * n * Math.sin(sP1));

  var rho0 = c - (2 * n * Math.sin(phi0));
  rho0 = Math.sqrt(rho0) / n;

  var lambda = DvtThematicMapProjections.toRadians(x);
  var phi = DvtThematicMapProjections.toRadians(y);

  var theta = n * (lambda - lambda0);

  var rho = c - (2 * n * Math.sin(phi));
  rho = Math.sqrt(rho) / n;

  var pX = rho * Math.sin(theta);
  var pY = rho0 - (rho * Math.cos(theta));

  return new dvt.Point(pX, pY);
};

/**
 * Returns the projected long/lat point using the mercator projection assuming center is at 0,0
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps or the original point
 * @private
 */
DvtThematicMapProjections._getMercatorProjection = function(x, y) {
  var pY = Math.log(Math.tan(0.25 * Math.PI + 0.5 * DvtThematicMapProjections.toRadians(y)));
  return new dvt.Point(x, DvtThematicMapProjections.toDegrees(pY));
};

/**
 * Returns the projected long/lat point using the orthographic projection
 * @param {dvt.Point} center The center of the basemap
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps or the original point
 * @private
 */
DvtThematicMapProjections._getOrthographicProjection = function(center, x, y) {
  var radX = DvtThematicMapProjections.toRadians(x);
  var radY = DvtThematicMapProjections.toRadians(y);
  var centerX = DvtThematicMapProjections.toRadians(center.x);
  var centerY = DvtThematicMapProjections.toRadians(center.y);
  var px = Math.cos(radY) * Math.sin(radX - centerX);
  var py = Math.cos(centerY) * Math.sin(radY) - Math.sin(centerY) * Math.cos(radY) * Math.cos(radX - centerX);
  return new dvt.Point(px * DvtThematicMapProjections._RADIUS, py * DvtThematicMapProjections._RADIUS);
};

/**
 * Returns the projected long/lat point using the robinson projection assuming center is at 0,0
 * @param {number} x Longitude
 * @param {number} y Latitude
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps or the original point
 * @private
 */
DvtThematicMapProjections._getRobinsonProjection = function(x, y) {
  var ycriteria = Math.floor(Math.abs(y) / 5);
  if (ycriteria >= DvtThematicMapProjections._ROBINSON_COORDINATES.length - 1)
    ycriteria = DvtThematicMapProjections._ROBINSON_COORDINATES.length - 2;

  var yInterval = (Math.abs(y) - ycriteria * 5) / 5;

  var xLength = DvtThematicMapProjections._ROBINSON_COORDINATES[ycriteria + 1][0] - DvtThematicMapProjections._ROBINSON_COORDINATES[ycriteria][0];
  var yLength = DvtThematicMapProjections._ROBINSON_COORDINATES[ycriteria + 1][1] - DvtThematicMapProjections._ROBINSON_COORDINATES[ycriteria][1];

  var newX = x * (DvtThematicMapProjections._ROBINSON_COORDINATES[ycriteria][0] + yInterval * xLength);
  var newY = (DvtThematicMapProjections._ROBINSON_COORDINATES[ycriteria][1] + yInterval * yLength);

  if (y < 0)
    newY = - 1 * newY;

  return new dvt.Point(newX, newY * 180);
};

/**
 * Applies an affine transformation to a dvt.Point
 * @param {dvt.Matrix} matrix The affine transformation matrix
 * @param {dvt.Point} point The point to apply the transform to
 * @return {dvt.Point} The transformed point
 * @private
 */
DvtThematicMapProjections._applyAffineTransform = function(matrix, point) {
  return new dvt.Point(point.x * matrix.getA() + matrix.getTx(), point.y * matrix.getD() + matrix.getTy());
};

/**
 * Returns the projected long/lat point using the robinson projection assuming center is at 0,0
 * @param {dvt.Matrix} transform1 The first transform
 * @param {dvt.Matrix} transform2 The second transform
 * @return {dvt.Point} The projected point in the basemap coordinate system for built-in basemaps or the original point
 * @private
 */
DvtThematicMapProjections._concatAffineTransforms = function(transform1, transform2) {
  var t1A = transform1.getA();
  var a = transform2.getA() * t1A;
  var b = transform2.getB() * t1A;
  var tx = transform1.getTx() + transform2.getTx() * t1A;

  var t1D = transform1.getD();
  var c = transform2.getC() * t1D;
  var d = transform2.getD() * t1D;
  var ty = transform1.getTy() + transform2.getTy() * t1D;

  return new dvt.Matrix(a, b, c, d, tx, ty);
};

/**
 * Gets the viewport transformation matrix
 * @param {dvt.Rectangle} mapBound The map bounds
 * @param {dvt.Rectangle} deviceView The viewport bounds
 * @return {dvt.Matrix} The viewport transform matrix
 * @private
 */
DvtThematicMapProjections._getViewPortTransformation = function(mapBound, deviceView) {
  var i = deviceView.x;
  var j = deviceView.y;

  var d = mapBound.w;
  var d1 = mapBound.h;
  var d2 = 0;
  var d3 = deviceView.w / d;
  var d4 = deviceView.h / d1;
  d2 = (d3 <= d4) ? d3 : d4;
  var d5 = i - mapBound.x * d2;
  var d6 = j + mapBound.y * d2;
  d5 += (deviceView.w - d * d2) / 2;
  d6 += deviceView.h - (deviceView.h - d1 * d2) / 2;

  return new dvt.Matrix(d2, 0, 0, - d2, d5, d6);
};

/**
 * Converts a number to radians
 * @param {number} x The number to convert to radians
 * @return {number} The number converted to radians
 */
DvtThematicMapProjections.toRadians = function(x) {
  return x * (Math.PI / 180);
};

/**
 * Converts a number to degrees
 * @param {number} x The number to convert to degrees
 * @return {number} The number converted to degrees
 */
DvtThematicMapProjections.toDegrees = function(x) {
  return x * (180 / Math.PI);
};

/**
 * Gets the inverse projection for built-in basemaps to be used for drag and drop
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @param {String} basemap The basemap name
 * @return {dvt.Point} The inversely projected point in longitude/latitude for built-in basemaps or the original point
 */
DvtThematicMapProjections.inverseProject = function(x, y, basemap) {
  var point;
  // divide by 10 because basemaps are 10x larger than original projected maps
  x /= 10;
  y /= 10;
  switch (basemap) {
    case 'africa':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._AFRICA_BOUNDS,
                                                                    new dvt.Point(x, y));
      point = DvtThematicMapProjections._getInverseMercatorProjection(point.x, point.y);
      break;
    case 'asia':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._ASIA_BOUNDS,
                                                                    new dvt.Point(x, y),
                                                                    DvtThematicMapProjections.toRadians(5));
      point = DvtThematicMapProjections._getInverseAlbersEqualAreaConicProjection(40, 95, 20, 60, point.x, point.y);
      break;
    case 'australia':
      point = DvtThematicMapProjections._getInverseAustraliaProjection(x, y);
      break;
    case 'europe':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._EUROPE_BOUNDS,
                                                                    new dvt.Point(x, y),
                                                                    DvtThematicMapProjections.toRadians(10));
      point = DvtThematicMapProjections._getInverseAlbersEqualAreaConicProjection(35, 25, 40, 65, point.x, point.y);
      break;
    case 'northAmerica':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._N_AMERICA_BOUNDS,
                                                                    new dvt.Point(x, y));
      point = DvtThematicMapProjections._getInverseAlbersEqualAreaConicProjection(23, - 96, 20, 60, point.x, point.y);
      break;
    case 'southAmerica':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._S_AMERICA_BOUNDS,
                                                                    new dvt.Point(x, y),
                                                                    DvtThematicMapProjections.toRadians(5));
      break;
    case 'apac':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._APAC_BOUNDS,
                                                                    new dvt.Point(x, y));
      point = DvtThematicMapProjections._getInverseMercatorProjection(point.x, point.y);
      break;
    case 'emea':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._EMEA_BOUNDS,
                                                                    new dvt.Point(x, y));
      point = DvtThematicMapProjections._getInverseMercatorProjection(point.x, point.y);
      break;
    case 'latinAmerica':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._L_AMERICA_BOUNDS,
                                                                    new dvt.Point(x, y));
      break;
    case 'usaAndCanada':
      point = DvtThematicMapProjections._getInverseAffineProjection(DvtThematicMapProjections._USA_CANADA_BOUNDS,
                                                                    new dvt.Point(x, y));
      point = DvtThematicMapProjections._getInverseAlbersEqualAreaConicProjection(23, - 96, 20, 60, point.x, point.y);
      break;
    case 'worldRegions':
      point = DvtThematicMapProjections._getInverseWorldProjection(x, y);
      break;
    case 'usa':
      point = DvtThematicMapProjections._getInverseUSAProjection(x, y);
      break;
    case 'world':
      point = DvtThematicMapProjections._getInverseWorldProjection(x, y);
      break;
    default :
      break;
  }
  if (point)
    return point;
  else
    return new dvt.Point(x, y);
};

/**
 * Returns the inversely projected long/lat point in the usa basemap coordinate system
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @return {dvt.Point} The projected point in longitude/latitude using the basemap projection
 * @private
 */
DvtThematicMapProjections._getInverseUSAProjection = function(x, y) {
  var viewPortTransform;
  if (DvtThematicMapProjections._ALASKA_WINDOW.containsPoint(x, y)) {
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._ALASKA_BOUNDS, DvtThematicMapProjections._ALASKA_WINDOW);
    viewPortTransform.invert();
    var point = viewPortTransform.transformPoint(new dvt.Point(x, y));
    return DvtThematicMapProjections._getInverseMercatorProjection(point.x, point.y);
  }
  else if (DvtThematicMapProjections._HAWAII_WINDOW.containsPoint(x, y)) {
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._HAWAII_BOUNDS, DvtThematicMapProjections._HAWAII_WINDOW);
    viewPortTransform.invert();
    return viewPortTransform.transformPoint(new dvt.Point(x, y));
  }
  else if (DvtThematicMapProjections._VIEWPORT_BOUNDS.containsPoint(x, y)) {
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._USA_BOUNDS, DvtThematicMapProjections._VIEWPORT_BOUNDS);
    viewPortTransform.invert();
    var point = viewPortTransform.transformPoint(new dvt.Point(x, y));
    return DvtThematicMapProjections._getInverseOrthographicProjection(new dvt.Point(- 95, 36), point.x, point.y);
  }
  return new dvt.Point(x, y);
};

/**
 * Returns the inversely projected long/lat point in the world basemap coordinate system
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @return {dvt.Point} The projected point in longitude/latitude using the basemap projection
 * @private
 */
DvtThematicMapProjections._getInverseWorldProjection = function(x, y) {
  var viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._WORLD_BOUNDS, DvtThematicMapProjections._VIEWPORT_BOUNDS);
  viewPortTransform.invert();
  var point = viewPortTransform.transformPoint(new dvt.Point(x, y));
  return DvtThematicMapProjections._getInverseRobinsonProjection(point.x, point.y);
};

/**
 * Returns the inversely projected long/lat point in the australia basemap coordinate system
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @return {dvt.Point} The projected point in longitude/latitude using the basemap projection
 * @private
 */
DvtThematicMapProjections._getInverseAustraliaProjection = function(x, y) {
  var viewPortTransform;
  if (DvtThematicMapProjections._NEW_ZEALAND_RECT.containsPoint(x, y))
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._NEW_ZEALAND_BOUNDS, DvtThematicMapProjections._NEW_ZEALAND_RECT);
  else
    viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(DvtThematicMapProjections._AUSTRALIA_BOUNDS, DvtThematicMapProjections._VIEWPORT_BOUNDS);

  viewPortTransform.invert();
  var point = viewPortTransform.transformPoint(new dvt.Point(x, y));
  return DvtThematicMapProjections._getInverseMercatorProjection(point.x, point.y);
};

/**
 * Applies an inverse affine transform to a point
 * @param {dvt.Rectangle} mapBounds The map bounds
 * @param {dvt.Point} point The point to apply the transform to
 * @param {number} rotRadians The rotation to apply to the transform matrix in radians
 * @return {dvt.Point}
 * @private
 */
DvtThematicMapProjections._getInverseAffineProjection = function(mapBounds, point, rotRadians) {
  var viewPortTransform = DvtThematicMapProjections._getViewPortTransformation(mapBounds, DvtThematicMapProjections._VIEWPORT_BOUNDS);
  if (rotRadians) {
    var rotMatrix = new dvt.Matrix();
    rotMatrix.rotate(rotRadians);
    viewPortTransform = DvtThematicMapProjections._concatAffineTransforms(viewPortTransform, rotMatrix);
  }
  viewPortTransform.invert();
  return viewPortTransform.transformPoint(point);
};

/**
 * Returns the inversely projected long/lat point using the albers equal area conic projection
 * @param {number} latOfOrigin latitude for the origin, in degrees
 * @param {number} lonOfOrigin longitude for the origin, in degrees
 * @param {number} sP1 standard parallel 1, in degrees
 * @param {number} sP2 standard parallel 2, in degrees
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @return {dvt.Point} The projected point in longitude/latitude using the basemap projection
 * @private
 */
DvtThematicMapProjections._getInverseAlbersEqualAreaConicProjection = function(latOfOrigin, lonOfOrigin, sP1, sP2, x, y) {
  var lambda0 = DvtThematicMapProjections.toRadians(lonOfOrigin);
  var phi0 = DvtThematicMapProjections.toRadians(latOfOrigin);
  sP1 = DvtThematicMapProjections.toRadians(sP1);
  sP2 = DvtThematicMapProjections.toRadians(sP2);

  var n = 0.5 * (Math.sin(sP1) + Math.sin(sP2));
  var c = Math.pow((Math.cos(sP1)), 2) + (2 * n * Math.sin(sP1));

  var p0 = c - (2 * n * Math.sin(phi0));
  p0 = Math.sqrt(p0) / n;

  var p = Math.sqrt(x * x + (p0 - y) * (p0 - y));
  var pheta = Math.atan(x / (p0 - y));

  var py = Math.asin((c - p * p * n * n) / (2 * n));
  var px = lambda0 + pheta / n;

  return new dvt.Point(DvtThematicMapProjections.toDegrees(px), DvtThematicMapProjections.toDegrees(py));
};

/**
 * Returns the inversely projected long/lat point using the mercator projection, assuming center at 0,0
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @return {dvt.Point} The projected point in longitude/latitude using the basemap projection
 * @private
 */
DvtThematicMapProjections._getInverseMercatorProjection = function(x, y) {
  var py = 2 * Math.atan(Math.exp(DvtThematicMapProjections.toRadians(y))) - 0.5 * Math.PI;
  return new dvt.Point(x, DvtThematicMapProjections.toDegrees(py));
};

/**
 * Returns the inversely projected long/lat point using the orthographic projection, assuming center at 0,0
 * @param {dvt.Point} center The center of the basemap
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @return {dvt.Point} The projected point in longitude/latitude using the basemap projection
 * @private
 */
DvtThematicMapProjections._getInverseOrthographicProjection = function(center, x, y) {
  var radX = x / DvtThematicMapProjections._RADIUS;
  var radY = y / DvtThematicMapProjections._RADIUS;
  var centerX = DvtThematicMapProjections.toRadians(center.x);
  var centerY = DvtThematicMapProjections.toRadians(center.y);

  var p = Math.sqrt((radX * radX) + (radY * radY));
  var c = Math.asin(p);

  var py = Math.asin(Math.cos(c) * Math.sin(centerY) + (radY * Math.sin(c) * Math.cos(centerY) / p));
  var px = centerX + Math.atan(radX * Math.sin(c) / (p * Math.cos(centerY) * Math.cos(c) - radY * Math.sin(centerY) * Math.sin(c)));

  return new dvt.Point(DvtThematicMapProjections.toDegrees(px), DvtThematicMapProjections.toDegrees(py));
};

/**
 * Returns the inversely projected long/lat point using the robinson projection, assuming center at 0,0
 * @param {number} x The x coordinate in the basemap coordinate system
 * @param {number} y The y coordinate in the basemap coordinate system
 * @return {dvt.Point} The projected point in longitude/latitude using the basemap projection
 * @private
 */
DvtThematicMapProjections._getInverseRobinsonProjection = function(x, y) {
  var criteria = Math.floor(Math.abs(y) / 5.0);
  if (criteria >= DvtThematicMapProjections._ROBINSON_COORDINATES.length - 1)
    criteria = DvtThematicMapProjections._ROBINSON_COORDINATES.length - 2;

  var xLength = DvtThematicMapProjections._ROBINSON_COORDINATES[criteria + 1][0] - DvtThematicMapProjections._ROBINSON_COORDINATES[criteria][0];
  var yLength = DvtThematicMapProjections._ROBINSON_COORDINATES[criteria + 1][1] - DvtThematicMapProjections._ROBINSON_COORDINATES[criteria][1];

  var yInterval = (Math.abs(y / 180.0) - DvtThematicMapProjections._ROBINSON_COORDINATES[criteria][1]) / yLength;
  var originalY = (yInterval * 5.0) + criteria * 5.0;
  var originalX = x / (DvtThematicMapProjections._ROBINSON_COORDINATES[criteria][0] + yInterval * xLength);

  if (y < 0.0)
    originalY = - 1 * originalY;

  return new dvt.Point(originalX, originalY);
};

dvt.exportProperty(DvtBaseMapManager, 'getLayerIds', DvtBaseMapManager.getLayerIds);

dvt.exportProperty(dvt, 'ThematicMap', dvt.ThematicMap);
dvt.exportProperty(dvt.ThematicMap, 'newInstance', dvt.ThematicMap.newInstance);
dvt.exportProperty(dvt.ThematicMap.prototype, 'updateLayer', dvt.ThematicMap.prototype.updateLayer);
dvt.exportProperty(dvt.ThematicMap.prototype, 'destroy', dvt.ThematicMap.prototype.destroy);
dvt.exportProperty(dvt.ThematicMap.prototype, 'getAutomation', dvt.ThematicMap.prototype.getAutomation);
dvt.exportProperty(dvt.ThematicMap.prototype, 'highlight', dvt.ThematicMap.prototype.highlight);
dvt.exportProperty(dvt.ThematicMap.prototype, 'processDefaultHoverEffect', dvt.ThematicMap.prototype.processDefaultHoverEffect);
dvt.exportProperty(dvt.ThematicMap.prototype, 'processDefaultSelectionEffect', dvt.ThematicMap.prototype.processDefaultSelectionEffect);
dvt.exportProperty(dvt.ThematicMap.prototype, 'processDefaultFocusEffect', dvt.ThematicMap.prototype.processDefaultFocusEffect);

dvt.exportProperty(DvtThematicMapAutomation.prototype, 'getDomElementForSubId', DvtThematicMapAutomation.prototype.getDomElementForSubId);
dvt.exportProperty(DvtThematicMapAutomation.prototype, 'getData', DvtThematicMapAutomation.prototype.getData);

/**
 * Thematic Map MapProvider utility class for converting a GeoJSON object into a basemap.
 */
var DvtMapProviderUtils = {};

/**  @const  @private */
DvtMapProviderUtils._MANAGER = 'DvtBaseMapManager';
/**  @const  @private */
DvtMapProviderUtils._UNPROCESSED = '_UNPROCESSED_MAPS';
/**  @const  @private */
// GeoJSON keys
/**  @const  @private */
DvtMapProviderUtils._TYPE = 'type';
/**  @const  @private */
DvtMapProviderUtils._GEOMETRY = 'geometry';
/**  @const  @private */
DvtMapProviderUtils._COORDINATES = 'coordinates';
/**  @const  @private */
DvtMapProviderUtils._FEATURES = 'features';
/**  @const  @private */
DvtMapProviderUtils._PROPERTIES = 'properties';
// GeoJSON Types
/**  @const  @private */
DvtMapProviderUtils._TYPE_FEATURE_COLLECTION = 'FeatureCollection';
/**  @const  @private */
DvtMapProviderUtils._TYPE_GEOMETRY_COLLECTION = 'GeometryCollection';
/**  @const  @private */
DvtMapProviderUtils._TYPE_FEATURE = 'Feature';
/**  @const  @private */
DvtMapProviderUtils._TYPE_POLYGON = 'Polygon';
/**  @const  @private */
DvtMapProviderUtils._TYPE_MULTI_POLYGON = 'MultiPolygon';
// Our internal properties keys required for determining an area's id, shortLabel, and longLabel
/**  @const  @private */
DvtMapProviderUtils._ID = 'id';
/**  @const  @private */
DvtMapProviderUtils._SHORT_LABEL = 'shortLabel';
/**  @const  @private */
DvtMapProviderUtils._LONG_LABEL = 'longLabel';

/**
 * Does a basic check to see if an object contains geo JSON, returning true if it does. We need this check
 * because the default JET property for mapProvider produces an empty object for the 'geo' subproperty.
 * @param {Object} mapProvider The mapProvider object
 * @return {boolean}
 */
DvtMapProviderUtils.containsGeoJson = function(mapProvider) {
  return mapProvider && mapProvider['geo'] && mapProvider['geo'][DvtMapProviderUtils._TYPE];
};

/**
 * Parses a GeoJSON object and returns the map info that Thematic Map needs to render an area layer
 * @param {dvt.Context} context The rendering context.
 * @param  {Object} mapProvider The mapProvider object
 * @return {Object}
 */
DvtMapProviderUtils.parseMapInfo = function(context, mapProvider) {
  var labels = {};
  var areas = {};
  var geoJson = mapProvider['geo'];
  var keys = mapProvider['propertiesKeys'] || {};
  if (!keys[DvtMapProviderUtils._ID])
    throw new Error('Missing required mapProvider.propertiesKeys.id property.');

  // Determine the GeoJSON top-level type
  var type = geoJson[DvtMapProviderUtils._TYPE];
  // Only a Feature will have a properties object which gives us a place to look up
  // an area's id, shortLabel, and longLabel.
  if (type === DvtMapProviderUtils._TYPE_FEATURE_COLLECTION) {
    var features = geoJson[DvtMapProviderUtils._FEATURES];
    // Check each feature for an ID and skip if not provided
    for (var i = 0; i < features.length; i++) {
      DvtMapProviderUtils._parseFeature(context, features[i], keys, areas, labels);
    }
  }
  else if (type === DvtMapProviderUtils._TYPE_FEATURE) {
    DvtMapProviderUtils._parseFeature(context, geoJson, keys, areas, labels);
  }
  else {
    throw new Error('GeoJSON type of ' + type + ' is not supported. ' +
        'Only Feature and FeatureCollection types are supported.');
  }

  // Don't try and render if map didn't contain any valid areas
  var numAreas = Object.keys(areas).length;
  if (numAreas === 0) {
    throw new Error('No valid Features found in GeoJSON.');
  }

  return {labels: labels, areas: areas};
};

/**
 * Parses a GeoJSON Feature object and translates it to a Thematic Map area.
 * @param {dvt.Context} context The rendering context.
 * @param  {Object} feature The Feature object
 * @param  {Object} keys The object containing the properties keys mapping
 * @param  {Object} areas   The areas map of area id to svg paths
 * @param  {Object} labels  The labels map of area id to label info
 * @private
 */
DvtMapProviderUtils._parseFeature = function(context, feature, keys, areas, labels) {
  // A Feature has 'geometry' and 'properties' keys and maps to an area.
  // Do not process a Feature if it does not have an id or is not a supported geometry type.
  var props = feature[DvtMapProviderUtils._PROPERTIES];
  var geom = feature[DvtMapProviderUtils._GEOMETRY];
  if (!DvtMapProviderUtils._isSupportedGeometry(geom)) {
    context['oj']['Logger']['warn']('A geometry of type ' + geom[DvtMapProviderUtils._TYPE] +
        ' is not supported and will be skipped.');
    return;
  }

  var id = props[keys[DvtMapProviderUtils._ID]];
  if (!id) {
    context['oj']['Logger']['warn']("No 'id' value found in the mapProvider.propertiesKey object. " +
        "A Feature's 'properties' object must have an id in the field specified by " +
        'the mapProvider.propertiesKey.id value.');
    return;
  }

  // Generate label info
  var shortLabel = props[keys[DvtMapProviderUtils._SHORT_LABEL]];
  var longLabel = props[keys[DvtMapProviderUtils._LONG_LABEL]];
  if (shortLabel || longLabel) {
    labels[id] = [shortLabel, longLabel];
  }

  // Generate area svg path
  areas[id] = DvtMapProviderUtils._geomToPath(geom);
};

/**
 * Returns true if the geometry object is a supported type
 * @param  {Object}  geom The geometry object
 * @return {boolean}
 * @private
 */
DvtMapProviderUtils._isSupportedGeometry = function(geom) {
  var type = geom[DvtMapProviderUtils._TYPE];
  if (type === DvtMapProviderUtils._TYPE_POLYGON || type === DvtMapProviderUtils._TYPE_MULTI_POLYGON)
    return true;
  return false;
};

/**
 * Converts a GeoJSON Polygon or MultiPolygon geometry to a string of relative path commands.
 * Only Polygon and MultiPolygon geometry types are currently supported.
 * @param {Array} geom The GeoJSON geometry to convert
 * @return {string}
 * @private
 */
DvtMapProviderUtils._geomToPath = function(geom) {
  var path = '';
  var type = geom[DvtMapProviderUtils._TYPE];
  var coords = geom[DvtMapProviderUtils._COORDINATES];
  if (type === DvtMapProviderUtils._TYPE_POLYGON) {
    path = DvtMapProviderUtils._polygonToPath(coords);
  }
  else if (type === DvtMapProviderUtils._TYPE_MULTI_POLYGON) {
    // The coordinates of a MultiPolygon are an array of Polygon coordinate arrays.
    for (var i = 0; i < coords.length; i++) {
      path += DvtMapProviderUtils._polygonToPath(coords[i]);
    }
  }
  return path;
};

/**
 * Converts a GeoJSON Polygon coordinate array to a relative SVG path.
 * @param  {Array} coords The coordinates array to convert
 * @return {string}
 * @private
 */
DvtMapProviderUtils._polygonToPath = function(coords) {
  var path = '';
  // The coordinates of a Polygon are an array of LinearRing coordinate arrays
  // where the first element in the array represents the exterior ring and any subsequent
  // elements represent interior rings (or holes) e.g.
  // [
  //   [[x1, y1], ...], (exterior ring)
  //   [[x2, y2], ...]] (interior ring)
  // ].
  for (var i = 0; i < coords.length; i++) {
    path += DvtMapProviderUtils._linearRingToPath(coords[i]);
  }
  return path;
};

/**
 * Converts a GeoJSON LinearRing coordinate array to a relative SVG path.
 * @param  {Array} coords The coordinates array to convert
 * @return {string}
 * @private
 */
DvtMapProviderUtils._linearRingToPath = function(coords) {
  // [ [100.0, 0.0], [101.0, 1.0] ]
  var path, prevX, prevY;
  var prevCmd = 'M';
  if (coords) {
    for (var i = 0; i < coords.length; i++) {
      var coord = coords[i];
      var x = coord[0];
      var y = -coord[1]; // flip for svg because 0,0 is top left instead of bottom left
      if (prevCmd === 'M') {
        prevX = x;
        prevY = y;
        prevCmd = 'x'; // reset the previous command
        path = 'M' + x + ' ' + y;
        continue;
      }

      var relX = x - prevX;
      var relY = y - prevY;
      // check to see if we can convert a l to a h/v command
      if (prevCmd == 'l') {
        if (prevX == x) { // vertical line
          prevCmd = 'v';
          prevY = y;
          path = path + prevCmd + relY;
          continue;
        } else if (prevY == y) { // horizontal line
          prevCmd = 'h';
          prevX = x;
          path = path + prevCmd + relX;
          continue;
        }
        path = path + ' ' + relX + ' ' + relY;
      } else {
        prevCmd = 'l';
        path = path + 'l' + relX + ' ' + relY;
      }
      prevX = x;
      prevY = y;
    }
  }
  return path + 'Z';
};

/**
 * Helper method to retrieve the next coordinate from an svg string
 * skipping over chars, spaces, and handling negative numbers.
 * @param {string} path The svg path commands
 * @param {number} idx The current index in the path command to start from
 * @return {object}
 * @private
 */
DvtMapProviderUtils._getCoord = function(path, idx) {
  // We always end on a z so this should always return something
  for (var i = idx; i < path.length; i++) {
    var currChar = path[i];
    if (currChar === '-')
      continue;
    if (isNaN(currChar) || currChar === ' ') {
      var cmd = null;
      if (currChar !== ' ')
        cmd = currChar;
      return {coord: parseInt(path.substring(idx, i)), idx: i, cmd: cmd};
    }
  }
  return {};
};

/**
 * Helper method to convert svg path commands to a polygon
 * used for geoJSON.
 * @param {string} path The svg path commands
 * @return {Array}
 * @private
 */
DvtMapProviderUtils._pathToPolygon = function(path) {
  var coords = [];
  var currX = 0;
  var currY = 0;

  var currCmd = path[0]; // Should be an M
  if (path) {
    var coordAr = [];
    for (var i = 1; i < path.length; i++) {
      var coord1 = DvtMapProviderUtils._getCoord(path, i);
      var coord2 = null;

      // Update idx
      i = coord1.idx;

      // If command isn't v or h look for 2nd coordinate
      if (currCmd !== 'v' && currCmd !== 'h') {
        coord2 = DvtMapProviderUtils._getCoord(path, ++i);

        // Update idx
        i = coord2.idx;

        currX += coord1.coord;
        currY += coord2.coord;
      }
      else if (currCmd === 'v') {
        currY += coord1.coord;
      }
      else if (currCmd === 'h') {
        currX += coord1.coord;
      }

      // Fip the y coord because our maps are in svg coord space
      coordAr.push([currX, -currY]);

      // Update command
      if (coord2) {
        if (coord2.cmd != null)
          currCmd = coord2.cmd;
      }
      else if (coord1.cmd != null) {
        currCmd = coord1.cmd;
      }

      if (currCmd === 'Z') {
        coords.push(coordAr);
        coordAr = [];
        currCmd = path[++i];
      }
    }
  }
  return coords;
};

})(dvt);
// To avoid changing the basemaps, which each call the basemap manager, we will
// put the basemap manager onto the returned object. We'll only do this if it's
// not defined, since in min/min-debug mode, the non-exported version is on the window.
if(!dvt['DvtBaseMapManager'])
  dvt['DvtBaseMapManager'] = DvtBaseMapManager;

  return dvt;
});
