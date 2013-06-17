define(['underscore', 'backbone', './TranslationSearchView', './TranslationTableView', './NamespaceCollection',
    './LocaleCollection', './controls/ToggleMenuItem', './controls/RadioSubMenu', './util/HashParameterHandler',
    'bootstrap-dropdown'],
    function(_, Backbone, TranslationSearchView, TranslationTableView, NamespaceCollection,
             LocaleCollection, ToggleMenuItem, RadioSubMenu, HashParameterHandler) {
    'use strict';

    return Backbone.View.extend({
        initialize: function () {
            var self = this;

            this.table = new TranslationTableView();
            this.hashParameterHandler = new HashParameterHandler();

            // Create search item
            this.searchInput = new TranslationSearchView();
            this.listenTo(this.searchInput, "query:changed", _.debounce(function () {
                self.search();
            }, 100));
            this.hashParameterHandler.addParameterHandler('q', {
                get: function() {
                    return self.searchInput.getQuery();
                },
                set: function(str) {
                    self.searchInput.setQuery(str);
                }
            })();

            // Create only empty menu item
            this.onlyEmptyToggle = new ToggleMenuItem({
                text: 'Only Empty'
            });
            this.listenTo(this.onlyEmptyToggle, "toggle:changed", function() {
                self.search();
            });
            this.hashParameterHandler.addParameterHandler('onlyEmpty', {
                get: function() {
                    return self.onlyEmptyToggle.getToggle();
                },
                set: function(str) {
                    self.onlyEmptyToggle.setToggle(str == 'true');
                }
            })();

            // Create namespace sub-menu
            this.namespaceSelector = new RadioSubMenu({
                collection: new NamespaceCollection(null, {
                    comparator: function (model) {
                        return model.get("name").toLowerCase();
                    }
                }),
                label: 'Namespaces',
                icon: 'icon-folder-open',
                allowNone: true,
                fields: {
                    label: 'name',
                    value: 'name'
                }
            });
            var updateNamespace = this.hashParameterHandler.addParameterHandler('namespace', {
                get: function() {
                    return self.namespaceSelector.getSelectedValue();
                },
                set: function(str) {
                    self.namespaceSelector.selectValue(str);
                }
            });
            this.listenTo(this.namespaceSelector, "selection:changed", function () {
                self.search();
            });
            this.namespaceSelector.collection.fetch({
                success: function(namespaces) {
                    updateNamespace();
                    if(namespaces.size() > 0 && self.localeSelector.collection.size() > 0) {
                        self.search();
                    }
                }
            });

            // Create locale sub-menu
            this.localeSelector = new RadioSubMenu({
                collection: new LocaleCollection(null, {
                    comparator: function (model) {
                        return model.get("name").toLowerCase();
                    }
                }),
                label: 'Locale',
                icon: 'icon-globe',
                fields: {
                    value: 'code',
                    label: 'name'
                }
            });
            var updateLocale = this.hashParameterHandler.addParameterHandler('locale', {
                get: function() {
                    return self.localeSelector.getSelectedValue();
                },
                set: function(str) {
                    self.localeSelector.selectValue(str);
                }
            });
            this.listenTo(this.localeSelector, 'selection:changed', function() {
                self.search();
            });
            this.localeSelector.collection.fetch({
                success: function(locales) {
                    updateLocale('de');
                    if(self.namespaceSelector.collection.size() > 0 && locales.size() > 0) {
                        self.search();
                    }
                }
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

            this.hashParameterHandler.updateHash();
            this.table.collection.fetch({
                data: {
                    namespace: self.namespaceSelector.getSelectedValue(),
                    search: self.searchInput.getQuery(),
                    locale: self.localeSelector.getSelectedValue(),
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
