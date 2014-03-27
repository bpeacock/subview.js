var _   = require('underscore'),
    log = require('loglevel'),
    noop = function() {};

var View = function() {};

View.prototype = {
    isView: true,

    /*** Default Attributes (should be overwritten) ***/
    tagName:    "div",
    className:  "",

    //listeners
    //'[direction]:[event name]:[from type], ...': function(eventArguments*) {}
    listeners: {},

    //State
    defaultState: {},

    /* Templating */
    template:   "",

    //Data goes into the templates and may also be a function that returns an object
    data:       {},

    //Subviews are a set of subviews that will be fed into the templating engine
    subviews:   {},

    reRender:   false, //Determines if subview is re-rendered every time it is spawned

    /* Callbacks */
    preRender:  noop,
    postRender: noop,

    /*** Initialization Functions (should be configured but will be manipulated when defining the subview) ***/
    once: function(config) { //Runs after render
        for(var i=0; i<this.onceFunctions.length; i++) {
            this.onceFunctions[i].apply(this, [config]);
        }
    }, 
    onceFunctions: [],
    init: function(config) { //Runs after render
        for(var i=0; i<this.initFunctions.length; i++) {
            this.initFunctions[i].apply(this, [config]);
        }
    }, 
    initFunctions: [],
    clean: function() { //Runs on remove
        for(var i=0; i<this.cleanFunctions.length; i++) {
            this.cleanFunctions[i].apply(this, []);
        }
    }, 
    cleanFunctions: [],

    /*** Rendering ***/
    render: function() {
        var self = this,
            html = '';
            postLoad = false;

        this.preRender();

        //No Templating Engine
        if(typeof this.template == 'string') {
            html = this.template;
        }
        else {
            var data = typeof this.data == 'function' ? this.data() : this.data;
            
            //Define the subview variable
            data.subview = {};
            $.each(this.subviews, function(name, subview) {
                postLoad = true;
                data.subview[name] = "<script class='post-load-view' type='text/html' data-name='"+name+"'></script>";
            });

            //Run the templating engine
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

        //Post Load Views
        if(postLoad) {
            this.$wrapper.find('.post-load-view').each(function() {
                var $this = $(this),
                    view  = self.subviews[$this.attr('data-name')];

                if(view.isViewPool) {
                    view = view.spawn();
                }
                
                $this
                    .after(view.$wrapper)
                    .remove();
            });
        }

        this.postRender();

        return this;
    },
    html: function(html) {
        //Remove & clean subviews in the wrapper 
        this.$wrapper.find('.'+this._subviewCssClass).each(function() {
            subview(this).remove();
        });

        this.wrapper.innerHTML = html;

        //Load subviews in the wrapper
        subview.load(this.$wrapper);

        return this;
    },
    remove: function() {
        if(this._active) {
            //Detach
            var parent = this.wrapper.parentNode;
            if(parent) {
                parent.removeChild(this.wrapper);
            }

            //Clean
            this.clean();

            this.pool._release(this);
        }

        return this;
    },
    $: function(selector) {
        return this.$wrapper.find(selector);
    },

    /*** Event API ***/
    trigger: function(name, args) {
        var self = this;
        args = args || [];
        
        //Broadcast in all directions
        var directions = {
            up:     'find',
            down:   'parents',
            across: 'siblings',
            all:    null
        };

        _.find(directions, function(jqFunc, direction) {
            var selector = '.listener-'+direction+'-'+name;
            selector = selector + ', ' + selector+'-'+self.type;

            //Select $wrappers with the right listener class in the right direction
            var $els = jqFunc ? self.$wrapper[jqFunc](selector) : $(selector);

            for(var i=0; i<$els.length; i++) {
                //Get the actual subview
                var recipient = subview($els[i]);

                //Check for a subview type specific callback
                var typedCallback = recipient.listeners[direction + ":" + name + ":" + self.type];
                if(typedCallback && typedCallback.apply(recipient, args) === false) {
                    return true; //Breaks if callback returns false
                }

                //Check for a general event callback
                var untypedCallback = recipient.listeners[direction + ":" + name];
                if(untypedCallback && untypedCallback.apply(recipient, args) === false) {
                    return true; //Breaks if callback returns false
                }
            }
        });
    },
    _bindListeners: function() {
        var self = this;

        $.each(this.listeners, function(events, callback) {

            //Parse the event format "[view type]:[event name], [view type]:[event name]"
            $.each(events.split(','), function(i, event) {
                var eventParts = event.replace(/ /g, '').split(':');
                
                var direction = eventParts[0],
                    name      = eventParts[1],
                    viewType  = eventParts[2] || null;

                //Add the listener class
                if(direction != 'self') {
                    self.$wrapper.addClass('listener-' + direction + '-' + name + (viewType ? '-' + viewType : ''));
                }
            });
        });

        return this;
    },

    /*** Classes ***/
    _active: false,
    _subviewCssClass: 'subview',
    _addDefaultClasses: function() {
        var classes = [];

        classes.push(this._subviewCssClass + '-' + this.type);

        var superClass = this.super;
        while(true) {
            if(superClass.type) {
                classes.push(this._subviewCssClass + '-' + superClass.type);
                superClass = superClass.super;
            }
            else {
                break;
            }
        }

        //Add Default View Class
        classes.push(this._subviewCssClass);

        //Add classes to the DOM
        this.$wrapper.addClass(classes.join(' '));

        return this;
    }
};

module.exports = View;

