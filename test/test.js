var sinon   = require('sinon'),
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
    
});


