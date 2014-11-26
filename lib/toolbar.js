/** An object to manage the user's salt and id */

var Request = require("sdk/request").Request;
var {Cc, Ci} = require('chrome');
var self = require('sdk/self');
var data = self.data;
var mediator = Cc['@mozilla.org/appshell/window-mediator;1'].getService(Ci.nsIWindowMediator);
var ss = require("sdk/simple-storage");
var tabs = require("sdk/tabs");
var URL = require("sdk/url").URL;
var pageMod = require("sdk/page-mod");
var User = require("./user").User;
var workers = [];
if (!ss.storage.sites){
  ss.storage.sites = [];
}
var site_domain = "https://connectcarolina2.com/crypto";
var btn;
var added = false;
var Ruleset = [];
var prefpanel = require("sdk/panel").Panel({
    width: 402,
    height: 237,
    contentURL: data.url('prefpanel/pref.html'),
    contentScriptFile: [data.url('lib/jquery-1.10.1.min.js'),
                        data.url('prefpanel/pref.js')],
    contentScriptWhen: 'ready'
});
var Toolbar = {
    addToolbarButton: function () {
        if(added){
            return;
        }
        added = true;
        // this document is an XUL document
        var document = mediator.getMostRecentWindow('navigator:browser').document;		
        var navBar = document.getElementById('nav-bar');
        if(!navBar){
            return;
        }
        btn = document.createElement('toolbarbutton');	
        btn.setAttribute('id', 'crypto_btn');
        btn.setAttribute('type', 'button');
        // the toolbarbutton-1 class makes it look like a traditional button
        btn.setAttribute('class', 'toolbarbutton-1');
        // the data.url is relative to the data folder
        btn.setAttribute('image', data.url('img/red.png'));
        btn.setAttribute('orient', 'horizontal');
        // this text will be shown when the toolbar is set to text or text and icons
        btn.setAttribute('label', 'Crypto Button');
        btn.addEventListener('click', function(){
            if(prefpanel.isShowing){
                prefpanel.hide();
            }
            else{
                prefpanel.show();
            }
        }, false);
        navBar.appendChild(btn);
        Ruleset = pageMod.PageMod({
            include: "*",
            attachTo: ["existing", "top"],
            contentScriptWhen: 'ready',
            contentScriptFile: [data.url('lib/jquery-1.10.1.min.js'),
                                data.url('create_ruleset.js'),
                                data.url('manage_rules.js'),
                            data.url('runway.js')],
            onAttach: function(worker) {
                workers.push(worker);
                worker.on('detach', function () {
                    detachWorker(this, workers);
                });
                worker.port.on('rules_made', function(result){
                    var host = URL(result.host).host;
                    var username = result.username;
                    Request({
                        url: site_domain+'/make_ruleset',
                        content: {
                            rules: result.rules,
                            host: host
                        },
                        onComplete: function (response) {
                            console.log("Request return make ruleset");
                            var data = response.json;
                            var success = (data&&data.status[0].code==0);
                            if(success){
                                ss.storage.sites[host] = {myId: result.rules[0], theirId: result.rules[1], textbox: result.rules[2]};
                                Toolbar.current_ruleset = ss.storage.sites[host];
                            }
                            else{
                                console.log("make ruleset error");
                            }
                            Toolbar.change_img(success);
                        }
                    }).post();
                    
                    User.make_usermap(username, host);
                    
                    detachWorker(worker, workers);
                });
            }
        });
    },
    removeToolbarButton: function removeToolbarButton() {
        // this document is an XUL document
        var document = mediator.getMostRecentWindow('navigator:browser').document;		
        var navBar = document.getElementById('nav-bar');
        var btn = document.getElementById('crypto_btn');
        if(navBar && btn){
            navBar.removeChild(btn);
        }
    },
    change_img: function(ruleset_exists){
        if(ruleset_exists){
            btn.setAttribute('image', data.url('img/blue.png'));
        }
        else{
            btn.setAttribute('image', data.url('img/red.png'));
        }
    },
    get_ruleset: function(host){
        return ss.storage.sites[host];
    },
    current_ruleset: {},
    check_rule: function(callback){
        var tool = this;
        var host = URL(tabs.activeTab.url).host;
        if(ss.storage.sites[host]){
            this.change_img(true);
            this.current_ruleset = ss.storage.sites[host];
        }
        else{
            this.current_ruleset = {};
            Request({
                url: site_domain+'/ruleset_exists',
                content: {
                    host: host
                },
                onComplete: function (response) {
                    var data = response.json;
                    var success = (data&&data.status[0].code==0);
                    if(success){
                        ss.storage.sites[host] = data.rules;
                        tool.current_ruleset = ss.storage.sites[host];
                    }
                    callback(data);
                    tool.change_img(success);
                }
            }).post();
        }
    }
}

prefpanel.port.on('create_ruleset', function(){
    prefpanel.hide();
    //See if crypto is on this page
    for(var i=0; i<workers.length; i++){
        var host = URL(workers[i].url).host;
        if(URL(tabs.activeTab.url).host==host){
            workers[i].port.emit('css_load', data.url('crypto_bubble_other.css'));
            if(Toolbar.get_ruleset[host]){
                workers[i].port.emit("rules_exist");
            }
            else{
                workers[i].port.emit("no_rules", {host: host});
            }
        }
    }
});

prefpanel.port.on('reset', function(){
  ss.storage.sites = [];
  ss.storage.sent = [];
  ss.storage.keys = {};
  prefpanel.hide();
});

tabs.on('activate', function (){
    var host = URL(tabs.activeTab.url).host;
    Toolbar.change_img(ss.storage.sites[host]);
    if(!ss.storage.sites[host]){
        Toolbar.check_rule();
    }
});

function detachWorker(worker, workerArray) {
    var index = workerArray.indexOf(worker);
    if(index != -1) {
        workerArray.splice(index, 1);
    }
}

exports.Toolbar = Toolbar;