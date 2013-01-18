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

    var i18nLanguageCollection = Backbone.Collection.extend({
        model: Backbone.Model.extend({}),
        url: "/i18nAdmin/cclist/"
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
        collection: new i18nLanguageCollection,

        events: {
            "change": "changed"
        },

        initialize: function () {
            var self = this;

            this.collection.fetch();

            this.collection.on("reset", function () {
                self.collection.each(function (model, i) {
                    var entry = $("<option></option>").html(model.get("country")).attr("value", model.get("code"));
                    self.$el.append(entry);
                });
            });
        },

        changed: function (e) {
            console.log("change");

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
                    self.$el.append($("<option></option>").attr("value", model.get("_id")).html(model.get("path").replace("/nls/", "")));
                });
            });
        },

        changed: function () {
            Backbone.history.navigate("/path/" + $(":selected", this.el).val() + "/" + App.table.locale, true);
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

            this.collection.on("update");
        },

        load: function (path, locale) {
            var self = this;

            this.path = path;

            if (locale !== undefined) {
                this.locale = locale;
            } else {
                locale.en;
            }

            this.collection.fetch({
                data: {
                    path: App.select.collection.get(path).get("path"),
                    locale: this.locale
                }, success: function () {
                    $("select", "#selectPath").val(self.path);
                    $("select", "#selectLang").val(self.locale);

                    Backbone.history.navigate("/path/" + $(":selected", "#selectPath").val() + "/" + self.locale, false);
                }
            });
        },

        switchLang: function (lang) {
            var self = this;

            this.locale = lang;

            this.setPath = App.select.collection.get(this.path).get("path").replace("/nls/", "/nls/" + lang + "/");

            Backbone.history.navigate("/path/" + $(":selected", "#selectPath").val() + "/" + App.table.locale, false);

            this.collection.fetch({
                data: {
                    path: App.select.collection.get(this.path).get("path"),
                    locale: this.locale
                }
            });
        },

        save: function () {
            var self = this;

            this.collection.each(function (model) {
                model.save({path: self.setPath, locale: self.locale});
            });
        },

        render: function () {
            return this;
        }
    });

    var i18nRouter = Backbone.Router.extend({
        routes: {
            "": "startRoute",
            "path/:id(/:locale)": "pathRoute"
        },

        startAfter: function(collections) {
            // Start history when required collections are loaded
            var start = _.after(collections.length, _.once(function(){
                Backbone.history.start({
                    pushState: true,
                    silent: false,
                    root: "/i18nAdmin/"
                });
            }));

            _.each(collections, function(collection) {
                collection.bind('reset', start, Backbone.history)
            });
        },

        startRoute: function () {

        },

        pathRoute: function (path, locale) {
            App.table.load(path, locale);
            App.table.switchLang(locale);
        }
    });

    var App = new BodyView();
    var router = new i18nRouter();

    router.startAfter([App.select.collection, App.language.collection]);
});
