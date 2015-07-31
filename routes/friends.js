var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/:friend_id', function(req, res, next) {

});

router.get('/:friend_id/posts', function(req, res, next) {

});

router.get('/:friend_id/photos', function(req, res, next) {

});

router.get('')

module.exports = router;
