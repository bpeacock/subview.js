var subview     = require("../src/main.js"),
    Handlebars  = require("handlebars");

//subview.Mustache = Mustache;

subview("app", {
    init: function() {
        
    },
    template: Handlebars.compile("\
This Works!!!\
{{{ subview.A }}}\
{{{ subview.B }}}"),
    subviews: {
        A: require("./subviews/ViewA"),
        B: require("./subviews/ViewB")
    },
    state: {
        auth: true
    }
});

/*** Startup Actions ***/
$(function() {
    subview.load();
});

