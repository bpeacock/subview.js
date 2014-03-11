var _    = require('underscore'),
    log  = require("loglevel"),
    noop = function() {};

var View = function() {};

View.prototype = {
    isView: true,
    
    /*** Default Attributes (should be overwritten) ***/
    config:     noop, //Runs before render
    init:       noop, //Runs after render
    clean:      noop, //Runs on remove
    tagName:    "div",
    className:  "",
    template:   "",

    //State data gets mapped to classes
    state:      {},

    //Data goes into the templates and may also be a function that returns an object
    data:       {},

    //Subviews are a set of subviews that will be fed into the templating engine
    subviews:   {},

    /*** Rendering ***/
    render: function() {
        var html = '';

        //No Templating Engine
        if(typeof this.template == 'string') {
            html = this.template;
        }
        else {
            var data = _.extend(this.state.data, typeof this.data == 'function' ? this.data() : this.data);
            
            data.subview = {};
            $.each(this.subviews, function(name, subview) {
                data.subview[name] = subview.template;
            });

            if(_.isFunction(this.template)) {
                //EJS
                if(typeof this.template.render == 'function') {
                    html = this.template.render(data);
                }
                //Handlebars & Underscore & Jade
                else {
                    html = this.template(data);
                }
            }
            else {
                log.error("Templating engine not recognized.");
            }
        }

        this.html(html);

        return this;
    },
    html: function(html) {
        //Remove & clean subviews in the wrapper 
        this.$wrapper.find('.view').each(function() {
            subview(this).remove();
        });

        this.wrapper.innerHTML = html;

        //Load subviews in the wrapper
        subview.load(this.$wrapper);

        return this;
    },
    remove: function() {
        //Detach
        var parent = this.wrapper.parentNode;
        if(parent) {
            parent.removeChild(this.wrapper);
        }

        //Clean
        this.state.setDefaults();
        this.clean();

        this.pool._release();
        return this;
    },

    /*** State API ***/
    /*set: function(key, value) {
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
    },*/
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
        return this.wrapper.className.split(/\s+/);
    },
    _setClasses: function(classes) {
        var newClassName = classes.join(' ');
        if(this.wrapper.className != newClassName) this.wrapper.className = newClassName;

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

        //Add className
        classes = classes.concat(this.className.split(' '));

        this._setClasses(_.uniq(classes));

        return this;
    }
};

module.exports = View;



