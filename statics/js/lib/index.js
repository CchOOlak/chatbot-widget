
/* module for importing other js files */
function include(file) {
    const script = document.createElement('script');
    script.src = file;
    script.type = 'text/javascript';
    script.defer = true;

    document.getElementsByTagName('head').item(0).appendChild(script);
}

include('./statics/js/lib/jquery.min.js');
include('./statics/js/lib/materialize.min.js');
include('./statics/js/lib/chart.min.js');
include('./statics/js/lib/uuid.min.js');
