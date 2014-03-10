var sinon   = require('sinon'),
    _       = require('underscore'),
    $       = require("unopinionate").selector,
    module  = window.module,
    subview = require('../src/main'),
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

test('#load', function() {
    var $tester = $("<div class='view-test'>").appendTo('body');
    subview.load();
    ok(subview($tester), "View was successfully created");

    var $tester2 = $("<div class='view-test'>").appendTo('body');
    subview.load('body');
    ok(subview($tester2), "Scoped loading was successful");
});

test('#_validateName', function() {
    ok(subview._validateName("Foo1"), "Base Case");
    ok(!subview._validateName("Foo%"), "Invalid characters");
    ok(!subview._validateName("test"), "Pre-existing view");
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
    var configSpy   = sinon.spy(),
        renderSpy   = sinon.spy(),
        initSpy     = sinon.spy();

    var viewPool = subview("tester", {
        init:   initSpy,
        render: renderSpy,
        config: configSpy
    });

    viewPool.spawn();

    ok(configSpy.called, "config called");
    ok(renderSpy.called, "render called");
    ok(initSpy.called, "init called");

    ok(configSpy.calledBefore(renderSpy), "config fires before render");
    ok(renderSpy.calledBefore(initSpy), "render fires before init");

    viewPool.destroy();
});

test("#render", function() {

});

test("#html", function() {

});

test("#remove", function() {

});

test("#_getClasses", function() {
    var view = testSubview.spawn(),
        classes = view._getClasses();

    ok(classes.indexOf("view-test") !== -1, "Includes view-test");
    ok(classes.indexOf("view") !== -1, "Includes view");
});

test("#_setClasses", function() {
    var view = testSubview.spawn();

    view._setClasses(['foo', 'bar']);
    var classes = view._getClasses();

    deepEqual(classes.length, 2, "Right number of classes");
    ok(classes.indexOf('foo') !== -1, "Includes foo");
    ok(classes.indexOf('bar') !== -1, "Includes bar");
});

test("#_addDefaultClasses", function() {
    var view = testSubview.spawn();

    view
        ._setClasses([])
        ._addDefaultClasses();

    var classes = view._getClasses();

    ok(classes.indexOf("view-test") !== -1, "Includes view-test");
    ok(classes.indexOf("view") !== -1, "Includes view");
});



/*** State ***/

module("State", {
    setup: function() {
        sandbox = sinon.sandbox.create();
    },
    teardown: function() {

    }
});

test("#set", function() {

});

test("#get", function() {

});

test("#remove", function() {

});

test("#bind", function() {

});

test("#unbind", function() {

});

test("#trigger", function() {

});

test("#askParent", function() {

});

test("#tellParent", function() {

});

test("#listen", function() {

});

test("#_hear", function() {

});

test("#_update", function() {

});

test("#_setDefaults", function() {

});

test("#_getStateClasses", function() {

});

test("#_getStateClass", function() {

});

test("#_setStateClass", function() {

});

test("#_removeStateclass", function() {

});

