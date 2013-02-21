var express = require("express"),
    app = express(),
    TranslateMe = require("../lib/TranslateMe"),
    translateMe = new TranslateMe(process.env.MONGO_URL, "en", ["de", "fr"]);


app.use(express.bodyParser());
app.use(express.methodOverride());

/*
It is imported to place the "reqister routers" after
all use-statements, to prevent any blockage of other middlewares.
*/
translateMe.registerRoutes(app, true);
app.use("/js/underscore", express.static(__dirname + "/../node_modules/underscore/"));
app.use("/translate.me", express.static(__dirname + "/../lib/browser"));

app.get("/", function(req, res){
    res.sendfile(__dirname + "/views/index.html");
});

app.listen(8080);
console.log("Listening on port 8080");
