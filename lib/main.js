var pageMod = require("sdk/page-mod");
var URL = require("sdk/url").URL;
var self = require('sdk/self');
var data = self.data;
var Intercept = require("./intercept").Intercept;
var User = require("./user").User;
var Toolbar = require("./toolbar").Toolbar;
var workers = [];

exports.main = function(options){
    if(User.exists()){
        Toolbar.addToolbarButton();
    }
    Intercept.addObserver();
    
    var CryptoPage = pageMod.PageMod({
        include: "*",
        attachTo: ["existing", "top"],
        contentScriptWhen: 'ready',
        contentScriptFile: [data.url('lib/jquery-1.10.1.min.js'),
                            data.url('lib/jsencrypt.js'),
                            data.url('crypto_driver.js'),
                            data.url('manage_rules.js'),
                        data.url('runway.js')],
        onAttach: function(worker){
            workers.push(worker);
            Intercept.workers.push(worker);
            worker.on('detach', function (){
                detachWorker(this, workers);
                detachWorker(this, Intercept.workers);
            });
            Toolbar.check_rule();
            worker.port.emit("startup");
            
            worker.port.emit('css_load', data.url('crypto_bubble_other.css'));
            
            if(!User.exists()){
                worker.port.emit("init_crypto");
            }
            else{
                //User exists, see if user has publicly registered with site
                var host = URL(worker.url).host;
                if(!User.has_sent(host)){
                    var rules = Toolbar.get_ruleset(host);
                    if(rules){
                        //Rules stored locally, get username
                        worker.port.emit('get_username', rules);
                    }
                    else{
                        //Fetch the rules from the server, then get username
                        Toolbar.check_rule(function(data){
                            rules = Toolbar.get_ruleset(host);
                            worker.port.emit('get_username', rules);
                        });
                    }
                }
            }
            worker.port.on('update_text', function(text_obj){
                worker.text_obj = text_obj;
            });
            worker.port.on('get_my_keys', function(){
                worker.port.emit("got_my_keys", User.getKeys());
            });
            worker.port.on('got_username', function(message){
                User.make_usermap(message.username, message.host);
            });
            worker.port.on("init_crypto_return", function(message){
                User.init(message, function(success){
                    if(success){
                        Toolbar.addToolbarButton();
                    }
                    worker.port.emit('return_crypto', success);
                });
            });
            worker.port.on('get_ruleset', function(host){
                var rules = Toolbar.get_ruleset(host);
                if(rules){
                    worker.port.emit('current_ruleset', rules);
                }
                else{
                    Toolbar.check_rule(function(data){
                        var rules = Toolbar.get_ruleset(host);
                        worker.port.emit('current_ruleset', rules);
                    });
                }
            });
            worker.port.on('has_crypto', function(obj){
                User.hasCrypto(obj, function(result){
                    result.priv_key = User.getKeys().priv_key;
                    worker.port.emit('does_have_crypto', result); 
                });
            });
        }
    });
}

exports.onUnload = function(reason) {
    Toolbar.removeToolbarButton();
};

function detachWorker(worker, workerArray) {
    var index = workerArray.indexOf(worker);
    if(index != -1) {
        workerArray.splice(index, 1);
    }
}