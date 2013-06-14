define(['underscore', 'backbone', './TranslationSearchView', './TranslationTableView', './NamespaceCollection',
    './LocaleCollection', './controls/ToggleMenuItem', './controls/RadioSubMenu', 'bootstrap-dropdown', 'purl'],
    function(_, Backbone, TranslationSearchView, TranslationTableView, NamespaceCollection,
             LocaleCollection, ToggleMenuItem, RadioSubMenu) {
    'use strict';

    return Backbone.View.extend({
        initialize: function () {
            var self = this,
                searchInput = this.searchInput = new TranslationSearchView(),
                table = this.table = new TranslationTableView(),
                onlyEmptyToggle = this.onlyEmptyToggle = new ToggleMenuItem({
                    text: 'Only Empty'
                }),
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
            }, 100));

            this.listenTo(onlyEmptyToggle, "toggle:changed", function() {
                self.search();
            });



            var namespaceSelector = this.namespaceSelector = new RadioSubMenu({
                    collection: new NamespaceCollection(null, {
                        comparator: function (model) {
                            return model.get("value").toLowerCase();
                        }
                    }),
                    label: 'Namespaces',
                    icon: 'icon-folder-open',
                    allowNone: true
                });

            namespaceSelector.collection.fetch({
                success: function(namespaces) {
                    var param = $.url().fparam('namespace');

                    if(param) {
                        param = decodeURIComponent(param);
                        namespaceSelector.selectItem(namespaces.findWhere({value: param}));
                    }

                    if(namespaces.size() > 0 && localeSelector.collection.size() > 0) {
                        self.search();
                    }
                }
            });
            this.listenTo(namespaceSelector, "selection:changed", function () {
                self.search();
            });



            var localeSelector = this.localeSelector = new RadioSubMenu({
                    collection: new LocaleCollection(null, {
                        comparator: function (model) {
                            return model.get("label").toLowerCase();
                        }
                    }),
                    label: 'Locale',
                    icon: 'icon-globe'
                });

            localeSelector.collection.fetch({
                success: function(locales) {
                    var param = $.url().fparam('locale');

                    if(param) {
                        param = decodeURIComponent(param);
                    } else {
                        param = 'de';
                    }

                    localeSelector.selectItem(locales.findWhere({value: param}));

                    if(namespaceSelector.collection.size() > 0 && locales.size() > 0) {
                        self.search();
                    }
                }
            });
            this.listenTo(localeSelector, 'selection:changed', function() {
                self.search();
            });
        },

        render: function () {
            $("#search").append(this.searchInput.render().el);
            $("#table").append(this.table.render().el);

            $(".navbar .nav .dropdown-toggle").dropdown();
            var $dropdownMenu = $("#translation-filter-menu>.dropdown-menu");
            $dropdownMenu.append(this.onlyEmptyToggle.render().el);
            $dropdownMenu.append(this.localeSelector.render().el);
            $dropdownMenu.append(this.namespaceSelector.render().el);
            return this;
        },

        search: function() {
            var self = this;

            this._updateHash();
            this.table.collection.fetch({
                data: {
                    namespace: self.namespaceSelector.getSelectedItem().get("value"),
                    search: self.searchInput.getQuery(),
                    locale: self.localeSelector.getSelectedItem().get("value"),
                    onlyEmpty: self.onlyEmptyToggle.getToggle(),
                    emulateMissingTranslations: true
                },
                success: function () {
                    self.table.render();
                }
            });
        },

        _updateHash: function() {
            var hash = "",
                addParam = function(hash, name, value) {
                    if(hash.length > 0) {
                        hash += '&';
                    }
                    return hash + name + "=" + encodeURIComponent(value);
                },
                query = this.searchInput.getQuery(),
                locale = this.localeSelector.getSelectedItem().get('value'),
                namespace = this.namespaceSelector.getSelectedItem().get('value'),
                onlyEmpty = this.onlyEmptyToggle.getToggle();

            if(query) {
                hash = addParam(hash, 'q', query);
            }
            if(locale) {
                hash = addParam(hash, 'locale', locale);
            }
            if(namespace) {
                hash = addParam(hash, 'namespace', namespace);
            }
            if(onlyEmpty) {
                hash = addParam(hash, 'onlyEmpty', onlyEmpty);
            }

            window.location.hash = hash;
        }
    });
});
