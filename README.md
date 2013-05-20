app.js - mobile webapps made easy
=================================

App.js is a lightweight JavaScript UI library for creating mobile webapps that behave like native apps, sacrificing neither performance nor polish.

* cross-platform (Android 2.2+, iOS 4.3+)
* themable platform-specific UI designs
* configurable native-like transitions
* automatically managed navigation stack
* built-in widgets for general use-cases

The goal of App.js is to provide a robust starting point for mobile webapps, handling general scenarios, and maintaining compatiblity with other common JavaScript libraries.



[Interactive Documentation](http://code.kik.com/app/)
-------------------------



API Reference
-------------


### Page creation

### `App.add(name, node)`

Add an HTML element as a template for creation of pages of the specified name. *Note: this function is not called in normal cases and templates should normally be specified in your HTML body.*

### `App.populator`

//TODO

### `App.generate`

//TODO

### `App.destroy`

//TODO


### Navigation

### `App.load`

//TODO

### `App.back`

//TODO


### Transitions

### `App.setDefaultTransition`

//TODO

### `App.getDefaultTransition`

//TODO

### `App.getReverseTransition`

//TODO


### Stack management

### `App.current`

//TODO

### `App.restore`

//TODO

### `App.saveStack`

//TODO

### `App.destroyStack`

//TODO

### `App.removeFromStack`

//TODO

### `App.addToStack`

//TODO

### `App.getStack`

//TODO

### `App.getPage`

//TODO


### Utilities

### `App.dialog`

//TODO

### `App.platform`

//TODO

### `App.platformVersion`

//TODO

### `App.enableGoogleAnalytics`

//TODO
