Backbone.Model.prototype.idAttribute = "_id";

$(function () {
    var root = "/translate.me";

    var BodyView = Backbone.View.extend({
        el: '#content',

        initialize: function () {
            this.table = new TableView();

            this.viewConfig = new Backbone.Model();
            this.listenTo(this.viewConfig, "change", function(model) {
                if(typeof model.get("namespace") === "string" && model.get("language")) {
                    this.table.collection.fetch({
                        data: {
                            namespace: model.get("namespace"),
                            locale: model.get("language")
                        }
                    });
                }
            });
            this.select = new NamespaceView();
            this.listenTo(this.select, "namespace:changed", function(namespace) {
                this.viewConfig.set("namespace", namespace);
            });
            this.language = new LanguageView();
            this.listenTo(this.language, "language:changed", function(countryCode) {
                this.viewConfig.set("language", countryCode);
            });
        },

        render: function () {
            $("#namespaceSelector").append(this.select.render().el);
            $("#languageSelector").append(this.language.render().el);
            $("#table").append(this.table.render().el);
            return this;
        }
    });

    var LanguageCollection = Backbone.Collection.extend({
        url: root + "/locales",

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
        collection: new LanguageCollection(null, {
            comparator: function(model) {
                return model.get("code").toLowerCase();
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

    var NamespaceCollection = Backbone.Collection.extend({
        url: root + "/namespaces",

        parse: function(response) {
            var result = [];
            _.each(response, function(namespace) {
                result.push({
                    namespace: namespace
                })
            });
            return result;
        }
    });
    var NamespaceView = Backbone.View.extend({
        tagName: "select",
        collection: new NamespaceCollection(null, {
            comparator: function(model) {
                return model.get("namespace").toLowerCase();
            }
        }),

        events: {
            "change": "handleNamespaceChanged"
        },

        initialize: function () {
            var self = this;

            this.collection.fetch();
            this.collection.on("reset", function () {
                self.collection.each(function (model) {
                    var namespace = model.get("namespace"),
                        $option = $("<option></option>");
                    $option.attr("value", namespace);
                    $option.html(namespace.length > 0 ? namespace : "Global");
                    self.$el.append($option);
                });
                self.fireNamespaceChanged(self.collection.first().get("namespace"));
            });
        },

        handleNamespaceChanged: function(event) {
            this.fireNamespaceChanged($(event.target).find(":selected").attr("value"));
        },

        fireNamespaceChanged: function(namespace) {
            this.trigger("namespace:changed", namespace);
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

    var TranslationCollection = Backbone.Collection.extend({
        url: root + "/translations",

        parse: function(response) {
            var res = [];
            _.each(response, function (translation) {
                res.push({
                    _id: translation._id,
                    key: translation.key,
                    value: translation.value,
                    locale: translation.locale,
                    namespace: translation.namespace
                });
            });
            return res;
        }
    });
    var TableView = Backbone.View.extend({
        tagName: "table",
        className: "table",

        collection: new TranslationCollection(null, {
            comparator: function(model) {
                return model.get("key").toLowerCase();
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
