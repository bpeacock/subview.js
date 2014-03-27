var subview = require("../../src/main.js");

module.exports = subview("A", {
    postRender: function() {
        var self = this;

        console.log("INIT");
        console.log($('.signin'));

        this.$('.signin').click(function() {
            console.log("HERE");
            self.trigger('auth', [true]);
        });

        this.$('.signout').click(function() {
            self.trigger('auth', [false]);
        });
    },
    template: "\
This is view A!\
<button class='signin'>Sign In</button>\
<button class='signout'>Sign Out</button>"
});