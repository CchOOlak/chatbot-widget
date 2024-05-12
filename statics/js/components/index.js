function include(file) {
    const script = document.createElement('script');
    script.src = file;
    script.type = 'text/javascript';
    script.defer = true;

    document.getElementsByTagName('head').item(0).appendChild(script);
}

/* include all the components js file */

include('./statics/js/components/chat.js');
include('./statics/js/constants.js');
include('./statics/js/components/cardsCarousel.js');
include('./statics/js/components/botTyping.js');
include('./statics/js/components/charts.js');
include('./statics/js/components/collapsible.js');
include('./statics/js/components/dropDown.js');
include('./statics/js/components/location.js');
include('./statics/js/components/pdfAttachment.js');
include('./statics/js/components/quickReplies.js');
include('./statics/js/components/suggestionButtons.js');
