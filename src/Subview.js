var log = require('loglevel'),
    noop = function() {};

var Subview = function() {};

Subview.prototype = {
    isSubview: true,

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
        return this;
    }, 
    onceFunctions: [],
    init: function(config) { //Runs after render
        for(var i=0; i<this.initFunctions.length; i++) {
            this.initFunctions[i].apply(this, [config]);
        }
        return this;
    }, 
    initFunctions: [],
    clean: function() { //Runs on remove
        for(var i=0; i<this.cleanFunctions.length; i++) {
            this.cleanFunctions[i].apply(this, []);
        }
        return this;
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
            if($.isFunction(this.template)) {
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

                if(view.isSubviewPool) {
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
        this.$('.'+this._subviewCssClass).each(function() {
            subview(this).remove();
        });

        this.wrapper.innerHTML = html;

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

    /*** Traversing ***/
    traverse: function(jqFunc, type) {
        var $el = this.$wrapper[jqFunc]('.' + (type ? this._subviewCssClass + '-' + type : 'subview'));
        
        if($el && $el.length > 0) {
            return $el[0][subview._domPropertyName];
        }
        else {
            return null;
        }
    },
    parent: function(type) {
        return this.traverse('closest', type);
    },
    next: function(type) {
        return this.traverse('next', type);
    },
    prev: function(type) {
        return this.traverse('prev', type);
    },
    children: function(type) {
        return this.traverse('find', type);
    },
    appendTo: function($el) {
        this.$wrapper.appendTo($el);
        return this;
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
            all:    null,
            self:   this.$wrapper
        };

        $.each(directions, function(direction, jqFunc) {
            var selector = '.listener-'+direction+'-'+name;
            selector = selector + ', ' + selector+'-'+self.type;

            //Select $wrappers with the right listener class in the right direction
            var $els = jqFunc ? 
                            jqFunc.jquery ? jqFunc :
                                self.$wrapper[jqFunc](selector) : $(selector);

            for(var i=0; i<$els.length; i++) {
                //Get the actual subview
                var recipient = subview($els[i]);

                //Check for a subview type specific callback
                var typedCallback = recipient.listeners[direction + ":" + name + ":" + self.type];
                if(typedCallback && typedCallback.apply(recipient, args) === false) {
                    return false; //Breaks if callback returns false
                }

                //Check for a general event callback
                var untypedCallback = recipient.listeners[direction + ":" + name];
                if(untypedCallback && untypedCallback.apply(recipient, args) === false) {
                    return false; //Breaks if callback returns false
                }
            }
        });
        
        return this;
    },
    _bindListeners: function() {
        var self = this;

        $.each(this.listeners, function(events, callback) {

            //Parse the event format "[view type]:[event name], [view type]:[event name]"

            events = events.split(',');
            var i = events.length;

            while(i--) {
                var event       = events[i].replace(/ /g, ''),
                    eventParts  = event.split(':');
                
                var direction = eventParts[0],
                    name      = eventParts[1],
                    viewType  = eventParts[2] || null;
                
                //Add the listener class
                if(direction != 'self') {
                    self.$wrapper.addClass('listener-' + direction + '-' + name + (viewType ? '-' + viewType : ''));
                }

                //Fix the listeners callback
                self.listeners[event] = callback;
            }
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
    },

    /*** Extensions ***/
    _loadExtensions: function() {
        var self = this;
        $.each(this, function(name, prop) {
            if(prop._isSubviewExtension) {
                self[name] = prop(self);
            }
        });
        return this;
    }
};

module.exports = Subview;

