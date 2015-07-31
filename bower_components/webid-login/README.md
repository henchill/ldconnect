WebID Login
===========

WebID login widget using Web Components.

Runing live here: http://linkeddata.github.io/webid-login/

Quick Start for contributors
----------------------------

```
$ git clone git://github.com/linkeddata/webid-login
$ cd webid-login
$ sudo npm -g install bower
$ bower install
```

Using the component
-------------------

To use this particular component, you only need to include the minified version of the webcomponents script together with the corresponding component code, and then use the html tag in your page. Here is an example (replace with the actual version of the webcomponents.js script, e.g. 0.5.2):

```
<html>
<head>
	<script src="//cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/<version>/webcomponents.min.js"></script>
	<link rel="import" href="bower_compoments/webid-login/webid-login.html">
</head>
<body>
	<webid-login></webid-login>
</body>
</html>
```

The login component currently authenticates users through WebID-TLS. Once the authentication has been performed, a CustomEvent function is used to trigger and propagate the auth outcome to the parent window. Here is the structure of the *WebIDAuth* event object:

```
WebIDAuth : { details: { 
						auth: string, // type of auth method (i.e. WebID-TLS)
						success: bool, // true if auth was successful
						user: string // the WebID of the user
					}
			}
```


To listen to the event, one can add a very simple event listener in the document that uses the login component (replace with the actual version of the webcomponents.js script, e.g. 0.5.2):

```
<html>
<head>
	<script src="//cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/<version>/webcomponents.min.js"></script>
	<link rel="import" href="bower_components/webid-login/webid-login.html">
</head>
<body>
	<webid-login></webid-login>
	<script>
		// Listen to WebIDAuth events
		window.addEventListener('WebIDAuth',function(e) {
			console.log(e.detail);
			if (e.detail.success === true) {
				console.log("Auth successful! WebID: "+e.detail.user);
			} else {
				console.log("Auth failed!");
				console.log(e.detail);
			}
		},false);
	</script>
</body>
</html>
```

Logging in through an iframe
----------------------------

In case you do not want to mess with Web Components, you can load the Login/Signup as a widget in an "trusted" &lt;iframe&gt; element:

```
<iframe class="text-center" src="https://linkeddata.github.io/webid-login/?ref=ORIGIN" sandbox="allow-same-origin allow-scripts allow-forms" frameborder="0"></iframe>
```

Do not forget to replace ***ORIGIN*** with the value of your app's origin. (e.g. from `window.location.origin`). The widget requires the origin of the app that is requesting the authentication process in order to be able to send events.

If the authentication was successful, the &lt;iframe&gt; will send an event to the parent window, for which your app needs to listen. For instance, you could add the following bit of code to your app:

```
// Event listener for login (from child iframe)
var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventListener = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

// Listen to message from child window
eventListener(messageEvent,function(e) {
  if (e.data.slice(0,5) == 'User:') {
    // the URI of the user (currently either http* or dns:* values)
    var user = e.data.slice(5, e.data.length);
    if (user.slice(0, 4) == 'http') {
      // we have an HTTP URI (probably a WebID), do something with the user variable
      // i.e. app.login(user);
      
      /*** app code ***/

    } else if (user.slice(0, 3) == 'dns') {
      // we have a dns: user (failed authentication or no client certificate)
      // Tell the user they might need to signup for a WebID

      /*** app code ***/
    
    } else {
      // not supported?
    }
  }
},false);
```




