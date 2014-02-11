var State = require("./State");

var ViewPool = function(View) {
    //Configuration
    this.View   = View;
    this.type   = View.prototype.type;
    this.super  = View.prototype.super;
    this.template = "<"+this.View.prototype.tag+" class='"+this.View.prototype._viewCssPrefix + this.View.prototype.type+"'></"+this.View.prototype.tag+">";

    //View Configuration
    this.View.prototype.pool = this;

    //Pool
    this.pool = [];
};

ViewPool.prototype = {
    spawn: function(el) {
        if(el && el.view) {
            return el.view;
        }
        else {
            if(!el) {
                if(pool.length !== 0) {
                    return pool.pop();
                }
                else {
                    el = document.createElement(this.View.prototype.tag);
                }
            }
            
            view = el.view = new this.View();
            view.el = el;
            view._addDefaultClasses();

            //Add view State
            view.state = new State(view, view.state);

            //Render
            view
                .render()
                .init();

            return view;
        }
    },
    subview: function(name, config) {
        return subview(name, this, config);
    },

    _release: function(view) {
        this.pool.push(view);
        return this;
    }
};

module.exports = ViewPool;
