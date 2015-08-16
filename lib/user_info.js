var user_info = {};

// var config = "https://henchill.databox.me/Preferences/ldconnect_config";
// var webid = "https://henchill.databox.me/profile/card#me";

// user_info[webid] = {
// 	config: config
// }

exports = module.exports = {
	update: function(userId, info) {
		if (!user_info.hasOwnProperty(userId)) {
			user_info[userId] = {};
		}
		for (var prop in info) {
			if (info.hasOwnProperty(prop)) {
				user_info[userId][prop] = info[prop];
			}
		}
	},
	getInfo: function(userId, prop) {
		console.log(JSON.stringify(user_info));
		if (user_info.hasOwnProperty(userId)) {
			console.log("returning defined: ", user_info[userId][prop]);
			return user_info[userId][prop];
		}
		console.log("returning undefined");
		return undefined;
	}
}

// https://henchill.databox.me/Preferences/ldconnect_config