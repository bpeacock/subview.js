var Mustache    = require("mustache"),
    _           = require('underscore'),
    noop        = function() {};

var View = function() {};

View.prototype = {

    /*** Default Attributes (should be overwritten) ***/
    init:       noop,
    clean:      noop,
    tag:        "div",
    template:   "",
    state:      {},
    data:       {},

    /*** Rendering ***/
    render: function() {
        var data = typeof this.data == 'function' ? this.data() : this.data;
        data.subview = subview.templates;

        this.el.innerHTML = Mustache.render(this.template, _.extend(this.state.data, data));
        subview.load(this.el);
        return this;
    },
    remove: function() {
        //Detach
        var parent = this.el.parentNode;
        if(parent) {
            parent.removeChild(this.el);
        }

        //Clean
        this.state.setDefaults();
        this.clean();

        this.pool._release();
        return this;
    },

    /*** State API ***/
    set: function(key, value) {
        this.state.set(key, value);
        return this;
    },
    get: function(key) {
        return this.state.get(key);
    },
    bind: function(key, callback) {
        this.state.bind(key, callback);
        return callback;
    },
    unbind: function(key) {
        this.state.unbind(key);
        return this;
    },
    trigger: function(key, value) {
        this.state.trigger(key, value);
        return this;
    },
    tellParent: function(type, key, value) {
        this.state.tellParent(type, key, value);
        return this;
    },
    askParent: function(type, key) {
        return this.state.askParent(type, key);
    },
    listen: function(type, key, value) {
        this.state.listen(type, key, value);
        return this;
    },

    /*** Classes ***/
    _viewCssPrefix: 'view-',
    _getClasses: function() {
        return this.el.className.split(/\s+/);
    },
    _setClasses: function(classes) {
        var newClassName = classes.join(' ');
        if(this.el.className != newClassName) this.el.className = newClassName;

        return this;
    },
    _addDefaultClasses: function() {
        var classes = this._getClasses();
        classes.push(this._viewCssPrefix + this.type);

        var superClass = this.super;
        while(true) {
            if(superClass.type) {
                classes.push(this._viewCssPrefix + superClass.type);
                superClass = superClass.super;
            }
            else {
                break;
            }
        }

        //Add Default View Class
        classes.push('view');

        this._setClasses(_.uniq(classes));

        return this;
    }
};

module.exports = View;



