/**
 * @NApiVersion 2.1
 * This file includes shared caching functions
 */
define(["require", "exports", "N/cache", "N/runtime"], function (require, exports, cache, runtime) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dsCache = function (userId) {
        return cache.getCache({
            name: "docusign_cache_" + userId,
            scope: cache.Scope.PROTECTED,
        });
    };
    /* This method will clear the all the cached objects
     * in this bundles cache. For this to work, all cache
     * keys declared must be listed here.
     */
    exports.clearAll = function () {
        var cachedString = exports.dsCache(runtime.getCurrentUser().id).get({
            key: "cached_keys",
        });
        if (cachedString === null)
            return;
        var cachedKeys = cachedString.split("|");
        var toKeep = [];
        // we need to loop through all the cached keys listed here
        // and clear the cache for each of them.
        cachedKeys.forEach(function (key, index, array) {
            var value = exports.dsCache(runtime.getCurrentUser().id).get({
                key: key,
            });
            // log.debug('removing from cache', key);
            exports.dsCache(runtime.getCurrentUser().id).remove({ key: key });
            var shouldBeGone = exports.dsCache(runtime.getCurrentUser().id).get({
                key: key,
            });
            if (shouldBeGone !== null) {
                toKeep.push(key);
            }
        });
        cachedString = "";
        toKeep.forEach(function (key, index, array) {
            if (key !== "")
                cachedString += key;
            if (index < array.length - 1)
                cachedString += "|";
        });
        if (cachedString.length === 0) {
            exports.dsCache(runtime.getCurrentUser().id).remove({ key: "cached_keys" });
        }
        else {
            exports.dsCache(runtime.getCurrentUser().id).put({
                key: "cached_keys",
                value: cachedString,
            });
        }
        cachedString = exports.dsCache(runtime.getCurrentUser().id).get({
            key: "cached_keys",
        });
    };
    /* This function takes a json object and returns a string but
     * it also registers the string in an array of cached objects
     * so that we can clear all these objects at once with clearAll()
     */
    exports.createKey = function (key) {
        var returnString = JSON.stringify(key);
        var cachedString = exports.dsCache(runtime.getCurrentUser().id).get({
            key: "cached_keys",
        });
        var keysArray = [];
        if (cachedString === null) {
            // this is the first time use
            keysArray.push(returnString);
        }
        else {
            keysArray = cachedString.split("|");
            if (keysArray.indexOf(returnString) === -1) {
                keysArray.push(returnString);
            }
        }
        cachedString = "";
        keysArray.forEach(function (key, index, array) {
            if (key !== "")
                cachedString += key;
            if (index < array.length - 1)
                cachedString += "|";
        });
        exports.dsCache(runtime.getCurrentUser().id).put({
            key: "cached_keys",
            value: cachedString,
        });
        return returnString;
    };
});
