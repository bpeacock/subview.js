var _ = require("underscore");

/*** Cache ***/
var statePrefix = "state-",
    stateRegex  = new RegExp("^"+statePrefix, ""),
    noop = function() {},
    stateClassFilter = function(c) {
        return c.match(stateRegex);
    },
    getStateClassRegex = function(key) {
        return new RegExp("^" + statePrefix + key + "-", "");
    };

/*** The Class ***/
var State = function(view, defaults) {
    this.view       = view;
    this.data       = {};
    this.bindings   = {};
    this.listeners  = {};

    this._setDefaults(defaults);
};

State.prototype = {

    /*** Getters & Setters ***/
    set: function(key, value) {
        //Validate
        if(!key.match(/^[a-zA-Z0-9\.]+$/)) {
            console.error("State name '" + key + "' is not alphanumeric.");
        }
        else {
            //Set
            if(this.get(key) != value) {
                this.data[key] = value;
                this.trigger(key, value);

                if(value === true || value === false || (typeof value == 'string' && value.match(/^[a-zA-Z0-9]+$/))) {
                    this._setStateClass(key, value);
                }
            }
        }

        return this;
    },
    get: function(key) {
        return this.data[key];
    },
    remove: function(key) {
        if(this.get(key)) {
            delete this.data[key];
            this.trigger(key, null);
            this._removeStateClass(key);
        }

        return this;
    },

    /*** Event Bindings ***/
    bind: function(key, callback) {
        this.bindings[key] = callback;
        return callback;
    },
    unbind: function(key) {
        delete this.bindings[key];
        return this;
    },
    trigger: function(key, value) {
        value = value === undefined ? this.get(key) : value;
        (this.bindings[key] || noop)(value);

        //Tell all of the listening children
        var $children = subview.$(this.view.el).find('.' + this._listenCssPrefix + this.view.type + '-' + key),
            i = $children.length;

        while(i--) {
            var child = $children[i].view;
            child.state._hear(this.view.type, key, value);
        }

        return this;
    },


    /*** Communicatory Get/Set/Bind ***/
    //These methods communicate with the closest parent of the given type
    askParent: function(type, key) {
        var parent = subview.$(this.view.el).closest('.'+this.view._viewCssPrefix + type)[0];

        if(parent)  return parent.view.state.get(key);
        else        return undefined;
    },
    tellParent: function(type, key, value) {
        var parent = subview.$(this.view.el).closest('.'+this.view._viewCssPrefix + type)[0];

        if(parent) parent.view.state.set(key, value);
        return this;
    },
    _listenCssPrefix: "listen-",
    listen: function(type, key, callback) {
        var classes = this.view._getClasses();
        classes.push(this._listenCssPrefix+type+"-"+key);
        this.view._setClasses(classes);

        this.listeners[type + '-' + key] = callback;
        return this;
    },
    _hear: function(type, key, value) {
        (this.listeners[type + '-' + key] || noop)(value);
        return this;
    },


    /*** Updates State From DOM Classes ***/
    _update: function() {
        var self    = this,
            states  = this.getStateClasses();

        _.each(states, function(value, key) {
            self.set(key, value);
        });

        return this;
    },
    _setDefaults: function(defaults) {
        var self = this;

        this.defaults   = defaults || this.defaults;
        this.data       = {};

        _.each(
            _.extend(this.defaults, this._getStateClasses()),
            function(value, key) {
                self.set(key, value);
            }
        );

        return this;
    },

    /*** State Class methods ***/
    _getStateClasses: function() {
        var classes = this.view._getClasses(),
            i = classes.length,
            data = {};

        while(i--) {
            var c = classes[i];

            if(c.match(stateRegex)) {
                var parts = c.split('-');
                if(parts.length == 3) {
                    data[parts[1]] = parts[2];
                }
            }
        }

        return data;
    },
    _getStateClass: function(key) {
        var classes = this.view._getClasses(),
            regex   = getStateClassRegex(key),
            state   = _.find(classes, function(c) {
                return c.match(regex);
            }),
            parts   = state ? state.split('-') : [];

        return parts.length == 3 ? parts[2] : null;
    },
    _setStateClass: function(key, value) {
        var classes = this.view._getClasses(),
            regex   = getStateClassRegex(key),
            i       = classes.length,
            data    = {},
            defined = false,
            newState = statePrefix + key + "-" + value;

        while(i--) {
            if(classes[i].match(regex)) {
                if(newState == classes[i])  return this; //Don't do anything if there is no change (efficient!!!)
                else                        classes[i] = newState;

                defined = true;
                break;
            }
        }

        if(!defined) classes.push(newState);
        this.view._setClasses(classes);
        return this;
    },
    _removeStateclass: function(key) {
        var classes = this.view._getClasses(),
            len     = classes.length,
            regex   = getStateClassRegex(key);

        classes = _.reject(classes, function(c) {
            return c.match(regex);
        });

        if(classes.length != len) this.view.el.className = classes.join(' '); //Don't do anything if there is no change (efficient!!!)
        return this;
    }
};

module.exports = State;

