$(function() {
    var $content = $("#content"),
        $sidebar = $("aside"),
        $body    = $("body"),
        $html    = $("html"),
        $window  = $(window),
        $header  = $("header");

    //Build the Sidebar
    var html = "<ul>",
        tags = ['H2', 'H3', 'H4', 'H5', 'H6'],
        $headings = $content.find(tags.join(', '));

    for(var i=0; i<$headings.length; i++) {
        var $this = $($headings[i]),
            $a    = $this.find('a'),
            tag   = $this.prop("tagName");

        if($a.length !== 0) {
            var dataMenu = $a.attr('data-menu'),
                content = dataMenu ? "<code>" + dataMenu + "</code>" : $a.html();

            html += "<li class='li-" + tag + "'><a href='#" + $a.attr('name') + "'>" + content + "</a></li>";
        }
        else {
            //Remove the element from the list (for the scroll highlighting)
            $headings.splice(i, 1);
            i--;
        }
    }
    html += "</ul>";

    $sidebar.html(html);

    //Size the Sidebar
    var headerHeight,
        activeLimit,
        windowH;

    var resizer = function() {
        windowH = $window.height();
        $sidebar.height(windowH);

        headerHeight = $header.outerHeight();
        activeLimit = windowH/4;
    };

    $window.resize(resizer);
    resizer();

    //Make the sidebar sticky & add position indicator
    var $indicator = $("<div class='indicator'>").appendTo($sidebar);

    $(window, document).scroll(function(e) {
        var top  = $html[0].scrollTop || $body[0].scrollTop;
        $sidebar[top > headerHeight ? 'addClass' : 'removeClass']('fixed');

        //Get the active heading
        var active;
        for(var i=0; i<$headings.length; i++) {
            var heading = $headings[i];
                topOffset = heading.getBoundingClientRect().top;

            if(topOffset < activeLimit) {
                active = heading;
            }
            else {
                break;
            }
        }

        //Apply active class heading to sidebar
        $sidebar.find('.active').removeClass('active');

        if(active) {
            var $a = $(active).find('a');

            if($a) {
                var pos = $sidebar.find("a[href='#"+$a.attr('name')+"']").position();

                if(pos) {
                    $indicator.css('top', pos.top);

                    //Only do it if the mouse isn't in the sidebar (mac twofinger scrolling weird bug)
                    if(!mouseInSidebar) {
                        //Make Sure Sidebar scrolls
                        var scrollTop = $sidebar.scrollTop(),
                            scrollBottom = scrollTop + windowH;

                        if(pos.top < scrollTop) {
                            $sidebar.scrollTop(pos.top - windowH/3);
                        }
                        else if(pos.top > scrollBottom) {
                            $sidebar.scrollTop(pos.top - 2*windowH/3);
                        }
                    }
                }
            }
        }
    });

    var mouseInSidebar;
    $sidebar
        .mouseenter(function() {
            mouseInSidebar = true;
        })
        .mouseleave(function() {
            mouseInSidebar = false;
        });
});
