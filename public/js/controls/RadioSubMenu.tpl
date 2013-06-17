<a style="cursor: default">
    <i class="icon <%= icon %>"></i><%= label %>
</a>
<% if(items.length > 0) { %>
    <ul class="dropdown-menu">
        <% _.each(items, function(item) { %>
            <li data-value="<%= item.value %>">
                <a href="#">
                    <i class="icon <% if(selectedValue && selectedValue === item.value) { %>icon-check<% } else { %>icon-check-empty<% } %>"></i><%= item.label %></a>
            </li>
        <% }); %>
    </ul>
<% } %>
