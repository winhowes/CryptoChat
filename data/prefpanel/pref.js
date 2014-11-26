$(function(){
    //Handle the clicking of the create ruleset button
    $('#create_ruleset').on('click', function(){
        self.port.emit("create_ruleset");
    });
    
    //Handle the clicking of the rest button
    $('#reset').on('click', function(){
        self.port.emit("reset");
    });
});