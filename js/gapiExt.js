/**
 * Google API integration plugin.
 *
 * Ussage example:
 * <code>
 *  var plugin = $.fn.gapiExt();
 *
 *  plugin.gApiInit(true, function(authResult){
 *   plugin.printAbout();
 * }, {
 *  clientId: formClientId,
 *  scopes: formScopes
 * });
 * </code>
 * @author adiaz@emergya.com
 */
(function ( $ ) {

    /**
     * Constructor for this plugin
     **/
    $.fn.gapiExt = function( options ) {

        // Extend our default options with those provided.
        // Note that the first argument to extend is an empty
        // object – this is to keep from overriding our "defaults" object.
        opts = $.extend( {}, $.fn.gapiExt.defaults, options );

        // plugin options
        var plugin = $.extend( {}, opts);

        // plugin public functions
        plugin.gApiInit = $.fn.gapiExt.gApiInit;
        plugin.initServices = $.fn.gapiExt.initServices;
        plugin.printAbout = $.fn.gapiExt.printAbout;
        plugin.executeTest = $.fn.gapiExt.executeTest;
        plugin.getGapi = $.fn.gapiExt.getGapi;
        plugin.configBuilder = $.fn.gapiExt.configBuilder;
        plugin.executeTestBasedOnForm = $.fn.gapiExt.executeTestBasedOnForm;
        plugin.log = $.fn.gapiExt.log;

        // default properties
        plugin.scopes = [];

        // debug mode
        plugin.debugMode = false;

        // initilize
        plugin.configBuilder(options.formKey);

        // return the plugin instance
        return plugin;
    };


    /**
     * Default configuration for Google API Ext plugin
     **/
    $.fn.gapiExt.defaults = {
        // default log level
        log_level: 'DISABLED',
        // default gdrive configuration
        gDriveConfig: {
            // see https://developers.google.com/api-client-library/javascript/reference/referencedocs#gapiauthauthorize
            //client_id string  The application's client ID. Visit the Google API Console to get an OAuth 2.0 client ID.
            clientId: '849240717582-6hfo6rp231fgfh0dqok4au8fvou4108c.apps.googleusercontent.com',
            // scope    string | array  The auth scope or scopes to authorize as a space-delimited string or array (deprecated). Auth scopes for individual APIs can be found in their documentation.
            scopes: 'https://www.googleapis.com/auth/drive',
            // immediate    boolean If true, then login uses "immediate mode", which means that the token is refreshed behind the scenes, and no UI is shown to the user.
            immediate: false,
            // response_type    string  The OAuth 2.0 response type property. Default: token
            response_type: 'token'
        }
    };

    /**
     * Initializes Google API and tests for user sign-in, calling a fallback afterwards
     * @param init (true = immediate authorize. Also sets apiKey)
     * @param processResponseFunction (callback function)
     * @param config (optional config parameter. If not found, uses settings from Drupal.settings)
     * @returns {*}
     */
    $.fn.gapiExt.gApiInit = function (init, processResponseFunction, config){
        // this instance
        var me = this;

        // Default settings
        var gDriveConfig = $.extend( {}, me.gDriveConfig, config );
        var returnValue;

        // authorization callback
        var callback = function(oAut2Token){
            // TODO: check oAut2Token status
            me.initServices(function(){
                if(processResponseFunction && typeof(processResponseFunction) == 'function'){
                    processResponseFunction(oAut2Token);
                }
            });
        }

        // save scopes
        this.scopes = gDriveConfig.scopes.split(',');

        // return the authorization
        returnValue = this.getGapi().auth.authorize({
            client_id: gDriveConfig.clientId,
            scope:     gDriveConfig.scopes,
            immediate: gDriveConfig.immediate ? gDriveConfig.immediate : false,
            response_type: gDriveConfig.response_type ? gDriveConfig.response_type : 'token',
            redirect_uri: gDriveConfig.redirect_uri ? gDriveConfig.redirect_uri : 'postmessage'
        }, callback);

        return returnValue;
    }

    /**
     * Initialize all services to be called on JS
     * @param callback
     */
    $.fn.gapiExt.initServices = function (callback){
        // TODO: make it configurable
        // load drive service
        this.getGapi().client.load('drive', 'v2', function(){
            if(callback && typeof(callback) == 'function'){
                callback();
            }
        });
    }

    /**
     * Print information about the current user along with the Drive API
     * settings.
     * @see https://developers.google.com/drive/v2/reference/about/get
     */
    $.fn.gapiExt.printAbout = function (callback){
        var request = this.getGapi().client.drive.about.get();
        request.execute(function(resp) {
            if(callback && typeof(callback) == 'function'){
                callback(resp);
            }else{
                var msg = '';
                msg += 'Current user name: ' + resp.name + '\n';
                msg += 'Root folder ID: ' + resp.rootFolderId + '\n';
                msg += 'Total quota (bytes): ' + resp.quotaBytesTotal + '\n';
                msg += 'Used quota (bytes): ' + resp.quotaBytesUsed + '\n';
                console.log(msg);
            }
        });
    };

    $.fn.gapiExt.getGapi = function(){
        // TODO: use debug mode
        if(this.debugMode){
            return gapi_debug;
        }else{
            return gapi;
        }
    };

    $.fn.gapiExt.configBuilder = function (key){
        var log_id_to_append = false;
        var log_level = 'TRACE';
        if(key != 'undefined'){

            // initialize gapi log
            log_id_to_append = key + '_result_id';
            log_level = $(key + '_log_level').val();

            // drive config
            var gDriveConfig = {
                'clientId': $(key + '_client_id').val(),
                'scopes': $(key + '_scopes').val(),
                'immediate': $(key + '_immediate').val(),
                'redirect_uri': $(key + '_redirect_uri').val() ? $(key + '_redirect_uri').val() : 'postmessage',
                'response_type': $(key + '_response_type').val() ? $(key + '_response_type').val() : 'token'
            }
            // overwrite default configuration
            this.gDriveConfig = $.extend( {}, this.gDriveConfig, gDriveConfig );
        }


        // initialize gapi log
        // log appender for gapi log
        this.log_id_to_append = log_id_to_append;
        // log appender for gapi log
        this.log_level = log_level;

        return this.gDriveConfig;
    }

    /**
     * Perform a simple test for a given configuration
     * @param configuration Google Drive configuration
     * @param logContainer
     */
    $.fn.gapiExt.executeTest = function (configuration, logContainer){
        var plugin = this;
        plugin.gApiInit(true, function(authResult){
            // TODO: use logContainer to save result
            var logContainerEl = false;
            if(logContainer){
                logContainerEl = $(logContainer);
            }
            var currentMessage = logContainerEl.html();
            currentMessage += '\n\nAuthorization Result:\n' + JSON.stringify(authResult);
            if(logContainerEl){
                logContainerEl.html(currentMessage);
            }else{
                console.log(currentMessage);
            }
            var printAboutCallback = function(response){
                if(logContainerEl){
                    currentMessage += '\n\n\n' + 'About Result: \n' + JSON.stringify(response);
                    logContainerEl.html(currentMessage);
                }else{
                    console.log(response);
                }
            };
            plugin.printAbout(printAboutCallback);
        }, configuration);
    }

    /**
     * Perform a test for a given configuration
     */
    $.fn.gapiExt.executeTestBasedOnForm = function (){
        var plugin = this;

        // TODO: check this log Container
        logContainer = plugin.formKey + '_result_id';

        plugin.gApiInit(plugin.gDriveConfig.immediate, function(authResult){
            var logContainerEl = false;
            if(logContainer){
                logContainerEl = $(logContainer);
            }
            if(authResult && !authResult.error){
                plugin.log('\n[AUTHORIZATION SUCCESSFUL]\n', 'INFO');
            }else{
                plugin.log('\n[AUTHORIZATION FAIL]\n', 'ERROR');
            }
            plugin.log('\n\nAuthorization Result:\n' + JSON.stringify(authResult), 'DEBUG');
            var printAboutCallback = function(response){
                if(response && response.name){
                    plugin.log('\n[ABOUT SUCCESSFUL] User: ' + response.name + '\n', 'INFO');
                }else{
                    plugin.log('\n[ABOUT FAILED]\n', 'ERROR');
                }
                plugin.log('\n\n\n' + 'About Result: \n' + JSON.stringify(response), 'DEBUG');
            };
            plugin.printAbout(printAboutCallback);
        }, plugin.gDriveConfig);
    }

    /**
     * Logger for gapi operations
     * @param message
     * @param level
     */
    $.fn.gapiExt.log = function(message, level) {
        var appliedLevel = 'TRACE';
        if(level && level != 'undefined'){
            appliedLevel = level;
        }
        // only show message for enabled level
        var showLog = false;
        switch(this.log_level){
            case ('TRACE'):{
                showLog = true;
            }
            case ('DEBUG'):{
                if(level == 'DEBUG'){
                    showLog = true;
                }
            }
            case ('INFO'):{
                if(level == 'INFO'){
                    showLog = true;
                }
            }
            case ('WARNING'):{
                if(level == 'WARNING'){
                    showLog = true;
                }
            }
            case ('ERROR'):{
                if(level == 'ERROR'){
                    showLog = true;
                }
                break;
            }
            default:{
                showLog = false;
            }
        }
        if(showLog){
            if (this.log_id_to_append) {
                logContainerEl = $(this.log_id_to_append);
                var currentMessage = logContainerEl.html();
                currentMessage += message;
                logContainerEl.html(currentMessage);
            } else {
                if (console && console.log) {
                    console.log(message);
                }
            }
        }
    }

}( jQuery ));