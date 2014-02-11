var _               = require("underscore"),
    ViewPool        = require("./ViewPool"),
    ViewTemplate    = require("./View"),
    viewTypeRegex   = new RegExp('^' + ViewTemplate.prototype._viewCssPrefix);

var subview = function(name, protoViewPool, config) {
    var ViewPrototype;

    //Argument Surgery
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

    subview.templates[name] = viewPool.template;

    return viewPool;
};

subview.views      = {};
subview.templates  = {};

/*** Settings ***/
subview.$ = null;

/*** API ***/
subview.load = function(scope) {
    //Argument Surgery
    if(typeof scope == 'object') {
        this.configure(scope);
        scope = false;
    }

    var $scope = scope ? this.$(scope) : this.$('body'),
        $views = $scope.find("[class^='view-']");

    for(var i=0; i<$views.length; i++) {
        var el = $views[i],
            classes = el.className.split(/\s+/);

        type =  _.find(classes, function(c) {
                    return c.match(viewTypeRegex);
                }).replace(viewTypeRegex, '');

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

subview.extend = function(extension) {
    ViewTemplate.prototype = _.extend(ViewTemplate.prototype, extension);
    return this;
};

window.subview = module.exports = subview;

