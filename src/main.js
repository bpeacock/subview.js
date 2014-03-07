var _               = require("underscore"),
    $               = require("unopinionate").selector,
    ViewPool        = require("./ViewPool"),
    ViewTemplate    = require("./View"),
    viewTypeRegex   = new RegExp('^' + ViewTemplate.prototype._viewCssPrefix);

var subview = function(name, protoViewPool, config) {
    var ViewPrototype;

    //Return View object from DOM element
    if(name.nodeType) {
        return name[subview._domPropertyName];
    }
    //Define a subview
    else {
        //Argument surgery
        if(!config) {
            config          = protoViewPool;
            ViewPrototype   = ViewTemplate;
        }
        else {
            ViewPrototype = protoViewPool.View;
        }

        //Validate Name
        if(!name.match(/^[a-zA-Z0-9\.]+$/)) {
            console.error("View name '" + name + "' is not alphanumeric.");
            return false;
        }

        if(subview.views[name]) {
            console.error("View '" + name + "' cannot be added twice.");
            return false;
        }

        //Create the new View
        var View = function() {},
            superClass = new ViewPrototype();

        View.prototype       = _.extend(superClass, config);
        View.prototype.type  = name;
        View.prototype.super = ViewPrototype.prototype;
        
        //Save the New View
        var viewPool = new ViewPool(View);
        subview.views[name] = viewPool;

        return viewPool;
    }
};

subview.views = {};

//Obscure DOM property name for subview wrappers
subview._domPropertyName = "subview12345";

/*** API ***/
subview.load = function(scope) {
    //Argument Surgery
    if($.isPlainObject(scope)) {
        this.configure(scope);
        scope = false;
    }

    var $scope = scope ? $(scope) : $('body'),
        $views = $scope.find("[class^='view-']"),
        finder = function(c) {
                    return c.match(viewTypeRegex);
                };

    for(var i=0; i<$views.length; i++) {
        var el = $views[i],
            classes = el.className.split(/\s+/);

        type =  _.find(classes, finder).replace(viewTypeRegex, '');

        if(type) {
            this.views[type].spawn($views[i]);
        }
        else {
            console.error("View type '"+type+"' is not defined.");
        }
    }

    return this;
};

subview.configure = function(config) {
    _.extend(this, config);
    return this;
};

window.subview = module.exports = subview;

/*** Startup Actions ***/
$(function() {
    subview.load();
});


