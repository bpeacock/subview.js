---
title:      Subview API
categories: section
---

The core of Subview.js is the definition of `subview`s which are reusable view modules. Calling `subview()` is used to define a `subview`, and a `SubviewPool` object is returned. The `SubviewPool` represents a `subview` template and instances of subviews are created by calling the `SubviewPool.spawn()` method.

Subview.js consists of three objects:

- The `subview`