var middleware = require("./lib/middleware"),
    express = require("express"),
    app = express(),
    parser = require("./lib/parser");

app.use(middleware({
    templatePath: __dirname + "/../../Developing/cardqr.de/Frontend/templates",
    enableUI: true
}));

app.get('/', function(req, res){
    res.send('Hello World');
});

app.listen(3000);
console.log('Listening on port 3000');