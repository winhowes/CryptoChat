/* This script controls all of the other content scripts and global variables */

var addon = self;

/** Setup for deletion of the crypto bubble popup */
function setup_crypto_bubble_delete(){
    $('*').one('click', function(){
        $('#crypto_bubble').fadeOut(function(){
           $(this).remove(); 
        });
    });
}

/** Determines whether or not an object is empty
 * obj: the object in question
*/
function isEmpty(obj) {
    if (obj == null) return true;
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }
    return true;
}

//Start everything up
self.port.on('startup', function(){
    get_keys();
    get_ruleset();
});

//Load a css file into the page
self.port.on('css_load', function(css_file){
    $('body').prepend('<link type="text/css" href="'+css_file+'" rel="stylesheet" media="all" />');
});

//Print a debugging message
self.port.on('debug', function(message){
   alert(JSON.stringify(message)); 
});