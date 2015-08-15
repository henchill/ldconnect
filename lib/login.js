// From LDNode https://github.com/linkeddata/ldnode/

/*jslint node: true*/
"use strict";

var debug = require('./logging').login;
var constants = require('./constants.js');
var fs = require('fs');
var path = require('path');
var webid = require("webid");
var fetcher = require("./fetcher.js");
var session_info = require("./session_info.js");
var user_info = require("./user_info.js");

var loginHandler = function(req, res, next) {
	var setEmptySession = function(req) {
		req.session.userId = "";
		req.session.identified = false;
		req.session.fbid = "";
	}

	if (!req.session.userId) {
		setEmptySession(req);
	}

	if (req.session.userId && req.session.identified) {
		debug("User: " + req.session.userId);
		res.set("User", req.session.userId);
		restoreSessionInfo(req.session.userId);
		return next();
	} else {
		var certificate = req.connection.getPeerCertificate();
		if (!(certificate === null || Object.keys(certificate).length === 0)) {
			var verifAgent = new webid.VerificationAgent(certificate);
			verifAgent.verify(function(err, result) {
				if (err) {
					var message;
					switch (err) {
						case 'certificateProvidedSAN':
		                    message = 'No valide Certificate Alternative Name in your certificate';
		                    break;
		                case 'profileWellFormed':
		                    message = 'Can\'t load your foaf file (RDF may not be valid)';
		                    break;
		                case 'falseWebID':
		                    message = 'Your certificate public key is not the one of the FOAF file';
		                    break;
		                case 'profileAllKeysWellFormed':
		                    message = "Missformed WebID";
		                    break;
		                default:
		                    message = "Unknown WebID error";
		                    break;
					}
					debug("Error processing certificate: " + message);
	                setEmptySession(req);
	                return res.status(403).send(message);
	            } else {
	                req.session.userId = result;
	                req.session.identified = true;

	                fetcher.getProfileFromWebid(result, function(info) {
	                	// if (!) {
	                	// 	return res.status(403).send("Could not fetch preferencesfile");
	                	// }
	                	debug(info);
	                	req.session.preferencesfile = info.preferencesfile;
	                	session_info.newSession(result, {
	                		preferencesfile: info.preferencesfile
	                	});
	                	debug("Identified user: " + req.session.userId);
		                res.set('User', req.session.userId);
		                restoreSessionInfo(req.session.userId);
		                return next();
	                });
	            }
			});
		}
	}	
}

var restoreSessionInfo = function(userId) {
	if (user_info.getInfo(userId, "config")
		&& !session_info.getProperty(userId, "access_token")) {
		// read access token from file. 
		fetcher.getConfig({
			configurl: user_info.getInfo(userId, "config"),
			fields: ["access_token"]
		}, function (results) {
			session_info.updateSession(userId, {
				access_token: results.access_token
			});
		});
	}
}

exports.loginHandler = loginHandler;

