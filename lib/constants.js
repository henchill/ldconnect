var path = require("path");


exports.APP_ID = "1464644210500554";
exports.APP_SECRET = "cdd376081fe295750f8e956828d93474";
exports.BASEURL = "https://local.he1.crosscloud.org:3001/";
// exports.BASEURL = "https://he1.crosscloud.org:3001/";
exports.TOKENS_DIR = path.join(__dirname, "../access_tokens/");
exports.LDCONNECT_NS = "https://henchill.databox.me/fb#";
// exports.POST_RELATED_REGEX =
// exports.PHOTO_RELATED_REGEX =
exports.RELATED_REGEX = /\d+_?\d+_related$/;
exports.USER_BASE_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/$/;
exports.PROFILE_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/fbprofile$/;
exports.ALBUMS_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/albums\/$/;
exports.POSTS_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/posts\/$/;
exports.POST_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/posts\/(?:\d+_\d+$)/;
exports.PHOTO_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/albums\/(?:user_photos|\d+)\/\d+$/;
exports.ALBUM_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/albums\/(?:user_photos|\d+)\/$/;
// exports.PHOTOS_REGEX = /^\/(?:me|\d+)\/albums\/user_photos$/;
exports.FRIENDS_REGEX = /^\/(?:me|\d+|ldconnect_test\d)\/friends$/;
// exports.FEED_REGEX = /^\/(?:me|\d+)\/feed$/;
exports.COMMENTS_REGEX = /\/comments_(?:\d+_?\d+)$/;
exports.LIKES_REGEX = /\/likes_(?:\d+_?\d+)$/;

exports.SERVER_KEY = path.join(__dirname, "../keys/server.key");
exports.SERVER_CERT = path.join(__dirname, "../keys/server.crt");
exports.CLIENT_KEY = path.join(__dirname, "../keys/client.key");
exports.CLIENT_CERT = path.join(__dirname, "../keys/client.crt");
exports.PORT = 3001;
exports.ACL_KEY = "HRLdRVs452uw";


