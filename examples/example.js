var subview     = require("../src/main.js"),
    Handlebars  = require("handlebars");

subview("main", {
    listeners: {
        'down:auth': function(auth) {
            if(auth) {
                self.$wrapper
                    .removeClass('state-auth-false')
                    .addClass('state-auth-true');
            }
            else {
                self.$wrapper
                    .addClass('state-auth-false')
                    .removeClass('state-auth-true');
            }
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
