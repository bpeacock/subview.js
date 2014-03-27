var subview     = require("../src/main.js"),
    Handlebars  = require("handlebars");

subview("main", {
    defaultState: {
        auth: true
    },
    listeners: {
        'down:auth': function(auth) {
            this.state.set('auth', auth);
        }
    },
    template: Handlebars.compile("\
This Works!!!\
{{{ subview.A }}}\
{{{ subview.B }}}"),
    subviews: {
        A: require("./subviews/ViewA"),
        B: require("./subviews/ViewB")
    }
});
