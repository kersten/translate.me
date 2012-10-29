Backbone.Model.prototype.idAttribute = "_id";

$(function () {
    var i18nModel = Backbone.Model.extend({

    });

    var i18nCollection = Backbone.Collection.extend({
        model: i18nModel,
        url: "/i18nAdmin/strings/",

        parse: function(response) {
            var res = [];

            this.path = response.path;

            _.each(response.strings, function (string) {
                res.push({key: string.key, value: string.value, _id: string._id});
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
            this.language = new LanguageView();

            this.render();
        },

        btnClicked: function (e) {
            if ($(e.currentTarget).attr("id") == "saveStrings") {
                this.table.save();
            }
        },

        render: function () {
            $("#selectPath").append(this.select.render().el);
            $("#selectLang").append(this.language.render().el);
            $("#table").append(this.table.render().el);

            $("#table").append($("<div class=\"form-actions\"><button id=\"saveStrings\" type=\"submit\" class=\"btn btn-primary\">Save changes</button><button type=\"button\" class=\"btn\">Cancel</button></div>"));

            return this;
        }
    });

    var LanguageView = Backbone.View.extend({
        tagName: "select",

        events: {
            "change": "changed"
        },

        initialize: function () {
            var self = this;

            $.get("/i18nAdmin/cclist", function (list) {
                _.each(list, function (country, code) {
                    var entry = $("<option></option>").html(country).attr("value", code);

                    if (code == "en") {
                        entry.attr("selected", "selected");
                    }

                    self.$el.append(entry);
                });
            });
        },

        changed: function (e) {
            App.table.switchLang($(e.currentTarget).val());
        },

        render: function () {
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
                        App.table.load(model.get("path"), model.get("locale"));
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

    var RowView = Backbone.View.extend({
        tagName: "tr",

        events: {
            "keyup input": "update"
        },

        initialize: function () {
            $(this.el).append($("<td></td>").html(this.model.get("key")));
            $(this.el).append($("<td></td>").html($("<input>").attr({
                id: this.model.get("_id"),
                placeholder: "missing",
                type: "text"
            }).val(this.model.get("value"))));

            if (this.model.get("value") === undefined || this.model.get("value") == "") {
                $(this.el).addClass("warning");
            }
        },

        update: function (e) {
            this.model.set({
                value: $(e.currentTarget).val()
            });

            if (!$(this.el).hasClass("success")) {
                $(this.el).removeClass("warning");
                $(this.el).addClass("success");
            }
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
                    var row = new RowView({
                        model: model
                    });

                    self.$el.append(row.el);
                });
            });
        },

        load: function (path, locale) {
            this.path = path;
            this.lang = locale;

            this.collection.fetch({data: {path: path}});
        },

        switchLang: function (lang) {
            this.lang = lang;
            this.collection.fetch({data: {path: this.path, locale: this.lang}});
        },

        save: function () {
            var self = this;

            this.collection.each(function (model) {
                //if (model.hasChanged("value")) {
                    model.save({path: self.collection.path, locale: this.lang});
                //}
            });
        },

        render: function () {
            return this;
        }
    });

    var App = new BodyView();
});