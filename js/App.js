$(function () {
    var BodyView = Backbone.View.extend({
        el: '#content',

        initialize: function () {
            $.get("/i18nAdmin/strings/start", function (res) {
                console.log(res);
            });

            this.render();
        },

        render: function() {
            $(this.el).html();
            return this;
        }
    });

    new BodyView();
});