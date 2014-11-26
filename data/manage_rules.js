/* This script mangages implementing an existing ruleset */

var addon = self;
var page_host = String(window.location.host);
var last_theirId = "";
var ruleset = [];

/** Get the ruleset for this domain */
function get_ruleset(){
    self.port.emit('get_ruleset', page_host);
}

/** implement the ruleset
 * pub_key: the recipient's public key
 * priv_key: the sender's private key
*/
function implement_ruleset(pub_key, priv_key){
    for(var i=0; i<ruleset.length; i++){
        var text = $(ruleset[i].textbox);
        var enc = new JSEncrypt();
        enc.setPublicKey(pub_key);
        var crypt = new JSEncrypt();
        crypt.setPrivateKey(priv_key);
        text.on('focusin', function(){
            has_crypto(ruleset.theirId);
        }).on('input', function(){
            var val = $.trim(text.val());
            self.port.emit('update_text', {
                text: encodeURIComponent(val),
                enc_text_r: encodeURIComponent(enc.encrypt(val)),
                enc_text_s: encodeURIComponent(crypt.encrypt(val))
            });
        });
    }
    /* TODO:
    1. Intercept all submissions - done
    2. Encrypt data - done? - needs check
    3. Display decrypted data
    */
}

/** Determine whether or not a recipient user has crypto enabled
 * id: the ruleset id of the recipient (the theirId)
*/
function has_crypto(id){
    if($(id).is('input')||$(id).is('textarea')){
        $(id).on('input', function(){
            var val = $.trim((this).val());
            if(val!=""){
                last_theirId = val;
                self.port.emit('has_crypto', {id: val, host: page_host});
            }
        });
    }
    var new_id = $(id).text();
    if(new_id==""){
        window.setTimeout(function(){
            has_crypto(id);
        }, 500);
        return;
    }
    if(last_theirId!=new_id){
        last_theirId = new_id;
        self.port.emit('has_crypto', {id: new_id, host: page_host});
    }
}

//Get the user's username on the page from the rules and setup the rules for the page
self.port.on('get_username', function(rules){
    ruleset = rules;
    var i = 0;
    var username = $(rules[i].myId).text();
    while(username==""){
        i++;
        username = $(rules[i].myId).text(); 
    }
    self.port.emit('got_username', {username: username, host: page_host});
});

//Recieves a message of whether or not the recipient has crypto
self.port.on('does_have_crypto', function(result){
    if(result.success){
        implement_ruleset(result.pub_key, result.priv_key);
    }
    //else: don't implement crypto
});

//Tell the user that a ruleset exists for this page
self.port.on('rules_exist', function() {
    $('body').append('<div id="crypto_bubble">Crypto active on this page</div>');
    $('#crypto_bubble').hide().fadeIn();
    setup_crypto_bubble_delete();
});

//Tell the user that no rules exist on the page
self.port.on('no_rules', function(message) {
    if(String(window.location).indexOf(message.host)==-1){
        return;
    }
    $('body').append('<div id="crypto_bubble">No Ruleset for this '+message.host+'. <a id="create_crypto">Create one?</a></div>');
    var bubble = $('#crypto_bubble');
    setup_crypto_bubble_delete();
    bubble.hide().fadeIn();
    $('#create_crypto').on('click', function(e){
        bubble.remove();
        create_ruleset();
    });
});

//Setup or retrieve the ruleset for the page
self.port.on('current_ruleset', function(temp_ruleset){
    if(isEmpty(temp_ruleset)){
        //Should never be triggered
        window.setTimeout(get_ruleset, 100);
    }
    else{
        ruleset = temp_ruleset;
        for(var i=0; i<ruleset.length; i++){
            has_crypto(ruleset[i].theirId)
        }
    }
});