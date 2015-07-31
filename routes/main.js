var express = require('express');
var router = express.Router();
var getRawBody = require('raw-body');

var fetcher = ('../fetcher.js');
var login = require('./login.js');

var get = require('./handlers/get.js');
var post = require('./handlers/post.js');
// var deleteHandler = require('./handlers/delete.js');

router.use('/*', function(req, res, next) {
    getRawBody(req, {
		length: req.headers['content-length'],
		limit: '1mb',
		encoding: 'utf-8' // typer.parse(req.headers['content-type']).parameters.charset
	}, 
	function(err, string) {
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
