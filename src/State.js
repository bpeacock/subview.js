var $ = require("unopinionate").selector;

var State = function($el) {
    this.$wrapper = $el;
    this.data     = {};
    this.bindings = {};
};

State.prototype = {
    _stateCssPrefix:        'state-',

    /*** Get Set ***/
    set: function(name, value) {
        //Set Data Store
        this.data[name] = value;

        //Set Classes
        this._removeClasses(name);
        this.$wrapper.addClass(this._stateCssPrefix + name + '-' + value);

        //Trigger Events
        this.trigger(name);
    },
    get: function(name) {
        return this.data[name];
    },

    /*** Dump Load ***/
    dump: function() {
        return this.data;
    },
    load: function(defaults) {
        var self = this;

        if(this.notFirstTime) {
            //Reset data
            this.data = {};

            //Reset classes
            this._removeClasses();
        }
        else {
            this.notFirstTime = true;
        }
        
        //Set Everything
        $.each(defaults, function(name, value) {
            self.set(name, value);
        });
    },

    /*** Events ***/
    bind: function(name, callback) {
        var binding = this.bindings[name];

        if(binding) {
            binding.push(callback);
        }
        else {
            binding = [callback];
        }
    },
    unbind: function(name) {
        delete this.bindings[name];
    },
    trigger: function(name) {
        var binding = this.bindings[name],
            value   = this.data[name];

        if(binding) {
            for(var i=0; i<binding.length; i++) {
                binding[i](value);
            }
        }
    },

    _removeClasses: function(name) {
        var classes = this.$wrapper[0].className.split(' '),
            regex = new RegExp('^'+this._stateCssPrefix+name+'-'),
            i = classes.length;

        while(i--) {
            if(classes[i].match(regex)) {
                classes.splice(i, 1);
            }
        }
        
        this.$wrapper[0].className = classes.join(' ');
    }
};

module.exports = State;

