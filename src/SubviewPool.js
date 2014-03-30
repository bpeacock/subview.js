var $ = require("unopinionate").selector;

var SubviewPool = function(Subview) {
    //Configuration
    this.Subview    = Subview;
    this.type       = Subview.prototype.type;
    this.super      = Subview.prototype.super;
    
    //View Configuration
    this.Subview.prototype.pool = this;

    //Pool
    this.pool = [];
};

SubviewPool.prototype = {
    isSubviewPool: true,
    spawn: function(el, config) {
        //jQuery normalization
        var $el = el ? (el.jquery ? el : $(el)): null;
        el = el && el.jquery ? el[0] : el;

        //Argument surgery
        if(el && el.view) {
            return el.view;
        }
        else {
            var view;
            config = config || ($.isPlainObject(el) ? el : undefined);
            
            //Get the DOM node
            if(!el || !el.nodeType) {
                if(this.pool.length !== 0) {
                    view = this.pool.pop();
                }
                else {
                    el = document.createElement(this.Subview.prototype.tagName);
                    $el = $(el);
                }
            }

            var isNewView;
            if(!view) {
                isNewView   = true;
                view        = new this.Subview();

                //Bind to/from the element
                el[subview._domPropertyName] = view;
                view.wrapper  = el;
                view.$wrapper = $el;

                view._addDefaultClasses();
                view._bindListeners();
                view._loadExtensions();

                view.once();
            }
            
            //Make the view active
            view.active = true;

            //Render
            if(isNewView || view.reRender) {
                view.render();
            }

            //Initialize
            view.init(config);

            return view;
        }
    },
    extend: function(name, config) {
        return subview(name, this, config);
    },
    destroy: function() {
        this.pool = null;
        delete subview.Subviews[this.type];
    },

    _release: function(view) {
        view.active = false;
        this.pool.push(view);
        return this;
    }
};

module.exports = SubviewPool;
