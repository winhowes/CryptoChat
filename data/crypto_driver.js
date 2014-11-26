/* This script controls all crypto related things */

var addon = self;
var myKeys;
var old_html = "";

$(function(){
    //Scan for any crypto on the page and decypt if possible
    //TODO: change to an element added to dom event
    //(possibly with a settimeout to lower overhead) instead of an interval
    window.setInterval(function(){
        $('*:contains("<crypto_tag>"):not([crypto_mark="true"])').each(function(){
            if($(this).children(':contains("<crypto_tag>"):not([crypto_mark="true"])').length){
                //ASSUMPTION: an element not containing a crypto message will never contain a crypto message
                $(this).attr('crypto_mark', true);
                return;
            }
            var val = $(this).text();
            var index1 = val.toLowerCase().indexOf('<crypto_tag>');
            var index2 = val.toLowerCase().indexOf("</crypto_tag>");
            var crypt = new JSEncrypt();myKeys.key_obj;
            crypt.setPrivateKey(myKeys.priv_key);
            var ciphertext = (index2>0) ? val.substring(index1+"<crypto_tag>".length, index2) : val.substring(index1+"<crypto_tag>".length);
            if(ciphertext.toLowerCase().indexOf("<c2>")>-1){
                var part = ciphertext.substring(0, ciphertext.toLowerCase().indexOf('<c2>'));
                var plaintext = crypt.decrypt(part);
                if(!plaintext){
                    part = ciphertext.substring(ciphertext.toLowerCase().indexOf("<c2>")+"<c2>".length);
                    plaintext = crypt.decrypt(part);
                }
            }
            else{
                var plaintext = crypt.decrypt(ciphertext);
            }
            temp_val = (!!plaintext)? plaintext : '[Unable to decrypt message: "'+ciphertext+'"]';
            var end = (index2>0)?val.substring(index2+"</crypto_tag>".length) : "";
            val = val.substring(0, index1)+temp_val+end;
            $(this).text(val);
        });
    }, 50);
});

/** Setup the user's public and private key and send the public key to the server */
function setup_crypto(){
    var keySize = 1024;
    crypt = new JSEncrypt({default_key_size: keySize});
    crypt.getKey(function(){
        var priv_key = crypt.getPrivateKey();
        var pub_key = crypt.getPublicKey();
        self.port.emit('init_crypto_return', {"pub_key": pub_key, "priv_key": priv_key, "key_obj": crypt});
    });
    
    //Tell user crypto is being set up
    $('body').append('<div id="crypto_bubble">Setting Up Crypto...</div>');
    setup_crypto_bubble_delete();
    $('#crypto_bubble').hide();
}

/** Get user's keys */
function get_keys(){
    self.port.emit('get_my_keys');
}

//If no crypto exists for the user, set it up
self.port.on('init_crypto', function(){
    setup_crypto();
});

//Alert the user as to whether or not their crypto was successfully initialized
self.port.on('return_crypto', function(success){
    //Hide crypto bubble/show error
    var bubble = $('#crypto_bubble');
    if(bubble.length){
        bubble.hide();
    }
    else{
        $('body').append('<div id="crypto_bubble"></div>');
        bubble = $('#crypto_bubble');
        bubble.hide();
        setup_crypto_bubble_delete();
    }
    if(success){
        bubble.text("Success").fadeIn().delay(2000).fadeOut(function(){
            $(this).remove();
        });
    }
    else{
        bubble.html("Setup Failed. <a id='retry_crypto'>Retry?</a>").fadeIn();
        $('#retry_crypto').on('click', function(e){
            e.stopImmediatePropagation();
            setup_crypto();
        });
    }
});

//Setup or retrieve user's keys
self.port.on('got_my_keys', function(keys){
    if(!keys){
        window.setTimeout(get_keys, 100);
    }
    else{
        myKeys = keys;
    }
});