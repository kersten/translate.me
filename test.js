var middleware = require("./lib/middleware"),
    express = require("express"),
    app = express(),
    parser = require("./lib/parser");

app.use(middleware());

app.get('/', function(req, res){
    res.send('Hello World');
});

parser.parse({
    templatePath: __dirname + "/../../Developing/cardqr.de/Frontend/templates"
});

app.listen(3000);
console.log('Listening on port 3000');