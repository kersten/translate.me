define(['underscore', 'backbone', './TranslationSearchView', './TranslationTableView', './NamespaceSelectorView', './LocaleSelectorView', './ToggleView'],
    function(_, Backbone, TranslationSearchView, TranslationTableView, NamespaceSelectorView, LocaleSelectorView, ToggleView) {
    'use strict';

    return Backbone.View.extend({
        initialize: function () {
            var self = this,
                searchInput = this.searchInput = new TranslationSearchView(),
                table = this.table = new TranslationTableView(),
                namespaceSelector = this.namespaceSelector = new NamespaceSelectorView(),
                localeSelector = this.localeSelector = new LocaleSelectorView(),
                onlyEmptyToggle = this.onlyEmptyToggle = new ToggleView({
                    text: 'Only Empty'
                }),
                updateURL = function () {
                    var hash = "";

                    if(searchInput.getQuery()) {
                        hash = hash + "q=" + encodeURIComponent(searchInput.getQuery());
                    }
                    if(localeSelector.getLocale()) {
                        if(hash.length > 0) {
                            hash += '&';
                        }
                        hash = hash + "locale=" + encodeURIComponent(localeSelector.getLocale());
                    }
                    if(namespaceSelector.getNamespace()) {
                        if(hash.length > 0) {
                            hash += '&';
                        }
                        hash = hash + "namespace=" + encodeURIComponent(namespaceSelector.getNamespace());
                    }
                    if(onlyEmptyToggle.getToggle()) {
                        if(hash.length > 0) {
                            hash += '&';
                        }
                        hash = hash + "onlyEmpty=" + onlyEmptyToggle.getToggle();
                    }
                    window.location.hash = hash;
                },
                searchParam = $.url().fparam('q'),
                onlyEmptyParam = $.url().fparam('onlyEmpty');

            if(searchParam) {
                searchInput.setQuery(decodeURIComponent(searchParam));
            }
            if(onlyEmptyParam) {
                onlyEmptyToggle.setToggle(onlyEmptyParam == 'true');
            }

            this.listenTo(searchInput, "query:changed", _.debounce(function () {
                self.search();
                updateURL();
            }, 100));
            this.listenTo(namespaceSelector, "namespace:changed", function () {
                self.search();
                updateURL();
            });
            this.listenTo(localeSelector, "locale:changed", function () {
                self.search();
                updateURL();
            });
            this.listenTo(onlyEmptyToggle, "toggle:changed", function() {
                self.search();
                updateURL();
            });

            this.listenTo(namespaceSelector, "namespaces:loaded", function (namespaceCollection) {
                var namespace;

                if (!namespaceCollection.isEmpty()) {
                    namespace = $.url().fparam('namespace')
                    if (namespace) {
                        namespaceSelector.setNamespace(decodeURIComponent(namespace));
                    }
                }

                if(namespaceSelector.isReady() && localeSelector.isReady()) {
                    self.search();
                }
            });
            this.listenTo(localeSelector, "locales:loaded", function (localesCollection) {
                var locale;

                if (!localesCollection.isEmpty()) {
                    locale = $.url().fparam('locale');
                    if (locale) {
                        localeSelector.setLocale(decodeURIComponent(locale));
                    } else {
                        locale = localesCollection.first().get('code');
                        localeSelector.setLocale(locale);
                        updateURL();
                    }
                }

                if(namespaceSelector.isReady() && localeSelector.isReady()) {
                    self.search();
                }
            });
        },

        render: function () {
            $("#search").append(this.searchInput.render().el);
            $("#namespaceSelector").append(this.namespaceSelector.render().el);
            $("#localeSelector").append(this.localeSelector.render().el);
            $("#table").append(this.table.render().el);
            $("#onlyEmptyToogle").append(this.onlyEmptyToggle.render().el);
            return this;
        },

        search: function() {
            var self = this;

            this.table.collection.fetch({
                data: {
                    namespace: self.namespaceSelector.getNamespace(),
                    locale: self.localeSelector.getLocale(),
                    search: self.searchInput.getQuery(),
                    onlyEmpty: self.onlyEmptyToggle.getToggle(),
                    emulateMissingTranslations: true
                },
                success: function () {
                    self.table.render();
                }
            });
        }
    });
});
