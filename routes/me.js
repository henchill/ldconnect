var express = require('express');
var router = express.Router();
var fetcher = ('../fetcher.js');

/* GET my information listing. */
router.get('/', function(req, res, next) {
	fetcher.getUserInformation(function(results) {
		console.log("received user information");
		console.log(results);
		res.send('respond with a resource');
	});
});

router.get('/friends', function(req, res, next) {

});

router.get('/posts', function(req, res, next) {

});

router.get('/albums', function(req, res, next) {

});

router.get('/photos', function(req, res, next) {

});
module.exports = router;
