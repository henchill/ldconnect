var express = require('express');
var router = express.Router();
var util = require('util');
var request = require('request');
var httpProxy = require('http-proxy');
var http = require('http');
var https = require('https');
var concat = require('concat-stream');
var qs = require('querystring');

var proxy = httpProxy.createProxyServer({target: 'http://localhost:3000'}).listen(8000);

var fetcher = require('../fetcher.js');

var app_id = "1464644210500554";
var app_secret = "0836595aea322fb61649ec69a60d0cb5";

var loggedin = function(req, res, next) {
	if (req.session.authenticated) {
		next();
	} else {
		res.redirect('/');
	}
}

/* GET home page. */
router.get('/', function(req, res, next) {
	console.log("calling get home");
	console.log(req.session);
	if (req.session.authenticated) {
		res.render('index', { title: 'LDConnect', webid: req.session.profile.webid});	
	} else {
		res.render('index', {title: 'LDConnect'});
	}
});

router.post("/", function(req, res, next) {
	console.log(req.session);
	if (req.body.success === "true") {
		var fburl = "https://www.facebook.com/dialog/oauth?client_id=%s&redirect_uri=%s";
		var redirecturl = "http://local.happynchill.in:3000/receive_code";
		var fbredirect = util.format(fburl, app_id, redirecturl);

		req.session.authenticated = true;
		req.session.profile = {
			webid: req.body.user,
		};

		fetcher.getProfileFromWebid(req.body.user, function(info) {
			console.log(info)
			for (var property in info) {
				if (info.hasOwnProperty(property)) {
					req.session.profile[property] = info[property].value;
				}
			}
		});
		
		res.setHeader('Content-Type', 'application/json');
		res.send({redirect: fbredirect});
	} else {
		console.log("check failed");
		res.render('index', {title: 'LDConnect'});
	}
});

router.get('/signup', function(req, res, next) {
	res.render('signup');
});

router.all('/receive_code', loggedin, function(req, res, next) {
	console.log("accepting facebook login");
	console.log(req.query);
	console.log(req.session);

	// if (req.session.profile) {
	// 	req.session.profile.authcode = req.query.code;	
	// }

	if (req.query.code) {
		var query = {
			client_id: fetcher.app_id,
			redirect_uri: "http://local.happynchill.in:3000/receive_code",
			client_secret: fetcher.app_secret,
			code: req.query.code
		}

		https.get({
			hostname: 'graph.facebook.com',
			path: '/v2.3/oauth/access_token?'+ qs.stringify(query), 
		}, function(res) {
			console.log("response received");
			res.pipe(concat(function(body) {
	            // Data reception is done, do whatever with it!
	            var parsed = JSON.parse(body);
	            console.log(parsed);
	            req.session.profile.access_token = parsed.access_token;
	            res.redirect('/me');
	        }));
			
		});
	} 
});

router.all('/receive_access_token', loggedin, function(req, res, next) {
	console.log("recieve access token");
	console.log(req.query);
	res.redirect('/');
});


module.exports = router;
