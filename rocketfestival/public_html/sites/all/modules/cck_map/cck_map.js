// $Id: cck_map.js,v 1.8 2008/01/09 02:54:07 beeradb Exp $

/*  CLASS: gMapBaseController
*  DESCRIPTION: handles shared functionality between the admin and client controllers
*/
gmapBaseController = function () {};
gmapBaseController.prototype.initializeMap = function(lat, lon, zoom, mapType){
    if (lon != 0 && lat != 0 && zoom != 0){
      this.map.setCenter(new GLatLng(lat, lon), zoom);
      //this.map.setCenter(new GLatLng(180, 180), 3);
    }else{
      this.map.setCenter(new GLatLng(0, 0), 1);
    }
    if (mapType.length){
      if (mapType.length > 0){
        this.map.setMapType(eval(mapType));
      }
    }
    this.map.addControl(new GLargeMapControl());
    this.map.addControl(new GMapTypeControl());
};

  gmapBaseController.prototype.getMarkerOptions = function(img){
    var baseIcon = new GIcon();
    baseIcon.iconSize = new GSize(20, 34);
    baseIcon.iconAnchor = new GPoint(9, 34);
    baseIcon.infoWindowAnchor = new GPoint(9, 2);
    baseIcon.infoShadowAnchor = new GPoint(18, 25);
    if (img.length){
      var i = new GIcon(baseIcon);
      i.image = 'http://'+this.tld+'/'+img;
      markerOptions = { icon:i };
    }else{
       markerOptions = { };
    }
	
    return markerOptions;
  };



/*
*  CLASS: gmapClientController
*  DESCRIPTION: 
*/
gmapClientController.prototype = new gmapBaseController();
gmapClientController.contructor = gmapClientController;

function gmapClientController(prefix, lat, lon, zoom, mapType, markers, tld) {
  this.prefix = prefix;
  this.lat = lat;
  this.lon = lon;
  this.zoom = zoom;
  this.mapType = mapType;
  this.tld = tld;
  this.markerList = new Array();
  this.markers = markers;
  this.map = new GMap2(document.getElementById(prefix +"mapArea"));
  this.initializeMap();
  this.initializePoints();
}

gmapClientController.prototype.initializeMap = function(){
  gmapBaseController.prototype.initializeMap.call(this, this.lat, this.lon, this.zoom, this.mapType);
}

gmapClientController.prototype.xmlToPoints = function(){
  gmapBaseController.prototype.xmlToPoints.call(this, this.points, false);
}

gmapClientController.prototype.getInfoWindowHtml = function (m){
  var ret = '';
  if (m.title)
    ret += "<h2>"+ m.title +"</h2>";

  if (m.description)
    ret += "<p class='cck-map-markerDescription'>"+ m.description +"</p>";

  return ret;
}

gmapClientController.prototype.initializePoints = function(){
  jsString = this.prefix.replace('-', '_', 'g');
  for (i=0;i<this.markers.length;i++){
      markerOptions = this.getMarkerOptions(this.markers[i].image);
      var m = new GMarker(new GLatLng(parseFloat(this.markers[i].lat),  parseFloat(this.markers[i].lon)), markerOptions);
      m.title = this.markers[i].title;
      m.description = this.markers[i].description;
      m.image = this.markers[i].image;
      this.attachMarkerListeners(m);
      this.markerList[i] = m;
      this.map.addOverlay(m);
  }
  
   
}


gmapClientController.prototype.attachMarkerListeners = function(m){
  if (m.title || m.description){
    controller = this;
    GEvent.addListener(m, 'click', function () {
      m.openInfoWindow(controller.getInfoWindowHtml(m))
    });
  }
}

/*
*  CLASS: gMapAdminController
*/
gmapAdminController.prototype = new gmapBaseController();
gmapAdminController.prototype.contructor = gmapAdminController;

function gmapAdminController(prefix, multiple, title, description, image, tld){
  this.markerList = new Array();
  this.prefix = prefix;
  this.useMultiple = multiple;
  this.useTitle = title;
  this.useDescription =  description;
  this.useImage = image;
  this.tld = tld;
  this.map = new GMap2(document.getElementById(prefix +"mapArea"));
  this.editTarget = -1;
  this.initializeMap();
  this.attachMapListeners();
  this.initializePoints();
  
  
  if (this.useImage)
    this.updateMarkerImage();

};

gmapAdminController.prototype.initializeMap = function(){
	var zoom = parseInt(document.getElementById('edit-'+this.prefix+'-mapzoom').value);
  var lat = parseFloat(document.getElementById('edit-'+this.prefix+'-maplat').value);
  var lon = parseFloat(document.getElementById('edit-'+this.prefix+'-maplon').value);
  var maptype = document.getElementById('edit-'+this.prefix+'-maptype').value;
  gmapBaseController.prototype.initializeMap.call(this, lat, lon, zoom, maptype);
}

gmapAdminController.prototype.attachMapListeners = function(){
    var controller = this;
    GEvent.addListener(this.map, "addoverlay", function(overlay) {
      if (!overlay.title)
        overlay.title = controller.getCurrentTitle();
      if (!overlay.description)
        overlay.description = controller.getCurrentDescription();

      controller.markerList[controller.markerList.length] = overlay;
    });
    
    GEvent.addListener(this.map, "removeoverlay", function(overlay){
        for(var i=0;i<controller.markerList.length;i++)
          if (controller.markerList[i] == overlay){
            controller.markerList.splice(i, 1);
            controller.serializeMapPoints();
          }
    });

    GEvent.addListener(this.map, 'click', function(overlay, point) {
        if (overlay) {
          if (controller.editTarget != -1){
            controller.saveEdit();
            controller.cancelEdit();
          }
          if (controller.getMarkerIndex(overlay))
            controller.muteNonEditMarkers();
            controller.editMarker(overlay);
        }else if (point) {
          if (controller.editTarget == -1){
             if (!controller.useMultiple)
                while(controller.markerList.length > 0)
                  controller.map.removeOverlay(controller.markerList[0]);

              img = null;
              if (img = controller.getCurrentMarkerImage()){
                markerOptions = controller.getMarkerOptions(img);  
              }else{
                markerOptions = controller.getMarkerOptions('');
              }  
              markerOptions.draggable = true;

              controller.marker = new GMarker(point, markerOptions);
              controller.attachMarkerListeners(controller.marker);
              
              controller.marker.image = img;
              controller.map.addOverlay(controller.marker);
              if (controller.editTarget != -1){
                if (controller.useMultiple)
                  controller.map.removeOverlay(controller.markerList[controller.editTarget]);

                controller.cancelEdit();
              }
              controller.serializeAll();
          }
        }
          
    });

    GEvent.addListener(this.map, 'maptypechanged', function(){
      controller.serializeMap();
    });

    GEvent.addListener(this.map, 'moveend', function(){
      controller.serializeMap();
    });

    GEvent.addListener(this.map, 'zoomend', function(){
      controller.serializeMap();
    });

    GEvent.addListener(this.map,'dragend', function(){
      controller.serializeMap();
    });

};


gmapAdminController.prototype.muteNonEditMarkers = function () {
    if (this.editTarget != -1)
      for (var i=0;i<this.markerList.length;i++) {
          if (i != this.editTarget) {
              this.markerList[i].image = this.markerList[i].getIcon().image;
              this.markerList[i].setImage('http://' + this.tld + '/modules/cck_map/icons/marker_white.png');
          }
      }
}

gmapAdminController.prototype.restoreMarkerImages = function () {
   if (this.editTarget != -1)
      for (var i=0;i<this.markerList.length;i++) {
          if (i != this.editTarget) {
              this.markerList[i].setImage(this.markerList[i].image);
          }
      }
}
gmapAdminController.prototype.attachMarkerListeners = function (m) {
  controller = this;
  GEvent.addListener(m, 'dragend', function () {
    controller.serializeMapPoints();
  });
}

gmapAdminController.prototype.getMarkerIndex = function(m){
  for(var i=0;i<this.markerList.length;i++){
  if (this.markerList[i] == m){
    this.editTarget = i;
    return true;
  }
  }

 editTarget = -1;
  return false;
}

gmapAdminController.prototype.editMarker = function(m){
  if (this.useTitle || this.useDescription || this.useImage){
    if (this.useTitle)
      document.getElementById('edit-'+this.prefix+'-markerTitle').value = m.title;
    if (this.useDescription)
      document.getElementById('edit-'+this.prefix+'-markerDescription').value = m.description;
    if (this.useImage){
      for(var i=0;i<document.getElementById('edit-'+this.prefix+'-markerImage').options.length;i++)
        if (document.getElementById('edit-'+this.prefix+'-markerImage').options[i].value == m.image){
          document.getElementById('edit-'+this.prefix+'-markerImage').options.selectedIndex = i;
          this.updateMarkerImage();
        }  
    }
    jsString = this.prefix.replace('-', '_', 'g');
    document.getElementById(this.prefix +'editControls').innerHTML = "<a href='#' onclick='"+ jsString +"map.saveEdit();return false'>Save Marker</a> | <a href='#' onclick='"+ jsString +"map.removeTarget();return false'>Remove Marker</a> | <a href='#' onclick='"+ jsString +"map.cancelEdit();return false'>Cancel</a>";
    
  }
}

gmapAdminController.prototype.saveEdit = function(){
  if (this.editTarget != -1){
    m = this.markerList[this.editTarget];
    if (this.useImage){
      if (img = this.getCurrentMarkerImage()){
        if (img != m.image){
          markerOptions = this.getMarkerOptions(img);  
          markerOptions.draggable = true;
          newMarker = new GMarker(m.getPoint(), markerOptions);
          newMarker.image = img;
          this.map.addOverlay(newMarker);
          this.map.removeOverlay(m);
        }else{
          m.description = this.getCurrentDescription();
          m.title = this.getCurrentTitle();
          this.serializeMapPoints();
        }
      }
    }else{
      m.description = this.getCurrentDescription();
      m.title = this.getCurrentTitle();
      this.serializeMapPoints();
    }

    this.cancelEdit();
  }
}

gmapAdminController.prototype.removeTarget = function(){
   
  this.restoreMarkerImages();
  if (this.editTarget != -1){
    this.map.removeOverlay(this.markerList[this.editTarget]);
    this.serializeMapPoints();
    this.cancelEdit();
  }
}

gmapAdminController.prototype.cancelEdit = function(){
  
    if (this.useTitle || this.useDescription || this.useImage){
      if (this.useTitle)
        document.getElementById('edit-'+this.prefix+'-markerTitle').value = '';
      if (this.useDescription)
        document.getElementById('edit-'+this.prefix+'-markerDescription').value = '';
      
      jsString = this.prefix.replace('-', '_');
      document.getElementById(this.prefix+'editControls').innerHTML = '';
    }
    this.restoreMarkerImages();
    this.editTarget = -1;
}

gmapAdminController.prototype.xmlToPoints = function xml(xml){
      pointsText = document.getElementById('edit-'+this.prefix+'-points').value;
      gmapBaseController.prototype.xmlToPoints.call(this, pointsText, true);
}

gmapAdminController.prototype.serializeAll = function(){
    this.serializeMap();
    this.serializeMapPoints();
  };

gmapAdminController.prototype.serializeMap = function(){
    document.getElementById('edit-'+this.prefix+'-mapzoom').value = this.map.getZoom();
    document.getElementById('edit-'+this.prefix+'-maplon').value = this.map.getCenter().x;
    document.getElementById('edit-'+this.prefix+'-maplat').value = this.map.getCenter().y;
	  switch(this.map.getCurrentMapType()){
      case G_NORMAL_MAP:
        document.getElementById('edit-'+this.prefix+'-maptype').value = 'G_NORMAL_MAP';
        break;
      case G_SATELLITE_MAP:
        document.getElementById('edit-'+this.prefix+'-maptype').value = 'G_SATELLITE_MAP';
        break;
      case G_HYBRID_MAP:
        document.getElementById('edit-'+this.prefix+'-maptype').value = 'G_HYBRID_MAP';
        break;
      default:
        break;
    }

    
};

  gmapAdminController.prototype.serializeMapPoints = function(){
	  document.getElementById(this.prefix+'markers').innerHTML = this.pointsToInputs();
  };

  gmapAdminController.prototype.pointsToInputs = function(){
  //create a string for the name field.
    ns = this.prefix.replace('-', '_', 'g');
    inputs  = '';
    for(var i=0;i<this.markerList.length;i++)
    {
      inputs += "<input type='hidden' name='"+ ns + "[" + i + "][lon]' id='edit-"+ this.prefix +"-" + i +"-lon' value='"+ this.markerList[i].getLatLng().x +"' />";
      inputs += "<input type='hidden' name='"+ ns + "[" + i + "][lat]' id='edit-"+ this.prefix +"-" + i +"-lat' value='"+ this.markerList[i].getLatLng().y +"' />";
     
      if(this.markerList[i].title)
        inputs += "<input type='hidden' name='"+ ns + "[" + i + "][title]' id='edit-"+ this.prefix +"-" + i +"-title' value='"+ this.markerList[i].title.replace("'", '&#39', 'g') +"' />";
      if(this.markerList[i].description)
        inputs += "<input type='hidden' name='"+ ns + "[" + i + "][description]' id='edit-"+ this.prefix +"-" + i +"-description' value='"+ this.markerList[i].description.replace("'", '&#39', 'g') +"' />";
      if(this.markerList[i].image)
        inputs += "<input type='hidden' name='"+ ns + "[" + i + "][image]' id='edit-"+ this.prefix +"-" + i +"-image' value='"+ this.markerList[i].image +"' />";
    }
    document.getElementById('edit-'+ this.prefix + '-itemcount').value = this.markerList.length;
    return inputs;
  }

  gmapAdminController.prototype.initializePoints = function () {
    numPoints = parseInt(document.getElementById('edit-'+ this.prefix + '-itemcount').value);
    for(var i=0;i<numPoints;i++){
      lon = parseFloat(document.getElementById("edit-"+ this.prefix +"-" + i +"-lon").value);
      lat = parseFloat(document.getElementById("edit-"+ this.prefix +"-" + i +"-lat").value);
      this.useTitle ? title = document.getElementById("edit-"+ this.prefix +"-" + i +"-title").value : title = '';
      this.useDescription ? description = document.getElementById("edit-"+ this.prefix +"-" + i +"-description").value : description = '';
      this.useImage ? image = document.getElementById("edit-"+ this.prefix +"-" + i +"-image").value : image = '';
        
        if (image.length){
            markerOptions = this.getMarkerOptions(image);
        }else{
          markerOptions = this.getMarkerOptions('');
        }
        markerOptions.draggable = true;
          
        marker = new GMarker(new GLatLng(lat, lon), markerOptions);
        marker.image = image;
        marker.title = title;
        marker.description = title;
        this.attachMarkerListeners(marker);
        this.map.addOverlay(marker);
      
    }
  }

  gmapAdminController.prototype.getCurrentTitle = function(){
    if (t = document.getElementById('edit-'+this.prefix+'-markerTitle')){
      title = t.value;
      document.getElementById('edit-'+this.prefix+'-markerTitle').value = '';
      return title;
    }else{
      return '';
    }
  };
  
  gmapAdminController.prototype.getCurrentDescription = function(){
    if (desc = document.getElementById('edit-'+this.prefix+'-markerDescription')){
      description = desc.value;
      document.getElementById('edit-'+this.prefix+'-markerDescription').value = '';
      return description;
    }else{
      return '';
    }
  };

  gmapAdminController.prototype.getCurrentMarkerImage = function(){
    if (img = document.getElementById('edit-'+this.prefix+'-markerImage')){
      if (img.value.length > 0){
        return img.value;
      }
    }
    return null;
  }

  
  gmapAdminController.prototype.updateMarkerImage = function(){
    var imgsrc = document.getElementById('edit-'+this.prefix+'-markerImage').value;
    var img = "<img src=\""+  imgsrc  +"\" />";
    document.getElementById(this.prefix+'current_map_image').innerHTML=img;
  }