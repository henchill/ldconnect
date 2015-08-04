/*jslint node: true*/
"use strict";

var path = require('path');
var util = require('util');
var constants = require("../constants.js");
var qs = require('querystring');
var fetcher = require('../fetcher.js');
var debug = require('../logging').posthandler;


exports.handler = function(req, res) {
    console.log("post handler called");
    var reqpath = removeEmptyElements(req.path.split('/'));

    if (req.path === "/facebook_token") {
        handleTokenSetup(req, res);
    } else if (reqpath.length > 0) {
        console.log(req.text);
        var args = {
            path_user: reqpath[0],
            current_user: req.session.fbid,
            access_token: req.session.access_token,
            data: req.text
        }

        if (constants.FEED_REGEX.test(req.path)) {
            handlePostToFeed(req, res, args);
        }
    }
}

var handlePostToFeed = function(req, res, args) {
    console.log("executing handle post to feed");
    fetcher.writePost(args, function(result) {
        res.status(201)
            .send(result);
    });
}

var handleTokenSetup = function(req, res) {
    debug("handling token setup");
    var redirecturl = constants.BASEURL + "facebook_token";

    var query = {
        client_id: constants.APP_ID,
        redirect_uri: redirecturl,
        scope: 'publish_actions,user_likes,user_events,user_photos,user_friends,user_status,user_posts'
    }

    var fburl = "https://www.facebook.com/dialog/oauth?%s";
    
    var fbredirect = util.format(fburl, qs.stringify(query));
    
    res.status(200).send({ 'redirecturl': fbredirect });
}

var containerCallback = function(err) {
    if (err) {
        debug("POST -- Error creating new container: " + err);
        return res.sendStatus(500);
    }
    debug("POST -- Created new container " + resourceBaseUri);
    res.set('Location', resourceBaseUri);
    return res.sendStatus(201);
}

var resourceCallback = function(err) {
    if (err) {
        debug("POST -- Error creating resource: " + err);
        return res.sendStatus(500);
    }
    res.set('Location', resourceBaseUri);
    return res.sendStatus(201);
}

var removeEmptyElements = function(arr) {
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] !== '') {
            result.push(arr[i]);
        }
    }
    return result;
}
