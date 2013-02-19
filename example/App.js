var express = require("express"),
    app = express();

app.use(express.bodyParser());
app.use(express.methodOverride());

app.get("/", function(req, res){
    var body = "Hello World";
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Content-Length", body.length);
    res.end(body);
});

app.listen(3000);
console.log("Listening on port 3000");
