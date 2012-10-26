$(function () {
    var i18nModel = Backbone.Model.extend({

    });

    var i18nCollection = Backbone.Collection.extend({
        model: i18nModel,
        url: "/i18nAdmin/strings/",

        parse: function(response) {
            var res = [];

            this.path = response.path;

            _.each(response.strings, function (val, key) {
                res.push({key: key, value: val})
            });

            return res;
        }
    });

    var i18nPathModel = Backbone.Model.extend({

    });

    var i18nPathCollection = Backbone.Collection.extend({
        model: i18nPathModel,
        url: "/i18nAdmin/paths/"
    });

    var BodyView = Backbone.View.extend({
        el: '#content',

        events: {
            "click button": "btnClicked"
        },

        initialize: function () {
            this.table = new TableView();
            this.select = new PathsView();

            this.render();
        },

        btnClicked: function (e) {
            if ($(e.currentTarget).attr("id") == "saveStrings") {
                this.table.save();
            }
        },

        render: function () {
            $("#selectPath").append(this.select.render().el);
            $("#table").append(this.table.render().el);

            $("#table").append($("<div class=\"form-actions\"><button id=\"saveStrings\" type=\"submit\" class=\"btn btn-primary\">Save changes</button><button type=\"button\" class=\"btn\">Cancel</button></div>"));

            return this;
        }
    });

    var PathsView = Backbone.View.extend({
        tagName: "select",
        collection: new i18nPathCollection,

        events: {
            "change": "changed"
        },

        initialize: function () {
            var self = this;

            this.collection.fetch();

            this.collection.on("reset", function () {
                self.collection.each(function (model, i) {
                    if (i == 0) {
                        App.table.load(model.get("path"));
                    }

                    self.$el.append($("<option></option>").html(model.get("path")).attr("value", model.get("path")));
                });
            });
        },

        changed: function (e) {
            App.table.load($(e.currentTarget).val());
        },

        render: function () {
            return this;
        }
    });

    var TableView = Backbone.View.extend({
        tagName: "table",
        className: "table",

        collection: new i18nCollection,

        initialize: function () {
            var self = this;

            this.collection.on("reset", function () {
                $(self.el).children().remove();

                var row = $("<tr></tr>");

                row.append($("<td></td>").html("Key"));
                row.append($("<td></td>").html("Translation"));

                self.$el.append($("<thead></thead>").append(row));

                self.collection.each(function (model) {
                    var row = $("<tr></tr>");

                    row.append($("<td></td>").html(model.get("key")));
                    row.append($("<td></td>").html($("<input>").attr({placeholder: "missing", type: "text"}).val(model.get("value"))));

                    if (model.get("value") == "") {
                        row.addClass("warning");
                    }

                    self.$el.append(row);
                });
            });
        },

        load: function (path) {
            this.path = path;
            this.collection.fetch({data: {path: path}});
        },

        save: function () {
            var self = this;

            this.collection.each(function (model) {
                model.save({path: self.collection.path});
            });
        },

        render: function () {
            return this;
        }
    });

    var App = new BodyView();
});