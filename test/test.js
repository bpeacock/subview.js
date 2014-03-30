var sinon   = require('sinon'),
    _       = require('underscore'),
    $       = require("unopinionate").selector,
    module  = window.module,
    subview = require('../src/main'),
    noop    = function() {},
    Handlebars = require("handlebars"),
    sandbox;

var testSubview = subview('test');

/*** subview Object ***/

module("subview");

test('subview() get view from node', function() {
    deepEqual(subview($('body')[0]), null, 'Element without bound view');
    deepEqual(subview($('body')), null, 'Jquery objects work');

    var tester = testSubview.spawn();
    deepEqual(subview(tester.wrapper), tester, 'Returns correct element');
});

test('subview() define subview', function() {
    ok(!subview('test'), "Invalid subview definition");

    var tester = subview('tester');
    ok(tester, "Subview successfully created");
    deepEqual(tester, subview.views.tester, "Subview successfully registered");

    ok(tester.super, "Super is bound to the view");

    var subTester = subview('subtester', tester);
    equal(subTester.super.type, "tester", "SubTester extends tester");

    //cleanup
    tester.destroy();
    subTester.destroy();
});

test('#lookup', function() {
    var Tester = subview('tester');

    deepEqual(subview.lookup('tester'), Tester, "String lookup");
    deepEqual(subview.lookup(Tester), Tester, "ViewPool lookup");

    var tester = Tester.spawn();
    deepEqual(subview.lookup(tester), Tester, "view lookup");

    deepEqual(subview.lookup({}), undefined, "random lookup");
    deepEqual(subview.lookup("does-not-exist"), undefined, "Undefined string lookup");

    Tester.destroy();
});

test('#_validateName', function() {
    ok(subview._validateName("Foo1"), "Base Case");
    ok(!subview._validateName("Foo%"), "Invalid characters");
    ok(!subview._validateName("test"), "Pre-existing view");
});

test('#_validateConfig', function() {
    ok(subview._validateConfig({
        init: noop
    }), "Valid Config");

    ok(!subview._validateConfig({
        init: noop,
        remove: noop
    }), "Reserved Method present");
});

test('#init', function() {
    subview('main');
    subview.init();
    ok($('.subview-main').length, "The main view is added to the document");
});

test('#extension', function() {
    var Extension = subview.extension({
        foo: noop
    });

    var ExtensionFactory = Extension('config');
    ok($.isFunction(ExtensionFactory), "Extension Factory Created");

    ok(ExtensionFactory._isSubviewExtension, "Has extension identifier attribute");

    var extension = ExtensionFactory('view');
    ok(extension, "Extension initialized.");
    ok($.isFunction(extension.foo), "Extension has method foo");
    equal(extension.view, 'view', "View is bound to the extension");
    equal(extension.config, 'config', "Config is bound to the extension");
});

/*** ViewPool ***/
var viewPool;
module("ViewPool", {
    setup: function() {
        sandbox = sinon.sandbox.create();
        viewPool = subview("tester");
    },
    teardown: function() {
        viewPool.destroy();
    }
});

test("#isViewPool", function() {
    ok(viewPool.isViewPool);
});

test("#spawn", function() {
    var view = viewPool.spawn();
    ok(view, "View created");

    var $div = $("<div>");
    view = viewPool.spawn($div[0]);
    deepEqual(view.wrapper, $div[0], "Elements passed to spawn become the wrapper");

    $div = $("<div>");
    view = viewPool.spawn($div);
    deepEqual(view.wrapper, $div[0], "jQuery elements passed to spawn become the wrapper");

    var sameView = viewPool.spawn($div);
    deepEqual(view, sameView, "Returns existing view when the same element is passed back");

    //Test that configuration gets passed to init function
    var initSpy   = sinon.spy(),
        config    = {test: 1},
        pool      = subview("anotherPool", {
            init: initSpy
        });


    pool.spawn($("<div>"), config);
    ok(initSpy.calledWith(config), "Config with jquery works");
    initSpy.reset();

    pool.spawn($("<div>")[0], config);
    ok(initSpy.calledWith(config), "Config with DOM works");
    initSpy.reset();

    pool.spawn(config);
    ok(initSpy.calledWith(config), "Config with no element works");

    pool.destroy();

});

test("#extend", function() {
    var subTester = viewPool.extend('subTester');
    equal(subTester.super.type, "tester", "SubTester extends tester");
    subTester.destroy();
});

test("#destroy", function() {
    viewPool.destroy();
    ok(subview("tester"), "Namespace is freed");
    ok(!viewPool.pool, "Pool is set to null to free RAM");
});

test("#_release", function() {
    var view = viewPool.spawn();
    deepEqual(viewPool.pool.length, 0, "Pool is empty");

    viewPool._release(view);
    deepEqual(viewPool.pool.length, 1, "Pool has one view in it");
});


/*** View ***/
module("View", {
    setup: function() {
        sandbox = sinon.sandbox.create();
    }
});

test("Initialization Process", function() {
    var onceSpy     = sinon.spy(),
        renderSpy   = sinon.spy(),
        initSpy     = sinon.spy();

    var viewPool = subview("tester", {
        once:   onceSpy,
        init:   initSpy,
        render: renderSpy
    });

    viewPool.spawn();

    ok(onceSpy.called, "once called");
    ok(renderSpy.called, "render called");
    ok(initSpy.called, "init called");

    ok(onceSpy.calledBefore(renderSpy), "config fires before render");
    ok(renderSpy.calledBefore(initSpy), "render fires before init");

    viewPool.destroy();
});

test("#html", function() {
    var Subtest = subview("subtest"),
        subtest = Subtest.spawn();

    var Tester = subview("tester", {
            template: Handlebars.compile("{{{ subview.subtest }}}"),
            subviews: {
                subtest: subtest
            }
        }),
        tester = Tester.spawn();

    ok(subtest._active, "Subtest is active");

    tester.html('Hello There');

    ok(!subtest._active, "Subtest is inactive");
    equal(tester.$wrapper.html(), 'Hello There', "Html is set");

    Subtest.destroy();
    Tester.destroy();
});

test("#remove", function() {
    var clean = sinon.spy(),
        Test = subview("tester", {
            clean: clean
        }),
        test = Test.spawn();

    test.$wrapper.appendTo('body');

    ok($('.subview-tester').length, "view in the page");
    ok(test._active, "view is active");

    test.remove();

    ok(!$('.subview-tester').length, "view removed from page");
    ok(!test._active, "view is inactive");
    ok(clean.called, "The clean function was called");

    Test.destroy();
});

test("#$", function() {
    var test = testSubview.spawn();
    test.$wrapper.appendTo('body');

    test.html("<div class='scoped-jquery-test'></div>");
    $("<div class='scoped-jquery-test'></div>").appendTo('body');

    equal($('.scoped-jquery-test').length, 2, "Two test elements created");
    equal(test.$('.scoped-jquery-test').length, 1, "The one child element is selected");
});

test("#traverse", function() {
    var Subtest = subview("subtest"),
        subtest = Subtest.spawn();

    var Tester = subview("tester", {
            template: Handlebars.compile("{{{ subview.subtest }}}"),
            subviews: {
                subtest: subtest
            }
        }),
        tester = Tester.spawn();

    deepEqual(subtest.traverse('closest', 'tester'), tester, "Works with closest");
    deepEqual(subtest.traverse('closest', 'this-does-not-exist'), null, "does not exist");

    Subtest.destroy();
    Tester.destroy();
});

/*
test("#parent", function() {

});

test("#next", function() {

});

test("#prev", function() {

});

test("#children", function() {

});
*/

test('#appendTo', function() {
    var $div = $("<div>").appendTo('body');

    var view = testSubview.spawn();
    view.appendTo($div);

    deepEqual(subview($div.find('.subview-test')), view, "Subview appended");
});

test('#trigger/#_bindListeners', function() {
    var allEvent1           = sinon.spy(),
        upEvent1            = sinon.spy(),
        upEvent1Scoped      = sinon.spy(),
        upEvent1WrongScope  = sinon.spy(),
        unEvent1NoEvent     = sinon.spy(),
        selfEvent1          = sinon.spy(),
        downEvent2          = sinon.spy(),
        acrossEvent2        = sinon.spy();

    var Subtest = subview("subtest", {
            listeners: {
                "down:noEvent, all:event1": allEvent1,
                "up:event1":                upEvent1,
                "up:event1:tester":         upEvent1Scoped,
                "up:event1:wrongScope":     upEvent1WrongScope,
                "up:noEvent":               unEvent1NoEvent,
                "across:event2":            acrossEvent2
            }
        }),
        subtest  = Subtest.spawn(),
        subtest2 = Subtest.spawn();

    var Tester = subview("tester", {
            template: Handlebars.compile("{{{ subview.subtest }}}{{{ subview.subtest2 }}}"),
            subviews: {
                subtest: subtest,
                subtest2: subtest2
            },
            listeners: {
                "self:event1": selfEvent1,
                "down:event2": downEvent2
            }
        }),
        tester = Tester.spawn();

    tester.$wrapper.appendTo('body');

    //Event 1
    tester.trigger('event1');
    ok(allEvent1.called,            "All Event1 Called");
    ok(upEvent1.called,             "Up Event1 Called");
    ok(upEvent1Scoped.called,       "Scoped Up Event1 Called");
    ok(!upEvent1WrongScope.called,  "Wrong Scope Up Event1 Not Called");
    ok(!unEvent1NoEvent.called,     "Non-triggered event handler not called");
    ok(selfEvent1.called,           "Self Event1 Called");

    //Event 2
    subtest.trigger('event2');
    ok(downEvent2.called,   "Down Event Called");
    ok(acrossEvent2.called, "Across Event Called");

    //Cleanup
    tester.remove();
    Subtest.destroy();
    Tester.destroy();
});

test("#_addDefaultClasses", function() {
    var view = testSubview.spawn();

    view._addDefaultClasses();

    var classes = view.$wrapper[0].className.split(' ');

    ok(classes.indexOf("subview-test") !== -1, "Includes view-test");
    ok(classes.indexOf("subview") !== -1, "Includes view");
});

test("#_loadExtensions", function() {
    var extension = subview.extension({
            foo: 'bar',
            init: function(config, view) {
                ok(this.view, "View object is available");
                equal(this.view, view, "this.view == view argument");
                equal(config.hi, 'there', "hi equals there");
                deepEqual(this.config, config, "this.config == config argument");
            }
        }),
        Tester = subview("tester", {
            extension: extension({
                hi: 'there'
            })
        }),
        tester = Tester.spawn();

    equal(tester.extension.foo, 'bar', "Extension attribute applied");

    Tester.destroy();
});

/*** View Rendering ***/

var setHtml;
module("View #render", {
    setup: function() {
        setHtml = sinon.spy();
    }
});

test("String Template", function() {
    var viewPool = subview("tester", {
        template:   "This is a string"
    });

    var view = viewPool.spawn();

    equal("This is a string", view.$wrapper.html(), "Content matches");

    viewPool.destroy();
});

test("Handlebars Template", function() {
    var viewPool = subview("tester", {
        template: Handlebars.compile("<div class='handlebars-test'>{{ test }}</div>{{{ subview.test }}}"),
        data: {
            test: "Hi"
        },
        subviews: {
            test: testSubview
        }
    });

    var view = viewPool.spawn();

    ok(view.$('.subview-test').length, "subview spawned correctly");

    var $handlebarsTest = view.$('.handlebars-test');
    ok($handlebarsTest.length, "Div element created");
    equal($handlebarsTest.html(), 'Hi', "Div created with correct content");

    viewPool.destroy();
});

test("Underscore Template", function() {
    var viewPool = subview("tester", {
        template: _.template("<div class='underscore-test'><%= test %></div><%= subview.test %>"),
        data: {
            test: "Hi"
        },
        subviews: {
            test: testSubview
        }
    });

    var view = viewPool.spawn();

    ok(view.$('.subview-test').length, "subview spawned correctly");

    var $handlebarsTest = view.$('.underscore-test');
    ok($handlebarsTest.length, "Div element created");
    equal($handlebarsTest.html(), 'Hi', "Div created with correct content");
    
    viewPool.destroy();
});

test("Pre/Post Render", function() {
    var preRender = sinon.spy(),
        postRender = sinon.spy();

    var Tester = subview("tester", {
        preRender: preRender,
        postRender: postRender
    });

    Tester.spawn();

    ok(preRender.called, "preRender called");
    ok(postRender.called, "postRender called");
});

