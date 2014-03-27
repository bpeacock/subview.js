var $ = require("unopinionate").selector,
    _ = require('underscore');

var State = function($el) {
    this.$wrapper = $el;
    this.data     = {};
    this.bindings = {};
};

State.prototype = {
    _stateCssPrefix:        'state-',
    _stateCssPrefixRegex:   /^state-/,

    /*** Get Set ***/
    set: function(name, value) {
        this.data[name] = value;
        this.$wrapper.addClass(_stateCssPrefix + name + '-' + value);
        this.trigger(name);
    },
    get: function(name) {
        return this.data[name];
    },

    /*** Dump Load ***/
    dump: function() {
        return _.clone(this.data);
    },
    load: function(defaults) {
        this.data = _.clone(defaults);

        //Reset Classes
        var classes = this.$wrapper[0].className.split(' '),
            i = classes.length;

        while(i--) {
            if(classes[i].match(_stateCssPrefixRegex)) {
                classes.splice(i, 1);
            }
        }
        
        this.$wrapper[0].className = classes.join(' ');
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
    }
};
