Backbone.Model.prototype.idAttribute = "_id";

$(function () {
    'use strict';

    var App, BodyView, SearchView, LanguageCollection, LanguageView, NamespaceCollection, NamespaceView, IsoCollection,
        IsoView, RowView, TranslationCollection, TableView, url;

    url = $.url();

    SearchView = Backbone.View.extend({
        tagName: 'input',

        xhr: null,
        queryLength: 0,

        events: {
            "input": "search"
        },

        initialize: function () {
            $(this.el).attr({
                type       : 'text',
                placeholder: 'Search translation'
            });
        },

        search: function () {
            var self = this;

            if ($(this.el).val().length > 2 && $(this.el).val().length > this.queryLength) {
                $("tbody", App.table.el).children().remove();
            } else if ($(this.el).val().length < 3 && $(this.el).val().length < this.queryLength) {
                $("tbody", App.table.el).children().remove();
                App.select.fireNamespaceChanged(App.select.selectedNamespace, true);
            } else if ($(this.el).val().length < 3) {
                return;
            }

            this.queryLength = $(this.el).val().length;

            if (this.xhr !== null) {
                this.xhr.abort();
                this.xhr = null;
            }

            this.xhr = $.ajax({
                url : '/translate.me/admin/search',
                type: 'post',

                data: {
                    locale   : $(App.language.el).find(":selected").attr("value"),
                    q        : $(this.el).val(),
                    namespace: App.select.selectedNamespace
                },

                success: function (results) {
                    $("tbody", App.table.el).children().remove();
                    App.table.collection.set(results);
                    App.table.render();

                    self.xhr = null;
                },
                error  : function () {
                    self.xhr = null;
                }
            });
        }
    });

    TranslationCollection = Backbone.Collection.extend({
        url: "/translate.me/api/json/translations",

        parse: function (response) {
            var res = [];
            _.each(response, function (translation) {
                res.push({
                    _id      : translation._id,
                    key      : translation.key,
                    value    : translation.value,
                    locale   : translation.locale,
                    namespace: translation.namespace
                });
            });
            return res;
        }
    });

    RowView = Backbone.View.extend({
        tagName: "tr",

        events: {
            "change input": "update"
        },

        initialize: function () {
            $(this.el).append($("<td></td>").css({"vertical-align": "middle"}).html(this.model.get("key")));
            $(this.el).append($("<td></td>").html($("<input>").attr({
                id         : this.model.get("id"),
                placeholder: "Missing",
                type       : "text"
            }).css({"width": "96%", "margin": "0"}).val(this.model.get("value"))));
        },

        update: function (e) {
            var self = this;
            this.model.save({
                value: $(e.currentTarget).val()
            }, {
                success: function () {
                    self.$el.removeClass().addClass("success");
                    self.$el.find("td").animate({backgroundColor: "#ffffff"}, 2000, function () {
                        self.$el.removeClass("success");
                        self.$el.find("td").css("background-color", "");
                    });
                },
                error  : function () {
                    self.$el.removeClass().addClass("error");
                    self.$el.find("td").animate({backgroundColor: "#ffffff"}, 2000, function () {
                        self.$el.removeClass("error");
                        self.$el.find("td").css("background-color", "");
                    });
                }
            });
        }
    });

    TableView = Backbone.View.extend({
        tagName  : "table",
        className: "table table-hover",

        collection: new TranslationCollection(null, {
            comparator: function (model) {
                return model.get("namespace").toLowerCase() + model.get("key").toLowerCase();
            }
        }),

        render: function () {
            var row = $('<tr></tr>'),
                namespaces = _.keys(_.groupBy(this.collection.models, function (model) {
                    return model.get('namespace');
                })),
                currentNamespace = '';

            this.$el.children().remove();

            row.append($("<th style='width: 50%'></th>").html("Key"));
            row.append($("<th style='width: 50%'></th>").html("Translation"));

            this.$el.append($("<thead></thead>").append(row));

            this.collection.each(function (model) {
                if (namespaces.length > 1 && currentNamespace !== model.get('namespace')) {
                    $(this.el).append('<tr><th colspan="2">Namespace: ' + model.get('namespace') + '</th></tr>');
                    currentNamespace = model.get('namespace');
                }

                var row = new RowView({
                    model: model
                });

                this.$el.append(row.el);
            }, this);

            return this;
        }
    });

    NamespaceCollection = Backbone.Collection.extend({
        url: "/translate.me/api/json/namespaces",

        parse: function (response) {
            var result = [];
            _.each(response, function (namespace) {
                result.push({
                    namespace: namespace
                });
            });
            return result;
        }
    });

    NamespaceView = Backbone.View.extend({
        selectedNamespace: null,

        tagName: "select",

        collection: new NamespaceCollection(null, {
            comparator: function (model) {
                return model.get("namespace").toLowerCase();
            }
        }),

        events: {
            "change": "handleNamespaceChanged"
        },

        initialize: function () {
            var self = this;

            this.collection.fetch({
                success: function () {
                    //self.$el.append($('<option value="*">All translations</option>'));

                    self.collection.each(function (model) {
                        var namespace = model.get("namespace"),
                            $option = $("<option></option>");
                        $option.attr("value", namespace);
                        $option.html(namespace.length > 0 ? namespace : "Global");
                        self.$el.append($option);
                    });

                    if (url.fparam('namespace')) {
                        $('option[value="' + decodeURIComponent(url.fparam('namespace')) + '"]',
                            self.el).attr('selected', 'selected');
                    } else {
                        $('option[value=' + self.collection.first().get("namespace") + ']', self.el).attr('selected',
                            'selected');
                    }

                    self.fireNamespaceChanged($(self.el).find(":selected").attr("value"));
                    $(self.el).combobox();
                }
            });
        },

        handleNamespaceChanged: function (event) {
            this.fireNamespaceChanged($(event.target).find(":selected").attr("value"));
        },

        fireNamespaceChanged: function (namespace, fromSearch) {
            var locale = '';

            if (!fromSearch) {
                $(App.search.el).val('');
            }

            this.selectedNamespace = namespace;

            this.trigger("namespace:changed", namespace);

            if (url.fparam('locale')) {
                locale = 'locale=' + encodeURIComponent(url.fparam('locale')) + '&';
            }

            window.location.hash = locale + 'namespace=' + encodeURIComponent(namespace);
            url = $.url();
        }
    });

    LanguageCollection = Backbone.Collection.extend({
        url: "/translate.me/api/json/locales",

        parse: function (response) {
            var result = [];
            _.each(response, function (localeCode) {
                result.push({
                    code: localeCode
                });
            });
            return result;
        }
    });

    LanguageView = Backbone.View.extend({
        tagName  : 'select',
        className: 'combobox',

        collection: new LanguageCollection(null, {
            comparator: function (model) {
                return model.get("code").toLowerCase();
            }
        }),

        events: {
            "change": "handleLanguageChanged"
        },

        initialize: function () {
            var self = this;

            /*var $addLanguage = $("<option></option>");
            $addLanguage.html('Add new language');
            $addLanguage.attr("value", 'addLanguage');
            this.$el.append($addLanguage);*/

            this.collection.fetch({
                success: function () {
                    self.collection.each(function (model) {
                        var $option = $("<option></option>");
                        $option.html(model.get("code"));
                        $option.attr("value", model.get("code"));
                        self.$el.append($option);
                    });

                    if (url.fparam('locale')) {
                        $('option[value=' + decodeURIComponent(url.fparam('locale')) + ']', self.el).attr('selected',
                            'selected');
                    } else {
                        $('option[value=' + self.collection.first().get("code") + ']', self.el).attr('selected',
                            'selected');
                    }

                    self.fireLanguageChanged($(self.el).find(":selected").attr("value"));
                    $(self.el).combobox();
                }
            });
        },

        handleLanguageChanged: function (event) {
            if ($(event.target).find(":selected").attr("value") === "addLanguage") {
                return;
            }

            this.fireLanguageChanged($(event.target).find(":selected").attr("value"));
        },

        fireLanguageChanged: function (countryCode) {
            var namespace = '';

            this.trigger("language:changed", countryCode);

            if (url.fparam('namespace')) {
                namespace = '&namespace=' + encodeURIComponent(url.fparam('namespace'));
            }

            window.location.hash = 'locale=' + encodeURIComponent(countryCode) + namespace;
            url = $.url();
        }
    });

    IsoCollection = Backbone.Collection.extend({
        parse: function (response) {
            var result = [];
            _.each(response, function (localeCode) {
                result.push({
                    code: localeCode
                });
            });
            return result;
        }
    });

    IsoView = Backbone.View.extend({
        tagName  : 'button',
        className: 'btn disabled',

        collection: new IsoCollection(locales_list, {
            comparator: function (model) {
                var locale = model.get("code").split('_');

                return locale[0].toLowerCase() + ((locale[1]) ? '_' + locale[1].toUpperCase() : '');
            }
        }),

        events: {
            "click": "handleAddLanguage"
        },

        initialize: function () {
            $(this.el).html('<i class="icon-plus-sign"></i> Add language');
        },

        handleAddLanguage: function (e) {
            e.preventDefault();
        }
    });

    BodyView = Backbone.View.extend({
        el: '#content',

        initialize: function () {
            var self = this;

            this.search = new SearchView();
            this.table = new TableView();

            this.viewConfig = new Backbone.Model();
            this.listenTo(this.viewConfig, "change", function (model) {
                if (typeof model.get("namespace") === "string" && model.get("language")) {
                    this.table.collection.fetch({
                        data   : {
                            namespace                 : model.get("namespace"),
                            locale                    : model.get("language"),
                            emulateMissingTranslations: true
                        },
                        success: function () {
                            self.table.render();
                        }
                    });
                }
            });
            this.select = new NamespaceView();
            this.listenTo(this.select, "namespace:changed", function (namespace) {
                this.viewConfig.set("namespace", namespace);
            });
            this.language = new LanguageView();
            this.listenTo(this.language, "language:changed", function (countryCode) {
                this.viewConfig.set("language", countryCode);
            });
            this.addLanguage = new IsoView();
        },

        render: function () {
            $("#search").append(this.search.render().el);
            $("#namespaceSelector").append(this.select.render().el);
            $("#languageSelector").append(this.language.render().el);
            $("#addLanguage").append(this.addLanguage.render().el);
            $("#table").append(this.table.render().el);

            return this;
        }
    });

    App = new BodyView();

    App.render();
});
