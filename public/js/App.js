Backbone.Model.prototype.idAttribute = "_id";

$(function () {
    var BodyView = Backbone.View.extend({
        el: '#content',

        initialize: function () {
            this.table = new TableView();

            this.viewConfig = new Backbone.Model();
            this.listenTo(this.viewConfig, "change", function(model) {
                if(typeof model.get("path") === "string" && model.get("language")) {
                    this.table.collection.fetch({
                        data: {
                            path: model.get("path"),
                            locale: model.get("language")
                        }
                    });
                }
            });
            this.select = new PathsView();
            this.listenTo(this.select, "path:changed", function(path) {
                this.viewConfig.set("path", path);
            });
            this.language = new LanguageView();
            this.listenTo(this.language, "language:changed", function(countryCode) {
                this.viewConfig.set("language", countryCode);
            });
        },

        render: function () {
            $("#selectPath").append(this.select.render().el);
            $("#selectLang").append(this.language.render().el);
            $("#table").append(this.table.render().el);
            return this;
        }
    });

    var i18nLanguageCollection = Backbone.Collection.extend({
        url: "/i18n/locales",

        parse: function(response) {
            var result = [];
            _.each(response, function(localeCode) {
                result.push({
                    code: localeCode
                })
            });
            return result;
        }
    });
    var LanguageView = Backbone.View.extend({
        tagName: "select",
        collection: new i18nLanguageCollection(null, {
            comparator: function(model) {
                return model.get("code");
            }
        }),

        events: {
            "change": "handleLanguageChanged"
        },

        initialize: function () {
            var self = this;

            this.collection.fetch();
            this.collection.on("reset", function () {
                self.collection.each(function (model) {
                    var $option = $("<option></option>");
                    $option.html(model.get("code"));
                    $option.attr("value", model.get("code"));
                    self.$el.append($option);
                });
                self.fireLanguageChanged(self.collection.first().get("code"));
            });
        },

        handleLanguageChanged: function(event) {
            this.fireLanguageChanged($(event.target).find(":selected").attr("value"));
        },

        fireLanguageChanged: function(countryCode) {
            this.trigger("language:changed", countryCode);
        }
    });

    var i18nPathCollection = Backbone.Collection.extend({
        url: "/i18n/namespaces",

        parse: function(response) {
            var result = [];
            _.each(response, function(namespace) {
                result.push({
                    path: namespace
                })
            });
            return result;
        }
    });
    var PathsView = Backbone.View.extend({
        tagName: "select",
        collection: new i18nPathCollection(null, {
            comparator: function(model) {
                return model.get("path");
            }
        }),

        events: {
            "change": "handlePathChanged"
        },

        initialize: function () {
            var self = this;

            this.collection.fetch();
            this.collection.on("reset", function () {
                self.collection.each(function (model) {
                    var path = model.get("path"),
                        $option = $("<option></option>");
                    $option.attr("value", path);
                    $option.html(path.length > 0 ? path : "Global");
                    self.$el.append($option);
                });
                self.firePathChanged(self.collection.first().get("path"));
            });
        },

        handlePathChanged: function(event) {
            this.firePathChanged($(event.target).find(":selected").attr("value"));
        },

        firePathChanged: function(path) {
            this.trigger("path:changed", path);
        }
    });

    var RowView = Backbone.View.extend({
        tagName: "tr",

        events: {
            "change input": "update"
        },

        initialize: function () {
            $(this.el).append($("<td></td>").css({"vertical-align": "middle"}).html(this.model.get("key")));
            $(this.el).append($("<td></td>").html($("<input>").attr({
                id: this.model.get("id"),
                placeholder: "Missing",
                type: "text"
            }).css({"width": "96%", "margin": "0"}).val(this.model.get("value"))));
        },

        update: function (e) {
            var self = this;
            this.model.save({
                value: $(e.currentTarget).val()
            }, {
                success: function() {
                    self.$el.removeClass().addClass("success");
                    self.$el.find("td").animate({backgroundColor: "#ffffff"}, 2000, function() {
                        self.$el.removeClass("success");
                        self.$el.find("td").css("background-color", "");
                    });
                },
                error: function() {
                    self.$el.removeClass().addClass("error");
                    self.$el.find("td").animate({backgroundColor: "#ffffff"}, 2000, function() {
                        self.$el.removeClass("error");
                        self.$el.find("td").css("background-color", "");
                    });
                }
            });
        }
    });

    var i18nCollection = Backbone.Collection.extend({
        url: "/i18n/translations",

        parse: function(response) {
            var res = [];
            _.each(response, function (translation) {
                res.push({
                    _id: translation._id,
                    key: translation.key,
                    value: translation.value,
                    locale: translation.locale,
                    path: translation.path
                });
            });
            return res;
        }
    });
    var TableView = Backbone.View.extend({
        tagName: "table",
        className: "table",

        collection: new i18nCollection(null, {
            comparator: function(model) {
                return model.get("key");
            }
        }),

        initialize: function () {
            var self = this;

            this.collection.on("reset", function () {

                self.$el.children().remove();

                var row = $("<tr></tr>");

                row.append($("<th style='width: 50%'></th>").html("Key"));
                row.append($("<th style='width: 50%'></th>").html("Translation"));

                self.$el.append($("<thead></thead>").append(row));

                self.collection.each(function (model) {
                    var row = new RowView({
                        model: model
                    });

                    self.$el.append(row.el);
                });
            });
        }
    });

    var App = new BodyView();
    App.render();
});
