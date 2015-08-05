// From LDNode https://github.com/linkeddata/ldnode/

/*jslint node: true*/
"use strict";

var webid = require('webid');
var debug = require('./logging').login;
var constants = require('./constants.js');
var fs = require('fs');
var path = require('path');

var loginHandler = function(req, res, next) {
	var setEmptySession = function(req) {
		req.session.userId = "";
		req.session.identified = false;
	}

	if (!req.session.fbid) {
		setEmptySession(req);
	}

	console.log(req.path);
	if (req.path !== "/facebook_token"
		&& req.path !== "/test") {
		console.log("executing readfile");
		// setEmptySession(req);
		req.session.fbid = "102751230077034";
		req.session.access_token = fs.readFileSync(path.join(constants.TOKENS_DIR, req.session.fbid), 'utf8');
	}

	next();
	// var options = req.app.locals.ldp;
	// if (!options.webid) {
	//     setEmptySession(req);
	//     return next();
	// }
	// if (req.session.userId && req.session.identified) {
	//     debug("User: " + req.session.profile);
	//     res.set('User', req.session.userId);
	//     return next();
	// } else {
	//     var certificate = req.connection.getPeerCertificate();
	//     if (!(certificate === null || Object.keys(certificate).length === 0))  {
	//         var verifAgent = new webid.VerificationAgent(certificate);
	//         verifAgent.verify(function(err, result) {
	//             if (err) {
	//                 var message;
	//                 switch (err) {
	//                 case 'certificateProvidedSAN':
	//                     message = 'No valide Certificate Alternative Name in your certificate';
	//                     break;
	//                 case 'profileWellFormed':
	//                     message = 'Can\'t load your foaf file (RDF may not be valid)';
	//                     break;
	//                 case 'falseWebID':
	//                     message = 'Your certificate public key is not the one of the FOAF file';
	//                     break;
	//                 case 'profileAllKeysWellFormed':
	//                     message = "Missformed WebID";
	//                     break;
	//                 default:
	//                     message = "Unknown WebID error";
	//                     break;
	//                 }
	//                 debug("Error processing certificate: " + message);
	//                 setEmptySession(req);
	//                 return res.status(403).send(message);
	//             } else {
	//                 req.session.userId = result;
	//                 req.session.identified = true;
	//                 debug("Identified user: " + req.session.userId);
	//                 res.set('User', req.session.userId);
	//                 return next();
	//             }
	//         });
	//     } else {
	//         debug("Empty certificate");
	//         setEmptySession(req);
	//         next();
	//     }
	// }

	
}

exports.loginHandler = loginHandler;