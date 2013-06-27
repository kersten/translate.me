define(['underscore', 'backbone', 'tpl!./TranslationRowView.tpl', 'jquery.color'], function(_, Backbone, template) {
    'use strict';

    return Backbone.View.extend({
        tagName: "tr",
        template: template,

        events: {
            "change textarea": "update"
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
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
});
