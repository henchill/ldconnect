var express = require('express');
var router = express.Router();
var getRawBody = require('raw-body');
var cors = require("cors");

var fetcher = ('../lib/fetcher.js');
var login = require('../lib/login.js');

var get = require('../lib/handlers/get.js');
var post = require('../lib/handlers/post.js');
var debug = require("../lib/logging").mainrouter;
// var deleteHandler = require('./handlers/delete.js');

router.use(cors({
    methods: ['GET', 'POST'],
    exposedHeaders: 'User, Location, Link, Vary, Last-Modified, Content-Length',
    credentials: true,
    maxAge: 1728000,
    origin: true
}));

router.use('/*', function(req, res, next) {
	getRawBody(req, {
		length: req.headers['content-length'],
		limit: '1mb',
		encoding: 'utf-8' // typer.parse(req.headers['content-type']).parameters.charset
	}, function(err, string) {
		if (err) {
			return next(err);
		}
		req.text = string;

		next();
	});
});

router.use('/*', login.loginHandler);

router.get('/*', get.getHandler);
router.post('/*', post.handler);
// router.delete('/*', deleteHandler);

module.exports = router;
