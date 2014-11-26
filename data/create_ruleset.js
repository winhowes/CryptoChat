/* This script is responsible for creating rules*/

var addon = self;

var matchedElement = null;
var originalBgColor = null;
var active = false;
var stage = 1;
var stage_array = [];
var crypto_banner;

/** Change a marked element back to it's original state if it hasn't been selected */
function resetMatchedElement() {
    if(matchedElement&&!$(matchedElement).hasClass('crypto_marker')){
        $(matchedElement).css('background-color', originalBgColor);
        $(matchedElement).unbind('click.annotator');
    }
}

/** Initialize the tutorial for how to create a ruleset */
function create_ruleset(){
    active = true;
    stage = 1;
    banner();
}

/** Manage the banner at the top of the page during the ruleset creation tutorial. When done, submit ruleset */
function banner(){
    if(stage==1){
        $('body').append('<div id="crypto_banner_top"></div>');
        crypto_banner = $('#crypto_banner_top');
        crypto_banner.hide().html("Step 1: Select your name/id on the page. <a title='close' id='cancel_crypto'>x</a>").fadeIn();
    }
    else if(stage==2){
        crypto_banner.hide().html("Step 2: Select the recipient's name/id on the page. <a title='close' id='cancel_crypto'>x</a>").fadeIn();
    }
    else if(stage==3){
        crypto_banner.hide().html("Step 3: Select the to-be encrypted textbox on the page. <a title='close' id='cancel_crypto'>x</a>").fadeIn();
    }
    else if(stage==4){
        $.each($('.crypto_marker'), function(i, e){
            $(e).css('background-color', $('.crypto_marker').data('background-color'));
        });
        $('body').append('<div id="crypto_bubble">Ruleset created!</div>');
        $('#crypto_bubble').hide().fadeIn();
        $('*').one('click', function(){
            $('#crypto_bubble').fadeOut(function(){
               $(this).remove(); 
            });
        });
        active = false;
        crypto_banner.fadeOut(function(){
            crypto_banner.remove();
        });
        var username = stage_array[1].text;
        var submit_array = [];
        submit_array[0] = stage_array[1].id;
        submit_array[1] = stage_array[2].id;
        submit_array[2] = stage_array[3].id;
        self.port.emit("rules_made", {rules: submit_array, host: String(window.location), username: username});
        stage++;
    }
    $('#cancel_crypto').on('click', function(){
        $.each($('.crypto_marker'), function(i, e){
            $(e).css('background-color', $('.crypto_marker').data('background-color'));
        });
        active = false;
        stage = 1;
        crypto_banner.fadeOut(function(){
            crypto_banner.remove();
        });
    })
}

/** Record what was clicked, and progress a stage forward in ruleset creation */
function stage_forward(){
    stage_array[stage] = {text: $(matchedElement).text(), id: $(matchedElement).getPath()};
    stage++;
    banner();
}

//Add a hover effect to each element and setup a click event to select elements for rules */
$('*').mouseenter(function() {
    if(!active || $(this).hasClass('annotated')){
        return;
    }
    resetMatchedElement();
    matchedElement = $(this).first();
    originalBgColor = $(matchedElement).css('background-color');
    $(matchedElement).css('background-color', 'yellow');
    $(matchedElement).bind('click.annotator', function(event){
        event.stopPropagation();
        event.preventDefault();
        $(this).addClass('crypto_marker').data('background-color', originalBgColor);
        stage_forward();
    });
});

//undo the hover effect
$('*').mouseout(function() {
    resetMatchedElement();
});

/** Return the unique path from the top of the DOM to a given element */
jQuery.fn.getPath = function () {
    if(this.length != 1) throw 'Requires one element.';

    var path, node = this;
    while(node.length){
        var realNode = node[0], name = realNode.localName;
        if (!name) break;
        name = name.toLowerCase();
        
        var parent = node.parent();
        
        var siblings = parent.children(name);
        if (siblings.length > 1) { 
            name += ':eq(' + siblings.index(realNode) + ')';
        }
        
        path = name + (path ? '>' + path : '');
        node = parent;
    }
    return path;
};