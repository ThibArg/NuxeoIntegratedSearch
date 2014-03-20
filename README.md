NuxeoIntegratedSearch
=====================


A chrome extension which queries for picturs in a nuxeo server, based on the keywords of the current Google search page.

*WARNING*: This is a R&D project.

###Install:

* Open the Chrome://extensions panel (from the preferences)
* At the top right, activate the developer mode
* Then select "Load unpcked extension..." and select this NuxeoIntegratedSearch folder


###Usage

* Go on a google search page (google.com, or images.google.com for example
* Enter keywordsand search with Google
* A new icon is displayed in the address bar (the head of a frog)
* Click this icon:
  * Enter the URL and credentials to connect to your nuxeo server
  * If you don't want to enter the info everytime, click the "remember me" box
  * Save
  * You can also go to the "Result" tab and see the pictures displayed.
  * A click on a thumbnail opens the document in nuxeo.


###Note

* This code does not use all the new/recent wonderful REST APIs of Nuxeo, so it could be made even more awesome ;-)
* Also, I had a problem displaying the thumbnails of the pictures, and did not dig into it after finding a ugly workaround where the thumbnails are queried until there is no error.
* Yes.
* This is bad


_License: MIT, "Do whatever You Want With the Source Code"_



### About Nuxeo

Nuxeo provides a modular, extensible Java-based [open source software platform for enterprise content management](http://www.nuxeo.com/en/products/ep) and packaged applications for [document management](http://www.nuxeo.com/en/products/document-management), [digital asset management](http://www.nuxeo.com/en/products/dam) and [case management](http://www.nuxeo.com/en/products/case-management). Designed by developers for developers, the Nuxeo platform offers a modern architecture, a powerful plug-in model and extensive packaging capabilities for building content applications.

More information on: <http://www.nuxeo.com/>
