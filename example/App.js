var express = require("express"),
    app = express(),
    TranslateMe = require("../lib/TranslateMe"),
    translateMe = new TranslateMe(process.env.MONGO_URL, "en", ["de", "fr"]);


app.use(express.bodyParser());
app.use(express.methodOverride());

// It is imported to place the reqisterRoutes between after all use statements
translateMe.registerRoutes(app, true);

app.get("/", function(req, res){
    var body = "Hello World";
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Length", body.length);
    res.end(body);
});

app.listen(3000);
console.log("Listening on port 3000");
