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
            var searchParameterHandler = this.hashParameterHandler.addParameterHandler('q', {
                get: function() {
                    return self.searchInput.getQuery();
                },
                set: function(str) {
                    self.searchInput.setQuery(str);
                }
            });
            searchParameterHandler.updateParameter();
            this.listenTo(this.searchInput, "query:changed", _.debounce(function () {
                searchParameterHandler.updateHash();
                self.search();
            }, 100));


            // Create only empty menu item
            this.hideTranslatedToggle = new ToggleMenuItem({
                text: 'Hide Translated'
            });
            var hideTranslatedParameterHandler = this.hashParameterHandler.addParameterHandler('hideTranslated', {
                get: function() {
                    return self.hideTranslatedToggle.getToggle();
                },
                set: function(str) {
                    self.hideTranslatedToggle.setToggle(str == 'true');
                }
            });
            hideTranslatedParameterHandler.updateParameter();
            this.listenTo(this.hideTranslatedToggle, "toggle:changed", function(enabled) {
                hideTranslatedParameterHandler.updateHash();
                if(enabled) {
                    self.table.hideTranslated();
                } else {
                    self.table.showTranslated();
                }
            });

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
            var namespaceParameterHandler = this.hashParameterHandler.addParameterHandler('namespace', {
                get: function() {
                    return self.namespaceSelector.getSelectedValue();
                },
                set: function(str) {
                    self.namespaceSelector.selectValue(str);
                }
            });
            this.listenTo(this.namespaceSelector, "selection:changed", function () {
                namespaceParameterHandler.updateHash();
                self.search();
            });
            this.namespaceSelector.collection.fetch({
                success: function() {
                    namespaceParameterHandler.updateParameter();
                    self.search();
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
            var localeParameterHandler = this.hashParameterHandler.addParameterHandler('locale', {
                get: function() {
                    return self.localeSelector.getSelectedValue();
                },
                set: function(str) {
                    self.localeSelector.selectValue(str);
                }
            });
            this.listenTo(this.localeSelector, 'selection:changed', function(locale) {
                localeParameterHandler.updateHash();
                self.table.setLocale(locale);
            });
            this.localeSelector.collection.fetch({
                success: function() {
                    localeParameterHandler.updateParameter('de');
                    localeParameterHandler.updateHash();
                    self.table.setLocale(self.localeSelector.getSelectedValue());
                }
            });
        },

        render: function () {
            $("#search").append(this.searchInput.render().el);
            $("#table").append(this.table.render().el);

            $(".navbar .nav .dropdown-toggle").dropdown();
            var $dropdownMenu = $("#translation-filter-menu>.dropdown-menu");
            $dropdownMenu.append(this.hideTranslatedToggle.render().el);
            $dropdownMenu.append(this.localeSelector.render().el);
            $dropdownMenu.append(this.namespaceSelector.render().el);
            return this;
        },

        search: function() {
            var self = this;

            this.table.collection.fetch({
                data: {
                    namespace: self.namespaceSelector.getSelectedValue(),
                    q: self.searchInput.getQuery(),
                    onlyEmpty: self.hideTranslatedToggle.getToggle(),
                    emulateMissingTranslations: true
                },
                success: function () {
                    self.table.render();
                }
            });
        }
    });
});
