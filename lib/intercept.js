var {Cc, Ci, Cr, Cu} = require('chrome');
//var JSEncrypt = require("./jsencrypt").JSEncrypt;

function observeRequest(channel, topic, data) {
    let post = null;
    
    if (!(channel instanceof Ci.nsIHttpChannel) || !(channel instanceof Ci.nsIUploadChannel)){
        return post;
    }
    if(channel.requestMethod !== 'POST'){
        return post;
    }
    
    try{
        let us = channel.uploadStream;
        if(!us){
            return post;
        }
        if(us instanceof Ci.nsIMultiplexInputStream){
            // Seeking in a nsIMultiplexInputStream effectively breaks the stream.
            return post;
        }
        if(!(us instanceof Ci.nsISeekableStream)){
            // Cannot seek within the stream :(
            return post;
        }
        let oldpos = us.tell();
        us.seek(0, 0);
        try{
            let is = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsISupports).QueryInterface(Ci["nsIScriptableInputStream"]);
            is.init(us);
            // we'll read max 64k
            let available = Math.min(is.available(), 1 << 16);
            if (available){
                post = is.read(available);
            }
        }
        finally{
            // Always restore the stream position!
            us.seek(0, oldpos);
        }
    }
    catch(ex){
        Cu.reportError(ex);
    }
    return post;
}

//create an nsIObserver implementor
var listener = {
    _self: this,
    observe : function(subject, topic, data) {
        var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
        var old_post_data = observeRequest(subject, topic, data);
        if(topic == "http-on-modify-request"&&httpChannel.requestMethod=="POST"){
            var uploadChannel = httpChannel.QueryInterface(Ci.nsIUploadChannel);
            var uploadChannelStream = uploadChannel.uploadStream;
            uploadChannelStream = uploadChannelStream.QueryInterface(Ci.nsISeekableStream).seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);
            
            var postData = old_post_data;
            //JSEncrypt.setPublicKey(pub_key);
            //JSEncrypt.encrypt(data);
            if(Intercept&&Intercept.workers){
                for(var i=0; i<Intercept.workers.length; i++){
                    if(Intercept.workers[i].url==httpChannel.name){
                        var index = old_post_data.indexOf(Intercept.workers[i].text_obj.text);
                        //possilby url encode - most likely will need to be
                        //make sure they're not overwriting meta data like content-length - don't use loop
                        //make sure to overwrite all instances of text
                        if(index>0){
                            postData = postData.substring(0, index)+"<crypto_tag>"+Intercept.workers[i].text_obj.enc_text_r+"<c2>"+Intercept.workers[i].text_obj.enc_text_s+"</crypto_tag>"+postData.substring(index+Intercept.workers[i].text_obj.text.length);
                        }
                    }
                }
            }
            var inputStream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
            inputStream.setData(postData, postData.length);
            
            var uploadChannel = aSubject.QueryInterface(Ci.nsIUploadChannel);
            uploadChannel.setUploadStream(inputStream, "application/x-www-form-urlencoded", -1);
            
            // order important - setUploadStream resets to PUT
            httpChannel.requestMethod = "POST";
            httpChannel.referrer = httpChannel.name;
        }
    },

    QueryInterface : function(aIID){
        if(aIID.equals(Ci.nsISupports) || aIID.equals(Ci.nsIObserver))
            return this;
        throw Cr.NS_NOINTERFACE;
    }
};

var observerService = null;

var Intercept = {
    _self: this,
    addObserver : function(){
        observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
        listener.intercept = _self;
        observerService.addObserver(listener, "http-on-modify-request", false);
    },

    removeObserver : function(){
        observerService.removeObserver(listener, "http-on-modify-request");
    },
   
    workers: []
};

exports.Intercept = Intercept;