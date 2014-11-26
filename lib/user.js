/** An object to manage the user's salt and id */

var Request = require("sdk/request").Request;
var ss = require("sdk/simple-storage");
if (!ss.storage.keys){
  ss.storage.keys = {};
}
if (!ss.storage.sent){
  ss.storage.sent = [];
}
var site_domain = "https://connectcarolina2.com/crypto";

var hasOwnProperty = Object.prototype.hasOwnProperty;

function isEmpty(obj) {
    if (obj == null) return true;
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
    return true;
}

var User = {
    init: function(keys, callback){
        ss.storage.keys = {
          pub_key: keys.pub_key,
          priv_key: keys.priv_key,
          key_obj: keys.key_obj
        }
        Request({
            url: site_domain+'/set_key',
            content: {
                pub: keys.pub_key
            },
            onComplete: function (response) {
                var data = response.json;
                var success = (data&&data.status[0].code==0);
                callback(success);
            }
        }).post();
    },
    exists: function(){
        return !isEmpty(ss.storage.keys);
    },
    getKeys: function(){
        return ss.storage.keys;
    },
    hasCrypto: function(user_obj, callback){
        Request({
            url: site_domain+'/has_crypto',
            content: {
                id: user_obj.id,
                host: user_obj.host
            },
            onComplete: function (response) {
                var data = response.json;
                var success = (data&&data.status[0].code==0);
                callback({
                    success : success,
                    pub_key : data.pub_key
                });
            }
        }).post();
    },
    make_usermap: function(username, host){
        Request({
            url: site_domain+'/make_usermap',
            content: {
                username: username,
                host: host,
                pub: User.getKeys().pub_key
            },
            onComplete: function (response) {
                var data = response.json;
                var success = (data&&data.status[0].code==0);
                ss.storage.sent[host] = true;
            }
        }).post();
    },
    has_sent: function(host){
        return ss.storage.sent[host];
    }
}

exports.User = User;