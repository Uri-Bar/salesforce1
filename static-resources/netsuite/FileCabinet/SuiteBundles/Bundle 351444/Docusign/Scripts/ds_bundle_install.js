/**
 * @NApiVersion 2.1
 * @NScriptType BundleInstallationScript
 */
define(["require", "exports", "N/log", "N/file", "N/search"], function (require, exports, log, file, search) {
    Object.defineProperty(exports, "__esModule", { value: true });
    ("use strict");
    var fileInSameFolder = "ds_config_sl.js";
    var tempFileName = "temp_ds_keys.js";
    var keyFileName = "ds_keys.js";
    /**
     * @description executes before the bundle install takes place
     * @param context
     */
    exports.beforeUpdate = function (context) {
        log.debug("beforeUpdate begin", "next step: find " + keyFileName);
        /**
         * Task: Get existing ds_keys.js file and save it so user
         * doesn't have to re-enter their password after update.
         * 1. find existing ds_key.js file
         * 2. create identical temp file, save in same folder
         * 3. end of beforeUpdate
         * 4. after update: find temporary based on name
         * 5. overwrite ds_keys.js with temp file
         * 6. Delete temporary file
         */
        var keyFileId = findFile(keyFileName);
        if (!keyFileId)
            return;
        var keyFile = getFile(keyFileId);
        if (!keyFile)
            return;
        var folderId = getFolderIdForFile(fileInSameFolder);
        if (!folderId)
            return;
        createFile(folderId, keyFile.getContents(), tempFileName);
    };
    /**
     * @description executes after the bundle install takes place
     * @param context
     */
    exports.afterUpdate = function (context) {
        log.debug("afterUpdate begin", "next step: find " + tempFileName);
        var tempFileId = findFile(tempFileName);
        if (!tempFileId)
            return;
        var tempFile = getFile(tempFileId);
        if (!tempFile)
            return;
        var folderId = getFolderIdForFile(fileInSameFolder);
        if (!folderId)
            return;
        createFile(folderId, tempFile.getContents(), keyFileName);
        file.delete({ id: tempFileId });
    };
    /**
     * @description attempts to load a file, logs an error if fails
     * @param fileId internalid of the file we're loading
     */
    var getFile = function (fileId) {
        var keyFile = file.load({ id: fileId });
        if (!keyFile) {
            log.error("Unable to load fileId: " + fileId, "Couldn't load existing file by id.");
            return;
        }
        log.audit("file loaded: " + fileId, "file load successful");
        return keyFile;
    };
    /**
     * @description Feed in a filename and get the id of it's parent folder back
     * @param filename the name of the file which resides in the
     * the folder whose id will be returned
     */
    var getFolderIdForFile = function (filename) {
        var folderId = null;
        var fileSearchObj = search.create({
            type: "file",
            filters: [["name", "is", filename]],
            columns: ["folder"],
        });
        fileSearchObj.run().each(function (result) {
            folderId = Number(result.getValue({ name: "folder" }).toString());
            log.debug("found folder for file: " + filename, folderId);
            return false;
        });
        if (!folderId) {
            log.audit("Folder not found: " + folderId, "Couldn't find folder for " + fileInSameFolder + ".");
            return;
        }
        return folderId;
    };
    /**
     * @description saves a file to the file cabinet
     * @param folderId the internalid of the folder to put this file in
     * @param contents the string contents of the file
     * @param fileName the name you want the file to have
     */
    var createFile = function (folderId, contents, fileName) {
        var fileId = null;
        try {
            var keyFile = file.create({
                fileType: file.Type.JAVASCRIPT,
                name: fileName,
                contents: contents,
                folder: folderId,
            });
            log.debug("attempting to create new file", JSON.stringify(keyFile));
            fileId = keyFile.save();
        }
        catch (error) {
            log.error("error creating file", error.stack);
        }
        return fileId;
    };
    /**
     * @description finds a file in the file cabinet and returns it's internalid
     * @param fileName the name of the file to look for
     */
    var findFile = function (fileName) {
        var fileId = null;
        var keySearch = search.create({
            type: "file",
            filters: [["name", "is", fileName]],
            columns: ["name"],
        });
        keySearch.run().each(function (result) {
            log.debug("found file " + fileName, "fileId: " + result.id);
            fileId = result.id;
            return false;
        });
        if (!fileId) {
            log.audit("File not found: " + keyFileName, "Couldn't find existing key file.");
            return null;
        }
        return fileId;
    };
});
