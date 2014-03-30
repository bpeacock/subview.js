var log = require('loglevel'),
    noop = function() {};

var Subview = function() {};

Subview.prototype = {
    isSubview: true,

    /*** Life-Cycle ***/

    //These should be configured but will be pushed to their respective function stacks rather than overwriting
    once: function(config) { //Runs after render
        for(var i=0; i<this._onceFunctions.length; i++) {
            this._onceFunctions[i].apply(this, [config]);
        }
        return this;
    }, 
    _onceFunctions: [],
    init: function(config) { //Runs after render
        for(var i=0; i<this._initFunctions.length; i++) {
            this._initFunctions[i].apply(this, [config]);
        }
        return this;
    },
    _initFunctions: [],
    clean: function() { //Runs on remove
        for(var i=0; i<this._cleanFunctions.length; i++) {
            this._cleanFunctions[i].apply(this, []);
        }
        return this;
    }, 
    _cleanFunctions: [],

    //Static methods and properties
    active: false,

    remove: function() {
        if(this.active) {
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


    /*** Templating ***/

    template:   "",

    //Data goes into the templates and may also be a function that returns an object
    data:       {},

    //Subviews are a set of subviews that will be fed into the templating engine
    subviews:   {},

    //Settings
    reRender:   false, //Determines if subview is re-rendered every time it is spawned
    tagName:    "div",
    className:  "",

    //Events
    preRender:  noop,
    postRender: noop,

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
            var $postLoads = this.$wrapper.find('.post-load-view'),
                i = $postLoads.length;
            
            while(i--) {
                var $postLoad = $($postLoads[i]),
                    view  = self.subviews[$postLoad.attr('data-name')];

                if(view.isSubviewPool) {
                    view = view.spawn();
                }

                $postLoad
                    .after(view.$wrapper)
                    .remove();
            }
        }

        this.postRender();

        return this;
    },
    html: function(html) {
        //Remove & clean subviews in the wrapper 
        var $subviews = this.$('.'+this._subviewCssClass),
            i = $subviews.length;

        while(i--) {
            subview($subviews[i]).remove();
        }
        
        //Empty the wrapper
        this.wrapper.innerHTML = html;

        return this;
    },

    
    /*** Events ***/

    //listeners
    listeners: {
        //'[direction]:[event name]:[from type], ...': function(eventArguments*) {}
    },

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

    //Gets called when a new Subview instance is created by the SubviewPool
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

    
    /*** Traversing ***/

    $: function(selector) {
        return this.$wrapper.find(selector);
    },
    _traverse: function(jqFunc, type) {
        var $el = this.$wrapper[jqFunc]('.' + (type ? this._subviewCssClass + '-' + type : 'subview'));
        
        if($el && $el.length > 0) {
            return $el[0][subview._domPropertyName];
        }
        else {
            return null;
        }
    },
    parent: function(type) {
        return this._traverse('closest', type);
    },
    next: function(type) {
        return this._traverse('next', type);
    },
    prev: function(type) {
        return this._traverse('prev', type);
    },
    children: function(type) {
        return this._traverse('find', type);
    },
    appendTo: function($el) {
        this.$wrapper.appendTo($el);
        return this;
    },


    /*** Classes ***/

    _subviewCssClass: 'subview',
    _addDefaultClasses: function() {
        var classes = this.className.split(' ');

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

